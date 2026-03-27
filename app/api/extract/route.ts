import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

import {
    buildDataUrl,
    defaultModelId,
    parseReceiptItems,
    receiptPrompt,
} from "../../../lib/receipt";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
    const token = process.env.HF_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: "HF_TOKEN is not configured on the server." },
            { status: 500 },
        );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json(
            { error: "Request must include an image file under the 'file' field." },
            { status: 400 },
        );
    }

    if (!file.type.startsWith("image/")) {
        return NextResponse.json(
            { error: "Uploaded file must be an image." },
            { status: 400 },
        );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0) {
        return NextResponse.json(
            { error: "Uploaded file is empty." },
            { status: 400 },
        );
    }

    const client = new InferenceClient(token);
    const provider = (process.env.HF_PROVIDER ?? "hf-inference") as never;
    const model = process.env.HF_MODEL_ID ?? defaultModelId;
    const imageUrl = buildDataUrl(bytes, file.type || "image/jpeg");

    try {
        const response = await client.chatCompletion({
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
                            text: receiptPrompt,
                        },
                    ] satisfies ChatMessageContent,
                },
            ],
            max_tokens: 500,
            temperature: 0,
        });

        const rawResponse = response.choices?.[0]?.message?.content;
        if (typeof rawResponse !== "string" || !rawResponse.trim()) {
            return NextResponse.json(
                { error: "Hugging Face returned an empty response." },
                { status: 502 },
            );
        }

        const items = parseReceiptItems(rawResponse);
        return NextResponse.json({
            backend: "vercel-hf-route",
            modelId: model,
            items,
            rawResponse,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected extraction error.";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
