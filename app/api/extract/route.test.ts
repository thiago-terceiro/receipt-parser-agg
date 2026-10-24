/**
 * @jest-environment node
 */

let POST: typeof import("./route").POST;
let GET: typeof import("./route").GET;
let maxDuration: typeof import("./route").maxDuration;

const mockChatCompletion = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
  };
});

jest.mock("@huggingface/inference", () => {
  return {
    InferenceClient: jest.fn().mockImplementation(() => ({
      chatCompletion: mockChatCompletion,
    })),
  };
});

jest.mock("pdf-to-img", () => ({
  pdf: jest.fn().mockImplementation(async () => ({
    length: 3,
    getPage: jest.fn().mockImplementation(async (num: number) => Buffer.from(`page-${num}`)),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@/lib/extract-rate-limit", () => ({
  checkReceiptExtractionRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@/lib/session", () => ({
  getSessionIdentity: jest.fn().mockResolvedValue(null),
}));

describe("app/api/extract/route", () => {
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: "mock-gemini-key",
      HF_TOKEN: "mock-hf-token",
    };
    const route = await import("./route");
    POST = route.POST;
    GET = route.GET;
    maxDuration = route.maxDuration;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("exports maxDuration = 60 to prevent Vercel 15s function timeouts", () => {
    expect(maxDuration).toBe(60);
  });

  it("handles GET request by returning default and available models", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.defaultModelId).toBeDefined();
    expect(Array.isArray(data.availableModels)).toBe(true);
  });

  it("extracts receipt via Google Gemini and returns backend='gemini'", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        currencyCode: "EUR",
        items: [
          {
            name: "Organic Milk",
            category: "dairy",
            quantity: 2,
            unitPrice: 1.5,
            lineTotal: 3.0,
          },
        ],
      }),
      candidates: [{ finishReason: "STOP" }],
      modelVersion: "gemini-3.8-flash",
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 45,
        totalTokenCount: 165,
      },
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );
    formData.append("modelId", "gemini-flash-latest");

    const request = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.backend).toBe("gemini");
    expect(data.currencyCode).toBe("EUR");
    expect(data.items).toHaveLength(1);
    expect(data.items[0].item).toBe("Organic Milk");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("parallelizes multi-page PDF extractions in batches of 2", async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;

    mockGenerateContent.mockImplementation(async () => {
      activeCalls += 1;
      maxConcurrent = Math.max(maxConcurrent, activeCalls);
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeCalls -= 1;

      return {
        text: JSON.stringify({
          currencyCode: "EUR",
          items: [
            {
              name: "Bread",
              category: "bakery",
              quantity: 1,
              unitPrice: 2.0,
              lineTotal: 2.0,
            },
          ],
        }),
        candidates: [{ finishReason: "STOP" }],
        modelVersion: "gemini-flash-latest",
      };
    });

    const formData = new FormData();
    const mockPdfBytes = new Uint8Array([1, 2, 3]);
    formData.append(
      "file",
      new File([mockPdfBytes], "multi-page-receipt.pdf", { type: "application/pdf" }),
    );

    const request = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.backend).toBe("gemini");
    expect(data.currencyCode).toBe("EUR");
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(data.items).toHaveLength(3);
  });

  it("returns 502 when an extraction call is rejected", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("Gemini API service unavailable"));

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );

    const request = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(502);

    const data = await response.json();
    expect(data.error).toContain("Gemini API service unavailable");
  });

  it("falls back to Hugging Face when GEMINI_API_KEY is unset and HF_TOKEN is present", async () => {
    delete process.env.GEMINI_API_KEY;

    mockChatCompletion.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              currencyCode: "USD",
              items: [
                {
                  item: "Coffee",
                  normalizedItem: "coffee",
                  category: "beverages",
                  quantity: 1,
                  unitPrice: 4.5,
                  lineTotal: 4.5,
                },
              ],
            }),
          },
        },
      ],
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );

    const request = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.backend).toBe("vercel-hf-route");
    expect(data.currencyCode).toBe("USD");
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);

    process.env.GEMINI_API_KEY = "mock-gemini-key";
  });
});
