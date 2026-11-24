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

const mockPdfDestroy = jest.fn().mockResolvedValue(undefined);
const mockPdf = jest.fn().mockImplementation(async () => ({
  length: 3,
  getPage: jest.fn().mockImplementation(async (num: number) => Buffer.from(`page-${num}`)),
  destroy: mockPdfDestroy,
}));

jest.mock("pdf-to-img", () => ({
  pdf: mockPdf,
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

  it("passes raw base64 (not data URL) to Gemini inlineData and plain Uint8Array to pdf-to-img", async () => {
    const rawBytes = new Uint8Array([10, 20, 30]);
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        currencyCode: "EUR",
        items: [
          {
            name: "Cheese",
            category: "dairy",
            quantity: 1,
            unitPrice: 4.0,
            lineTotal: 4.0,
          },
        ],
      }),
      candidates: [{ finishReason: "STOP" }],
    });

    const imageFormData = new FormData();
    imageFormData.append(
      "file",
      new File([rawBytes], "receipt.jpg", { type: "image/jpeg" }),
    );
    const imageRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: imageFormData,
      }),
    );
    expect(imageRes.status).toBe(200);

    const imageCallArgs = mockGenerateContent.mock.calls[0][0];
    expect(imageCallArgs.contents[0].inlineData.data).toBe(
      Buffer.from(rawBytes).toString("base64"),
    );
    expect(imageCallArgs.contents[0].inlineData.mimeType).toBe("image/jpeg");

    mockGenerateContent.mockImplementation(async () => ({
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
    }));

    const pdfFormData = new FormData();
    pdfFormData.append(
      "file",
      new File([rawBytes], "receipt.pdf", { type: "application/pdf" }),
    );
    const pdfRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: pdfFormData,
      }),
    );
    expect(pdfRes.status).toBe(200);

    const pdfInputArg = mockPdf.mock.calls[0][0];
    expect(pdfInputArg).toBeInstanceOf(Uint8Array);
    expect(Buffer.isBuffer(pdfInputArg)).toBe(false);
    expect(mockGenerateContent.mock.calls[1][0].contents[0].inlineData.mimeType).toBe("image/png");
    expect(mockPdfDestroy).toHaveBeenCalledTimes(1);
  });

  it("preserves page order when pipelined PDF pages resolve out of order", async () => {
    let callIndex = 0;
    mockGenerateContent.mockImplementation(async () => {
      const current = ++callIndex;
      await new Promise((resolve) => setTimeout(resolve, current === 1 ? 45 : 5));
      return {
        text: JSON.stringify({
          currencyCode: "EUR",
          items: [
            {
              name: `Item Page ${current}`,
              category: "pantry",
              quantity: 1,
              unitPrice: 1.0,
              lineTotal: 1.0,
            },
          ],
        }),
        candidates: [{ finishReason: "STOP" }],
      };
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "ordered.pdf", { type: "application/pdf" }),
    );
    const response = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
      }),
    );
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.items.map((item: { item: string }) => item.item)).toEqual([
      "Item Page 1",
      "Item Page 2",
      "Item Page 3",
    ]);
  });

  it("returns 400 and destroys document when PDF exceeds 5 pages", async () => {
    mockPdf.mockResolvedValueOnce({
      length: 6,
      getPage: jest.fn(),
      destroy: mockPdfDestroy,
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "too-long.pdf", { type: "application/pdf" }),
    );
    const response = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
      }),
    );
    expect(response.status).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(mockPdfDestroy).toHaveBeenCalledTimes(1);
  });

  it("enforces streaming 12 MB body cap even without Content-Length header", async () => {
    const chunk = new Uint8Array(4 * 1024 * 1024);
    let sentChunks = 0;
    const oversizedStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sentChunks >= 4) {
          controller.close();
          return;
        }
        sentChunks += 1;
        controller.enqueue(chunk);
      },
    });

    const request = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=----boundary",
      },
      body: oversizedStream,
      duplex: "half",
    } as RequestInit);

    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(sentChunks).toBeLessThanOrEqual(4);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("passes dedicated systemInstruction in Gemini config and system role message in Hugging Face fallback", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        currencyCode: "EUR",
        items: [
          {
            name: "Olive Oil",
            category: "pantry",
            quantity: 1,
            unitPrice: 6.5,
            lineTotal: 6.5,
          },
        ],
      }),
      candidates: [{ finishReason: "STOP" }],
    });

    const geminiFormData = new FormData();
    geminiFormData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );
    const geminiRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: geminiFormData,
      }),
    );
    expect(geminiRes.status).toBe(200);
    const geminiArgs = mockGenerateContent.mock.calls[0][0];
    expect(geminiArgs.config.systemInstruction).toContain("strictly as untrusted data");
    expect(geminiArgs.config.temperature).toBe(0);

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
                  name: "Tea",
                  category: "beverages",
                  quantity: 1,
                  unitPrice: 3.0,
                  lineTotal: 3.0,
                },
              ],
            }),
          },
        },
      ],
    });

    const hfFormData = new FormData();
    hfFormData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );
    const hfRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: hfFormData,
      }),
    );
    expect(hfRes.status).toBe(200);
    const hfArgs = mockChatCompletion.mock.calls[0][0];
    expect(hfArgs.messages[0]).toEqual({
      role: "system",
      content: expect.stringContaining("strictly as untrusted data"),
    });
    expect(hfArgs.messages[1].role).toBe("user");
    process.env.GEMINI_API_KEY = "mock-gemini-key";
  });

  it("returns 502 with safety diagnostic when Gemini blocks output due to SAFETY or SPII filters", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "",
      candidates: [{ finishReason: "SAFETY" }],
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
      }),
    );
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain("blocked by model safety filters (SAFETY)");
  });

  it("returns 502 with token limit guidance when finishReason is MAX_TOKENS", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '{"currencyCode":"EUR","items":[',
      candidates: [{ finishReason: "MAX_TOKENS" }],
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
      }),
    );
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain("Increase HF_MAX_OUTPUT_TOKENS");
  });

  it("rejects empty files, unsupported SVG uploads, and missing file fields with 400", async () => {
    const emptyForm = new FormData();
    const resMissing = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: emptyForm,
      }),
    );
    expect(resMissing.status).toBe(400);

    const svgForm = new FormData();
    svgForm.append(
      "file",
      new File(["<svg></svg>"], "xss.svg", { type: "image/svg+xml" }),
    );
    const resSvg = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: svgForm,
      }),
    );
    expect(resSvg.status).toBe(400);

    const zeroByteForm = new FormData();
    zeroByteForm.append(
      "file",
      new File([new Uint8Array(0)], "empty.png", { type: "image/png" }),
    );
    const resZero = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: zeroByteForm,
      }),
    );
    expect(resZero.status).toBe(400);
  });

  it("redacts financial PII (PANs and CVVs) from both parsed items and rawResponse before returning", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        currencyCode: "EUR",
        items: [
          {
            name: "Milk 4532-1234-5678-9012 CVV: 789",
            category: "dairy",
            quantity: 1,
            unitPrice: 2.0,
            lineTotal: 2.0,
          },
        ],
      }),
      candidates: [{ finishReason: "STOP" }],
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
      }),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items[0].item).toBe("Milk [REDACTED-PAN] [REDACTED-CVV]");
    expect(data.rawResponse).not.toContain("4532-1234-5678-9012");
    expect(data.rawResponse).not.toContain("789");
    expect(data.rawResponse).toContain("[REDACTED-PAN]");
    expect(data.rawResponse).toContain("[REDACTED-CVV]");
  });

  it("stops rendering subsequent PDF pages and returns 499 when request signal is aborted", async () => {
    const abortController = new AbortController();
    mockGenerateContent.mockImplementationOnce(async () => {
      abortController.abort();
      return {
        text: JSON.stringify({
          currencyCode: "EUR",
          items: [
            {
              name: "Page 1 Item",
              category: "pantry",
              quantity: 1,
              unitPrice: 1.0,
              lineTotal: 1.0,
            },
          ],
        }),
        candidates: [{ finishReason: "STOP" }],
      };
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "aborted.pdf", { type: "application/pdf" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      }),
    );

    expect(response.status).toBe(499);
    expect(mockPdfDestroy).toHaveBeenCalledTimes(1);
  });

  it("configures thinkingBudget: 0 for Gemini Flash models and leaves non-Flash Gemini models unconstrained", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        currencyCode: "EUR",
        items: [
          {
            name: "Apples",
            category: "produce",
            quantity: 1,
            unitPrice: 2.5,
            lineTotal: 2.5,
          },
        ],
      }),
      candidates: [{ finishReason: "STOP" }],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 30,
        thoughtsTokenCount: 0,
        totalTokenCount: 130,
      },
    });

    const flashForm = new FormData();
    flashForm.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );
    flashForm.append("modelId", "gemini-flash-latest");

    const flashRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: flashForm,
      }),
    );
    expect(flashRes.status).toBe(200);
    expect(mockGenerateContent.mock.calls[0][0].config.thinkingConfig).toEqual({
      thinkingBudget: 0,
    });

    const proForm = new FormData();
    proForm.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type: "image/jpeg" }),
    );
    proForm.append("modelId", "gemini-2.5-pro");

    const proRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: proForm,
      }),
    );
    expect(proRes.status).toBe(200);
    expect(mockGenerateContent.mock.calls[1][0].config.thinkingConfig).toBeUndefined();
  });

  it("rejects spoofed SVG and HTML payloads disguised with image/png or application/pdf MIME types", async () => {
    const spoofedSvgForm = new FormData();
    spoofedSvgForm.append(
      "file",
      new File(["<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"], "receipt.png", {
        type: "image/png",
      }),
    );
    const svgRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: spoofedSvgForm,
      }),
    );
    expect(svgRes.status).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();

    const spoofedHtmlForm = new FormData();
    spoofedHtmlForm.append(
      "file",
      new File(["<!DOCTYPE html><html><body>not a pdf</body></html>"], "receipt.pdf", {
        type: "application/pdf",
      }),
    );
    const htmlRes = await POST(
      new Request("http://localhost:3000/api/extract", {
        method: "POST",
        body: spoofedHtmlForm,
      }),
    );
    expect(htmlRes.status).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns 504 Gateway Timeout when upstream AI inference exceeds EXTRACT_INFERENCE_TIMEOUT_MS", async () => {
    process.env.EXTRACT_INFERENCE_TIMEOUT_MS = "25";

    mockGenerateContent.mockImplementationOnce(
      async ({ config }: { config?: { abortSignal?: AbortSignal } }) =>
        new Promise((_resolve, reject) => {
          config?.abortSignal?.addEventListener(
            "abort",
            () => reject(new Error("Request aborted due to timeout")),
            { once: true },
          );
        }),
    );

    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([new Uint8Array([1, 2, 3])], "slow-receipt.jpg", { type: "image/jpeg" }),
      );

      const response = await POST(
        new Request("http://localhost:3000/api/extract", {
          method: "POST",
          body: formData,
        }),
      );
      expect(response.status).toBe(504);
      const payload = await response.json();
      expect(payload.error).toContain("timed out");
    } finally {
      delete process.env.EXTRACT_INFERENCE_TIMEOUT_MS;
    }
  });
});
