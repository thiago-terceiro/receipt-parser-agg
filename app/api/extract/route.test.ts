/**
 * @jest-environment node
 */

let POST: typeof import("./route").POST;
let GET: typeof import("./route").GET;
let maxDuration: typeof import("./route").maxDuration;

const mockChatCompletion = jest.fn();

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
    process.env.HF_TOKEN = "mock-hf-token";
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

  it("parallelizes multi-page PDF extractions in batches of 2", async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;

    mockChatCompletion.mockImplementation(async () => {
      activeCalls += 1;
      maxConcurrent = Math.max(maxConcurrent, activeCalls);
      // Small delay to verify concurrency
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeCalls -= 1;

      return {
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                currencyCode: "EUR",
                items: [
                  {
                    item: "Bread",
                    normalizedItem: "bread",
                    category: "bakery",
                    quantity: 1,
                    unitPrice: 2.0,
                    lineTotal: 2.0,
                  },
                ],
              }),
            },
          },
        ],
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
    expect(data.backend).toBe("vercel-hf-route");
    expect(data.currencyCode).toBe("EUR");
    // 3 pages extracted
    expect(mockChatCompletion).toHaveBeenCalledTimes(3);
    // Concurrency capped at 2
    expect(maxConcurrent).toBeLessThanOrEqual(2);
    // 3 items merged (1 from each page)
    expect(data.items).toHaveLength(3);
  });

  it("returns 502 when a page extraction is rejected", async () => {
    let callIndex = 0;
    mockChatCompletion.mockImplementation(async () => {
      callIndex += 1;
      if (callIndex === 2) {
        throw new Error("Inference API error on page 2");
      }
      return {
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                currencyCode: "EUR",
                items: [
                  {
                    item: "Milk",
                    normalizedItem: "milk",
                    category: "dairy",
                    quantity: 1,
                    unitPrice: 3.0,
                    lineTotal: 3.0,
                  },
                ],
              }),
            },
          },
        ],
      };
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.pdf", { type: "application/pdf" }),
    );

    const request = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(502);

    const data = await response.json();
    expect(data.error).toContain("Inference API error on page 2");
  });
});
