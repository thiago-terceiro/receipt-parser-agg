import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

import { checkReceiptExtractionRateLimit } from "@/lib/extract-rate-limit";
import { getActiveTraceContext, withSpan } from "@/lib/observability";
import {
  observabilityAttributes,
  observabilityEvents,
  observabilityFields,
} from "@/lib/observability-schema";
import { getSessionIdentity } from "@/lib/session";

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
  type ParsedReceiptExtraction,
} from "../../../lib/receipt";
import {
  isPdfReceiptUpload,
  isSupportedReceiptUpload,
  mergeReceiptExtractions,
} from "../../../lib/receipt-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

const hfToken = process.env.HF_TOKEN;
const inferenceClient = hfToken ? new InferenceClient(hfToken) : null;
const defaultPdfPageLimit = 5;
const defaultPdfRenderScale = 3;

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

type UploadedReceiptData = {
  fileName: string | null;
  imageUrls: string[];
  sourceType: "image" | "pdf";
};

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
  sourceLabel: string;
  rawResponse: string | null;
}) => {
  const traceContext = getActiveTraceContext();

  console.info("Receipt extraction diagnostics", {
    [observabilityFields.event]: observabilityEvents.receiptExtractionCompleted,
    model: details.model,
    provider: details.provider,
    sourceLabel: details.sourceLabel,
    finishReason: details.finishReason ?? null,
    maxOutputTokens: details.maxOutputTokens,
    rawResponseLength: details.rawResponse?.length ?? 0,
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
  });
};

const buildReceiptSourceLabel = (
  sourceType: "image" | "pdf",
  pageNumber: number,
  pageCount: number,
): string => {
  if (sourceType !== "pdf" || pageCount <= 1) {
    return "receipt image";
  }

  return `PDF page ${pageNumber} of ${pageCount}`;
};

const renderPdfToImageDataUrls = async (
  bytes: ArrayBuffer,
): Promise<string[]> => {
  const { pdf } = await import("pdf-to-img");

  const document = await pdf(Buffer.from(bytes), {
    scale: defaultPdfRenderScale,
  });

  try {
    if (document.length > defaultPdfPageLimit) {
      throw new RequestValidationError(
        `PDF receipts with more than ${defaultPdfPageLimit} pages are not supported yet.`,
        400,
      );
    }

    const imageUrls: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.length; pageNumber += 1) {
      const pageBuffer = await document.getPage(pageNumber);
      imageUrls.push(buildDataUrl(pageBuffer, "image/png"));
    }

    if (imageUrls.length === 0) {
      throw new RequestValidationError(
        "Uploaded PDF did not contain any pages.",
        400,
      );
    }

    return imageUrls;
  } finally {
    await document.destroy();
  }
};

const getUploadedReceiptData = async (
  formData: FormData,
): Promise<UploadedReceiptData> => {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new RequestValidationError(
      "Request must include a receipt file under the 'file' field.",
      400,
    );
  }

  if (!isSupportedReceiptUpload(file)) {
    throw new RequestValidationError(
      "Uploaded file must be an image or PDF.",
      400,
    );
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) {
    throw new RequestValidationError("Uploaded file is empty.", 400);
  }

  const fileName = file.name?.trim() || null;

  if (isPdfReceiptUpload(file)) {
    return {
      fileName,
      imageUrls: await renderPdfToImageDataUrls(bytes),
      sourceType: "pdf",
    };
  }

  return {
    fileName,
    imageUrls: [buildDataUrl(bytes, file.type || "image/jpeg")],
    sourceType: "image",
  };
};

const extractReceiptFromImageUrl = async (options: {
  fileName: string | null;
  imageUrl: string;
  model: string;
  pageCount: number;
  pageNumber: number;
  provider: string;
  sourceType: "image" | "pdf";
}): Promise<{
  parsedExtraction: ParsedReceiptExtraction;
  rawResponse: string;
}> => {
  const sourceLabel = buildReceiptSourceLabel(
    options.sourceType,
    options.pageNumber,
    options.pageCount,
  );

  const response = await withSpan(
    "receipt.extract.huggingface_chat_completion",
    async (span) => {
      span.setAttributes({
        [observabilityAttributes.receiptModel]: options.model,
        [observabilityAttributes.receiptProvider]: options.provider,
        [observabilityAttributes.receiptMaxOutputTokens]: defaultMaxOutputTokens,
        [observabilityAttributes.receiptSourceFilePresent]: Boolean(options.fileName),
      });

      return inferenceClient!.chatCompletion({
        provider: options.provider as never,
        model: options.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: options.imageUrl },
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
    model: options.model,
    provider: options.provider,
    finishReason,
    maxOutputTokens: defaultMaxOutputTokens,
    sourceLabel,
    rawResponse: typeof rawResponse === "string" ? rawResponse : null,
  });

  if (finishReason === "length") {
    throw new Error(
      `${sourceLabel} output hit the ${defaultMaxOutputTokens}-token limit. Increase HF_MAX_OUTPUT_TOKENS.`,
    );
  }

  if (typeof rawResponse !== "string" || !rawResponse.trim()) {
    throw new Error(`${sourceLabel} returned an empty response.`);
  }

  const parsedExtraction = await withSpan(
    "receipt.extract.parse_items",
    async (span) => {
      const parsed = parseReceiptExtraction(rawResponse);

      span.setAttributes({
        [observabilityAttributes.receiptItemCount]: parsed.items.length,
        [observabilityAttributes.receiptRawResponseLength]: rawResponse.length,
      });

      return parsed;
    },
    {
      [observabilityAttributes.receiptOperation]: "parse_items",
    },
  );

  return {
    parsedExtraction,
    rawResponse,
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

  const identity = await getSessionIdentity();
  const rateLimit = await checkReceiptExtractionRateLimit(request, identity);

  if (rateLimit && !rateLimit.success) {
    return NextResponse.json(
      {
        error:
          "Too many receipt extraction requests. Please wait a few minutes and try again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(rateLimit.reset, 1)),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.reset),
        },
      },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data request body." },
      { status: 400 },
    );
  }

  const model = resolveRequestedModelId({
    selectedModelId: formData.get("modelId"),
  });
  let fileName: string | null;
  let imageUrls: string[];
  let sourceType: "image" | "pdf";

  try {
    const upload = await getUploadedReceiptData(formData);
    fileName = upload.fileName;
    imageUrls = upload.imageUrls;
    sourceType = upload.sourceType;
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
    const pageExtractions: ParsedReceiptExtraction[] = [];
    const rawResponses: string[] = [];

    const extractionConcurrencyCap = 2;
    for (let i = 0; i < imageUrls.length; i += extractionConcurrencyCap) {
      const batch = imageUrls.slice(i, i + extractionConcurrencyCap);
      const batchPromises = batch.map((imageUrl, offset) => {
        const pageNumber = i + offset + 1;
        return extractReceiptFromImageUrl({
          fileName,
          imageUrl,
          model,
          pageCount: imageUrls.length,
          pageNumber,
          provider,
          sourceType,
        });
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const res of batchResults) {
        if (res.status === "rejected") {
          throw res.reason;
        }
        pageExtractions.push(res.value.parsedExtraction);
        rawResponses.push(res.value.rawResponse);
      }
    }

    const extractionResult = mergeReceiptExtractions(pageExtractions);
    const currencyCode = extractionResult.currencyCode;
    const items = extractionResult.items;
    const rawResponse =
      rawResponses.length === 1
        ? rawResponses[0]
        : rawResponses
          .map((pageRawResponse, index) => `Page ${index + 1}\n${pageRawResponse}`)
          .join("\n\n");

    const uniqueCurrencyCodes = new Set(
      pageExtractions.map((pageExtraction) => pageExtraction.currencyCode),
    );
    if (uniqueCurrencyCodes.size > 1) {
      console.warn("PDF extraction returned inconsistent currency codes.", {
        fileName,
        currencyCodes: Array.from(uniqueCurrencyCodes),
      });
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
