import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

import {
    type AvailableModel,
    buildDataUrl,
    defaultModelId,
    defaultProvider,
    fallbackAvailableModels,
    parseReceiptItems,
    receiptPrompt,
} from "../../../lib/receipt";

export const runtime = "nodejs";

const hfRouterModelsUrl = "https://router.huggingface.co/v1/models";

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

type RouterModelProvider = {
    provider?: string;
    status?: string;
};

type RouterModel = {
    id?: string;
    architecture?: {
        input_modalities?: string[];
        output_modalities?: string[];
    };
    providers?: RouterModelProvider[];
};

type RouterModelsResponse = {
    data?: RouterModel[];
};

function getConfiguredProvider(): string {
    return defaultProvider;
}

function hasVisionInput(model: RouterModel): boolean {
    const inputModalities = model.architecture?.input_modalities ?? [];
    const outputModalities = model.architecture?.output_modalities ?? [];

    return inputModalities.includes("image") && outputModalities.includes("text");
}

function buildLiveModelList(models: RouterModel[], provider: string): AvailableModel[] {
    return models
        .filter((model) => typeof model.id === "string" && hasVisionInput(model))
        .map((model) => {
            const liveProviders = (model.providers ?? [])
                .filter((entry) => entry.status === "live")
                .map((entry) => entry.provider)
                .filter((entry): entry is string => typeof entry === "string" && !!entry);

            return {
                id: model.id as string,
                label: model.id as string,
                providers: liveProviders,
            } satisfies AvailableModel;
        })
        .filter((model) =>
            provider === "auto"
                ? model.providers.length > 0
                : model.providers.includes(provider),
        )
        .sort((left, right) => {
            if (left.id === defaultModelId) {
                return -1;
            }

            if (right.id === defaultModelId) {
                return 1;
            }

            if (right.providers.length !== left.providers.length) {
                return right.providers.length - left.providers.length;
            }

            return left.id.localeCompare(right.id);
        });
}

async function getAvailableModels(token?: string): Promise<{
    models: AvailableModel[];
    source: "router" | "fallback";
}> {
    try {
        const response = await fetch(hfRouterModelsUrl, {
            headers: token
                ? {
                    Authorization: `Bearer ${token}`,
                }
                : undefined,
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Model catalog request failed with status ${response.status}.`);
        }

        const payload = (await response.json()) as RouterModelsResponse;
        const models = buildLiveModelList(payload.data ?? [], getConfiguredProvider());
        if (models.length === 0) {
            throw new Error("No compatible vision models were returned by the Hugging Face router.");
        }

        return {
            models,
            source: "router",
        };
    } catch {
        return {
            models: fallbackAvailableModels,
            source: "fallback",
        };
    }
}

export async function GET() {
    const token = process.env.HF_TOKEN;
    const { models, source } = await getAvailableModels(token);

    return NextResponse.json({
        models,
        defaultModelId: models.some((model) => model.id === defaultModelId)
            ? defaultModelId
            : models[0]?.id ?? defaultModelId,
        provider: getConfiguredProvider(),
        source,
    });
}

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
    const modelIdField = formData.get("modelId");
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
    const provider = getConfiguredProvider() as never;
    const model =
        typeof modelIdField === "string" && modelIdField.trim()
            ? modelIdField.trim()
            : defaultModelId;
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
