import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

import {
  getMonthKey,
  type ExtractedReceipt,
} from "@/lib/groceries";
import { getReceiptExtractionWriteKey } from "@/lib/groceries-server";
import { redis } from "@/lib/redis";
import { getSessionIdentity } from "@/lib/session";

import {
  buildDataUrl,
  buildReceiptPrompt,
  defaultModelId,
  defaultProvider,
  dropdownAvailableModels,
  parseReceiptItems,
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

  try {
    const response = await inferenceClient.chatCompletion({
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
      max_tokens: 800,
      temperature: 0,
    });

    const rawResponse = response.choices?.[0]?.message?.content;
    console.log("Raw response from Hugging Face:", rawResponse);
    if (typeof rawResponse !== "string" || !rawResponse.trim()) {
      return NextResponse.json(
        { error: "Hugging Face returned an empty response." },
        { status: 502 },
      );
    }
    const items = parseReceiptItems(rawResponse);

    const identity = await getSessionIdentity();
    if (redis && (identity?.userId || identity?.email)) {
      const extractedAt = new Date().toISOString();
      const month = getMonthKey(new Date(extractedAt));
      const key = getReceiptExtractionWriteKey(identity, month);

      if (!key) {
        return NextResponse.json(
          { error: "Unable to resolve receipt extraction storage key." },
          { status: 401 },
        );
      }

      const extraction: ExtractedReceipt = {
        id: crypto.randomUUID(),
        month,
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

      await redis.lpush(key, JSON.stringify(extraction));
    }

    return NextResponse.json({
      backend: "vercel-hf-route",
      modelId: model,
      items,
      rawResponse,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extraction error.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
