import { GoogleGenAI } from "@google/genai";
import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

import { checkReceiptExtractionRateLimit } from "@/lib/extract-rate-limit";
import { getActiveTraceContext, withSpan } from "@/lib/observability";
import {
  observabilityAttributes,
  observabilityEvents,
  observabilityFields,
} from "@/lib/observability-schema";
import { createRateLimitHeaders } from "@/lib/rate-limit";
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

const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
};

const getInferenceClient = (): InferenceClient | null => {
  const token = process.env.HF_TOKEN;
  return token ? new InferenceClient(token) : null;
};

const isGeminiModel = (modelId: string): boolean =>
  modelId.startsWith("gemini") || modelId.includes("gemini");

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
  fileSizeBytes: number;
  imageUrls: string[];
  mimeType: string;
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
  const fileSizeBytes = bytes.byteLength;
  const mimeType = file.type || (isPdfReceiptUpload(file) ? "application/pdf" : "image/jpeg");

  if (isPdfReceiptUpload(file)) {
    return {
      fileName,
      fileSizeBytes,
      imageUrls: await renderPdfToImageDataUrls(bytes),
      mimeType,
      sourceType: "pdf",
    };
  }

  return {
    fileName,
    fileSizeBytes,
    imageUrls: [buildDataUrl(bytes, mimeType)],
    mimeType,
    sourceType: "image",
  };
};

const extractReceiptFromImageUrl = async (options: {
  fileName: string | null;
  fileSizeBytes?: number;
  imageUrl: string;
  mimeType?: string;
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

  const geminiClient = getGeminiClient();
  const inferenceClient = getInferenceClient();
  const useGemini = Boolean(
    geminiClient &&
      (options.provider === "gemini" ||
        isGeminiModel(options.model) ||
        !inferenceClient),
  );
  const effectiveProvider = useGemini ? "gemini" : options.provider;

  let finishReason: string | undefined;
  let rawResponse: string | undefined;

  if (useGemini && geminiClient) {
    const response = await withSpan(
      "receipt.extract.ai_inference",
      async (span) => {
        span.setAttributes({
          [observabilityAttributes.receiptModel]: options.model,
          [observabilityAttributes.receiptProvider]: "gemini",
          [observabilityAttributes.receiptMaxOutputTokens]: defaultMaxOutputTokens,
          [observabilityAttributes.receiptSourceFilePresent]: Boolean(options.fileName),
          [observabilityAttributes.genAiSystem]: "gemini",
          [observabilityAttributes.genAiRequestModel]: options.model,
          ...(options.fileSizeBytes ? { [observabilityAttributes.receiptFileSizeBytes]: options.fileSizeBytes } : {}),
          ...(options.mimeType ? { [observabilityAttributes.receiptMimeType]: options.mimeType } : {}),
        });

        const base64Data = options.imageUrl.replace(/^data:[^;]+;base64,/, "");
        const inlineMimeType = options.mimeType && options.mimeType.startsWith("image/") ? options.mimeType : "image/jpeg";

        const geminiResult = await geminiClient.models.generateContent({
          model: options.model,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: inlineMimeType,
              },
            },
            buildReceiptPrompt(),
          ],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: receiptItemsJsonSchema.schema,
            maxOutputTokens: defaultMaxOutputTokens,
            temperature: 0,
          },
        });

        if (geminiResult.modelVersion) {
          span.setAttribute(observabilityAttributes.genAiResponseModel, geminiResult.modelVersion);
        }

        const candidate = geminiResult.candidates?.[0];
        const candidateFinishReason = candidate?.finishReason;
        if (candidateFinishReason) {
          span.setAttribute(observabilityAttributes.genAiResponseFinishReasons, [candidateFinishReason]);
        }

        const usage = geminiResult.usageMetadata;
        if (usage) {
          if (typeof usage.promptTokenCount === "number") {
            span.setAttribute(observabilityAttributes.genAiUsageInputTokens, usage.promptTokenCount);
          }
          if (typeof usage.candidatesTokenCount === "number") {
            span.setAttribute(observabilityAttributes.genAiUsageOutputTokens, usage.candidatesTokenCount);
          }
          if (typeof usage.totalTokenCount === "number") {
            span.setAttribute(observabilityAttributes.genAiUsageTotalTokens, usage.totalTokenCount);
          }
        }

        return geminiResult;
      },
      {
        [observabilityAttributes.receiptOperation]: "extract",
      },
    );

    finishReason = response.candidates?.[0]?.finishReason;
    rawResponse = response.text ?? "";
  } else {
    if (!inferenceClient) {
      throw new Error("No AI provider is configured on the server.");
    }

    const response = await withSpan(
      "receipt.extract.ai_inference",
      async (span) => {
        span.setAttributes({
          [observabilityAttributes.receiptModel]: options.model,
          [observabilityAttributes.receiptProvider]: options.provider,
          [observabilityAttributes.receiptMaxOutputTokens]: defaultMaxOutputTokens,
          [observabilityAttributes.receiptSourceFilePresent]: Boolean(options.fileName),
          [observabilityAttributes.genAiSystem]: options.provider,
          [observabilityAttributes.genAiRequestModel]: options.model,
          ...(options.fileSizeBytes ? { [observabilityAttributes.receiptFileSizeBytes]: options.fileSizeBytes } : {}),
          ...(options.mimeType ? { [observabilityAttributes.receiptMimeType]: options.mimeType } : {}),
        });

        const completion = await inferenceClient.chatCompletion({
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

        const completionWithUsage = completion as {
          choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
          model?: string;
          usage?: {
            completion_tokens?: number;
            prompt_tokens?: number;
            total_tokens?: number;
          };
        };

        if (completionWithUsage.model) {
          span.setAttribute(observabilityAttributes.genAiResponseModel, completionWithUsage.model);
        }

        const choiceFinishReason = completionWithUsage.choices?.[0]?.finish_reason;
        if (choiceFinishReason) {
          span.setAttribute(observabilityAttributes.genAiResponseFinishReasons, [choiceFinishReason]);
        }

        if (completionWithUsage.usage) {
          const { prompt_tokens, completion_tokens, total_tokens } = completionWithUsage.usage;
          if (typeof prompt_tokens === "number") {
            span.setAttribute(observabilityAttributes.genAiUsageInputTokens, prompt_tokens);
          }
          if (typeof completion_tokens === "number") {
            span.setAttribute(observabilityAttributes.genAiUsageOutputTokens, completion_tokens);
          }
          if (typeof total_tokens === "number") {
            span.setAttribute(observabilityAttributes.genAiUsageTotalTokens, total_tokens);
          }
        }

        return completion;
      },
      {
        [observabilityAttributes.receiptOperation]: "extract",
      },
    );

    finishReason = response.choices?.[0]?.finish_reason;
    rawResponse = response.choices?.[0]?.message?.content;
  }

  logExtractionDiagnostics({
    model: options.model,
    provider: effectiveProvider,
    finishReason,
    maxOutputTokens: defaultMaxOutputTokens,
    sourceLabel,
    rawResponse: typeof rawResponse === "string" ? rawResponse : null,
  });

  if (finishReason === "length" || finishReason === "MAX_TOKENS") {
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
  const geminiClient = getGeminiClient();
  const inferenceClient = getInferenceClient();

  if (!geminiClient && !inferenceClient) {
    return NextResponse.json(
      { error: "Neither GEMINI_API_KEY nor HF_TOKEN is configured on the server." },
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
        headers: createRateLimitHeaders(rateLimit),
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
  let fileSizeBytes: number | undefined;
  let imageUrls: string[];
  let mimeType: string | undefined;
  let sourceType: "image" | "pdf";

  try {
    const upload = await getUploadedReceiptData(formData);
    fileName = upload.fileName;
    fileSizeBytes = upload.fileSizeBytes;
    imageUrls = upload.imageUrls;
    mimeType = upload.mimeType;
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
          fileSizeBytes,
          imageUrl,
          mimeType,
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

    const isGemini = Boolean(
      geminiClient &&
        (provider === "gemini" || isGeminiModel(model) || !inferenceClient),
    );

    return NextResponse.json({
      backend: isGemini ? "gemini" : "vercel-hf-route",
      currencyCode,
      purchaseDate: extractionResult.purchaseDate ?? null,
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
