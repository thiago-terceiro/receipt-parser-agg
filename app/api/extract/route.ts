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
  maxReceiptFileSizeBytes,
  mergeReceiptExtractions,
} from "../../../lib/receipt-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

let cachedGeminiClient: GoogleGenAI | null = null;
let cachedGeminiApiKey: string | null = null;

const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    cachedGeminiClient = null;
    cachedGeminiApiKey = null;
    return null;
  }

  if (cachedGeminiClient && cachedGeminiApiKey === apiKey) {
    return cachedGeminiClient;
  }

  cachedGeminiApiKey = apiKey;
  cachedGeminiClient = new GoogleGenAI({ apiKey });
  return cachedGeminiClient;
};

let cachedInferenceClient: InferenceClient | null = null;
let cachedInferenceToken: string | null = null;

const getInferenceClient = (): InferenceClient | null => {
  const token = process.env.HF_TOKEN;

  if (!token) {
    cachedInferenceClient = null;
    cachedInferenceToken = null;
    return null;
  }

  if (cachedInferenceClient && cachedInferenceToken === token) {
    return cachedInferenceClient;
  }

  cachedInferenceToken = token;
  cachedInferenceClient = new InferenceClient(token);
  return cachedInferenceClient;
};

const isGeminiModel = (modelId: string): boolean => modelId.includes("gemini");

const defaultPdfPageLimit = 5;
const defaultPdfRenderScale = 3;
const extractionConcurrencyCap = 2;
const maxMultipartRequestBodyBytes = 12 * 1024 * 1024;

const encodeBase64 = (bytes: ArrayBuffer | Uint8Array): string => {
  if (bytes instanceof ArrayBuffer) {
    return Buffer.from(bytes).toString("base64");
  }

  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
    "base64",
  );
};

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
  bytes: ArrayBuffer;
  fileName: string | null;
  fileSizeBytes: number;
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

const parseBoundedFormData = async (
  request: Request,
  maxBytes: number,
): Promise<FormData> => {
  if (!request.body || typeof request.body.getReader !== "function") {
    try {
      return await request.formData();
    } catch {
      throw new RequestValidationError("Invalid form data request body.", 400);
    }
  }

  const reader = request.body.getReader();
  let totalBytes = 0;
  let payloadExceeded = false;

  const cappedStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          payloadExceeded = true;
          try {
            await reader.cancel();
          } catch {
            // Suppress cancel error so 413 is consistently returned.
          }
          controller.error(
            new RequestValidationError(
              "Request payload exceeds 10 MB limit.",
              413,
            ),
          );
          return;
        }
        controller.enqueue(value);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } catch {
        // Ignore upstream cancellation failure.
      }
    },
  });

  try {
    return await new Response(cappedStream, {
      headers: request.headers,
    }).formData();
  } catch (error) {
    if (payloadExceeded) {
      throw new RequestValidationError(
        "Request payload exceeds 10 MB limit.",
        413,
      );
    }
    if (error instanceof RequestValidationError) {
      throw error;
    }
    throw new RequestValidationError("Invalid form data request body.", 400);
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

  if (file.size > maxReceiptFileSizeBytes) {
    throw new RequestValidationError(
      `Uploaded file exceeds the maximum allowed size of ${maxReceiptFileSizeBytes / (1024 * 1024)} MB.`,
      413,
    );
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) {
    throw new RequestValidationError("Uploaded file is empty.", 400);
  }

  if (bytes.byteLength > maxReceiptFileSizeBytes) {
    throw new RequestValidationError(
      `Uploaded file exceeds the maximum allowed size of ${maxReceiptFileSizeBytes / (1024 * 1024)} MB.`,
      413,
    );
  }

  const fileName = file.name?.trim() || null;
  const fileSizeBytes = bytes.byteLength;
  const isPdf = isPdfReceiptUpload(file);
  const mimeType = file.type || (isPdf ? "application/pdf" : "image/jpeg");

  return {
    bytes,
    fileName,
    fileSizeBytes,
    mimeType,
    sourceType: isPdf ? "pdf" : "image",
  };
};

const extractReceiptFromBase64 = async (options: {
  base64Data: string;
  effectiveProvider: string;
  fileName: string | null;
  fileSizeBytes?: number;
  geminiClient: GoogleGenAI | null;
  imageMimeType: string;
  inferenceClient: InferenceClient | null;
  mimeType?: string;
  model: string;
  pageCount: number;
  pageNumber: number;
  provider: string;
  sourceType: "image" | "pdf";
  useGemini: boolean;
}): Promise<{
  parsedExtraction: ParsedReceiptExtraction;
  rawResponse: string;
}> => {
  const sourceLabel = buildReceiptSourceLabel(
    options.sourceType,
    options.pageNumber,
    options.pageCount,
  );

  let finishReason: string | undefined;
  let rawResponse: string | undefined;

  if (options.useGemini && options.geminiClient) {
    const geminiClient = options.geminiClient;
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

        const geminiResult = await geminiClient.models.generateContent({
          model: options.model,
          contents: [
            {
              inlineData: {
                data: options.base64Data,
                mimeType: options.imageMimeType,
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
    const inferenceClient = options.inferenceClient;
    if (!inferenceClient) {
      throw new Error("No AI provider is configured on the server.");
    }

    const imageUrl = `data:${options.imageMimeType};base64,${options.base64Data}`;

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
    provider: options.effectiveProvider,
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

const extractPdfPages = async (options: {
  bytes: ArrayBuffer;
  effectiveProvider: string;
  fileName: string | null;
  fileSizeBytes: number;
  geminiClient: GoogleGenAI | null;
  inferenceClient: InferenceClient | null;
  mimeType: string;
  model: string;
  provider: string;
  useGemini: boolean;
}): Promise<{
  pageExtractions: ParsedReceiptExtraction[];
  rawResponses: string[];
}> => {
  const { pdf } = await import("pdf-to-img");

  let document: Awaited<ReturnType<typeof pdf>>;
  try {
    // Pass a Uint8Array (not Buffer) so pdf-to-img skips copying the entire PDF buffer.
    document = await pdf(new Uint8Array(options.bytes), {
      scale: defaultPdfRenderScale,
    });
  } catch (error) {
    throw new RequestValidationError(
      error instanceof Error ? error.message : "Failed to parse uploaded PDF.",
      400,
    );
  }

  try {
    const pageCount = document.length;
    if (pageCount > defaultPdfPageLimit) {
      throw new RequestValidationError(
        `PDF receipts with more than ${defaultPdfPageLimit} pages are not supported yet.`,
        400,
      );
    }

    if (pageCount === 0) {
      throw new RequestValidationError(
        "Uploaded PDF did not contain any pages.",
        400,
      );
    }

    const pageExtractions = new Array<ParsedReceiptExtraction>(pageCount);
    const rawResponses = new Array<string>(pageCount);
    const inFlight = new Set<Promise<void>>();
    let firstError: unknown = null;

    // Render pages sequentially while overlapping AI network latency up to concurrency cap.
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      if (firstError !== null) {
        break;
      }

      let pageBuffer: Buffer;
      try {
        pageBuffer = await document.getPage(pageNumber);
      } catch (error) {
        firstError = new RequestValidationError(
          error instanceof Error ? error.message : `Failed to render PDF page ${pageNumber}.`,
          400,
        );
        break;
      }

      if (firstError !== null) {
        break;
      }

      const pageBase64 = encodeBase64(pageBuffer);
      const pageIndex = pageNumber - 1;

      const task = extractReceiptFromBase64({
        base64Data: pageBase64,
        effectiveProvider: options.effectiveProvider,
        fileName: options.fileName,
        fileSizeBytes: options.fileSizeBytes,
        geminiClient: options.geminiClient,
        imageMimeType: "image/png",
        inferenceClient: options.inferenceClient,
        mimeType: options.mimeType,
        model: options.model,
        pageCount,
        pageNumber,
        provider: options.provider,
        sourceType: "pdf",
        useGemini: options.useGemini,
      })
        .then((res) => {
          pageExtractions[pageIndex] = res.parsedExtraction;
          rawResponses[pageIndex] = res.rawResponse;
        })
        .catch((error) => {
          if (firstError === null) {
            firstError = error;
          }
        })
        .finally(() => {
          inFlight.delete(task);
        });

      inFlight.add(task);

      if (inFlight.size >= extractionConcurrencyCap) {
        await Promise.race(inFlight);
      }
    }

    if (inFlight.size > 0) {
      await Promise.allSettled(inFlight);
    }

    if (firstError !== null) {
      throw firstError;
    }

    return {
      pageExtractions,
      rawResponses,
    };
  } finally {
    await document.destroy();
  }
};

export const GET = async () => {
  return NextResponse.json({
    defaultModelId,
    availableModels: dropdownAvailableModels,
  });
};

export const POST = async (request: Request) => {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxMultipartRequestBodyBytes) {
    return NextResponse.json(
      { error: "Request payload exceeds 10 MB limit." },
      { status: 413 },
    );
  }

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
    formData = await parseBoundedFormData(request, maxMultipartRequestBodyBytes);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Invalid form data request body." },
      { status: 400 },
    );
  }

  const model = resolveRequestedModelId({
    selectedModelId: formData.get("modelId"),
  });

  let upload: UploadedReceiptData;
  try {
    upload = await getUploadedReceiptData(formData);
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

  const useGemini = Boolean(
    geminiClient &&
      (provider === "gemini" || isGeminiModel(model) || !inferenceClient),
  );
  const effectiveProvider = useGemini ? "gemini" : provider;

  try {
    let pageExtractions: ParsedReceiptExtraction[];
    let rawResponses: string[];

    if (upload.sourceType === "pdf") {
      ({ pageExtractions, rawResponses } = await extractPdfPages({
        bytes: upload.bytes,
        effectiveProvider,
        fileName: upload.fileName,
        fileSizeBytes: upload.fileSizeBytes,
        geminiClient,
        inferenceClient,
        mimeType: upload.mimeType,
        model,
        provider,
        useGemini,
      }));
    } else {
      const imageMimeType = upload.mimeType.startsWith("image/")
        ? upload.mimeType
        : "image/jpeg";
      const result = await extractReceiptFromBase64({
        base64Data: encodeBase64(upload.bytes),
        effectiveProvider,
        fileName: upload.fileName,
        fileSizeBytes: upload.fileSizeBytes,
        geminiClient,
        imageMimeType,
        inferenceClient,
        mimeType: upload.mimeType,
        model,
        pageCount: 1,
        pageNumber: 1,
        provider,
        sourceType: "image",
        useGemini,
      });
      pageExtractions = [result.parsedExtraction];
      rawResponses = [result.rawResponse];
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
        fileName: upload.fileName,
        currencyCodes: Array.from(uniqueCurrencyCodes),
      });
    }

    return NextResponse.json({
      backend: useGemini ? "gemini" : "vercel-hf-route",
      currencyCode,
      purchaseDate: extractionResult.purchaseDate ?? null,
      modelId: model,
      items,
      rawResponse,
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected extraction error.";
    return NextResponse.json(
      { error: buildExtractionError(message, model) },
      { status: 502 },
    );
  }
};
