import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

import {
  getMonthKey,
  type ExtractedReceipt,
} from "@/lib/groceries";
import { persistExtractedReceipt } from "@/lib/groceries-server";
import { getActiveTraceContext, withSpan } from "@/lib/observability";
import {
  observabilityAttributes,
  observabilityEvents,
  observabilityFields,
} from "@/lib/observability-schema";
import { getSessionIdentity } from "@/lib/session";
import { hasSupabaseServerConfig } from "@/lib/supabase-server";

import {
  buildDataUrl,
  buildReceiptPrompt,
  defaultMaxOutputTokens,
  defaultModelId,
  defaultProvider,
  dropdownAvailableModels,
  getModelCapabilityHint,
  parseReceiptExtraction,
  receiptItemsJsonSchema,
  resolveRequestedModelId,
} from "../../../lib/receipt";

export const runtime = "nodejs";

const hfToken = process.env.HF_TOKEN;
const inferenceClient = hfToken ? new InferenceClient(hfToken) : null;

type ChatMessageContent =
  | string
  | Array<
    | {
      type: "text";
      text: string;
    }
    | {
      type: "image_url";
      image_url: {
        url: string;
      };
    }
  >;

class RequestValidationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RequestValidationError";
  }
}

const getConfiguredProvider = (): string => defaultProvider;

const buildExtractionError = (message: string, modelId: string): string => {
  const hint = getModelCapabilityHint(modelId);
  return hint ? `${message} ${hint}` : message;
};

const logExtractionDiagnostics = (details: {
  model: string;
  provider: string;
  finishReason: string | null | undefined;
  maxOutputTokens: number;
  rawResponse: string | null;
}) => {
  const traceContext = getActiveTraceContext();

  console.info("Receipt extraction diagnostics", {
    [observabilityFields.event]: observabilityEvents.receiptExtractionCompleted,
    model: details.model,
    provider: details.provider,
    finishReason: details.finishReason ?? null,
    maxOutputTokens: details.maxOutputTokens,
    rawResponseLength: details.rawResponse?.length ?? 0,
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
  });
};

const getUploadedImageDataUrl = async (
  formData: FormData,
): Promise<{ fileName: string | null; imageUrl: string }> => {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new RequestValidationError(
      "Request must include an image file under the 'file' field.",
      400,
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new RequestValidationError("Uploaded file must be an image.", 400);
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) {
    throw new RequestValidationError("Uploaded file is empty.", 400);
  }

  return {
    fileName: file.name?.trim() || null,
    imageUrl: buildDataUrl(bytes, file.type || "image/jpeg"),
  };
};

export const GET = async () => {
  return NextResponse.json({
    defaultModelId,
    availableModels: dropdownAvailableModels,
  });
};

export const POST = async (request: Request) => {
  if (!inferenceClient) {
    return NextResponse.json(
      { error: "HF_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const requestedBoardId = formData.get("boardId");
  const model = resolveRequestedModelId({
    selectedModelId: formData.get("modelId"),
  });
  let fileName: string | null;
  let imageUrl: string;

  try {
    const upload = await getUploadedImageDataUrl(formData);
    fileName = upload.fileName;
    imageUrl = upload.imageUrl;
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unexpected request parsing error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const provider = getConfiguredProvider() as never;
  const modelCapabilityHint = getModelCapabilityHint(model);

  if (modelCapabilityHint) {
    console.warn(modelCapabilityHint);
  }

  try {
    const response = await withSpan(
      "receipt.extract.huggingface_chat_completion",
      async (span) => {
        span.setAttributes({
          [observabilityAttributes.receiptModel]: model,
          [observabilityAttributes.receiptProvider]: provider,
          [observabilityAttributes.receiptMaxOutputTokens]: defaultMaxOutputTokens,
          [observabilityAttributes.receiptSourceFilePresent]: Boolean(fileName),
        });

        return inferenceClient.chatCompletion({
          provider,
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
                {
                  type: "text",
                  text: buildReceiptPrompt(),
                },
              ] satisfies ChatMessageContent,
            },
          ],
          response_format: {
            type: "json_object",
            json_schema: receiptItemsJsonSchema,
          },
          max_tokens: defaultMaxOutputTokens,
          temperature: 0,
        });
      },
      {
        [observabilityAttributes.receiptOperation]: "extract",
      },
    );

    const finishReason = response.choices?.[0]?.finish_reason;
    const rawResponse = response.choices?.[0]?.message?.content;

    logExtractionDiagnostics({
      model,
      provider,
      finishReason,
      maxOutputTokens: defaultMaxOutputTokens,
      rawResponse: typeof rawResponse === "string" ? rawResponse : null,
    });

    if (finishReason === "length") {
      return NextResponse.json(
        {
          error: buildExtractionError(
            `Model output hit the ${defaultMaxOutputTokens}-token limit. Increase HF_MAX_OUTPUT_TOKENS.`,
            model,
          ),
        },
        { status: 502 },
      );
    }

    console.log("Raw response from Hugging Face:", rawResponse);
    if (typeof rawResponse !== "string" || !rawResponse.trim()) {
      return NextResponse.json(
        {
          error: buildExtractionError(
            "Hugging Face returned an empty response.",
            model,
          ),
        },
        { status: 502 },
      );
    }
    const extractionResult = await withSpan(
      "receipt.extract.parse_items",
      async (span) => {
        const parsedExtraction = parseReceiptExtraction(rawResponse);

        span.setAttributes({
          [observabilityAttributes.receiptItemCount]: parsedExtraction.items.length,
          [observabilityAttributes.receiptRawResponseLength]: rawResponse.length,
        });

        return parsedExtraction;
      },
      {
        [observabilityAttributes.receiptOperation]: "parse_items",
      },
    );
    const { currencyCode, items } = extractionResult;

    const identity = await getSessionIdentity();
    if (hasSupabaseServerConfig && identity?.userId) {
      const extractedAt = new Date().toISOString();
      const month = getMonthKey(new Date(extractedAt));

      const extraction: ExtractedReceipt = {
        id: crypto.randomUUID(),
        month,
        currencyCode,
        sourceFileName: fileName,
        modelId: model,
        extractedAt,
        itemCount: items.length,
        total: Number(
          items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
        ),
        categories: Array.from(new Set(items.map((item) => item.category))),
        items,
      };

      try {
        await withSpan(
          "receipt.extract.persist_history",
          async (span) => {
            span.setAttributes({
              [observabilityAttributes.boardRequested]: Boolean(requestedBoardId),
              [observabilityAttributes.receiptItemCount]: extraction.itemCount,
              [observabilityAttributes.userIsAuthenticated]: true,
            });

            await persistExtractedReceipt(identity, requestedBoardId, extraction);
          },
        );
      } catch (error) {
        console.warn("Unable to persist extracted receipt history.", error);
      }
    }

    return NextResponse.json({
      backend: "vercel-hf-route",
      currencyCode,
      modelId: model,
      items,
      rawResponse,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extraction error.";
    return NextResponse.json(
      { error: buildExtractionError(message, model) },
      { status: 502 },
    );
  }
};
