"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import type { AvailableModel } from "../lib/receipt";

type ReceiptItem = {
  item: string;
  price: number;
};

type ExtractionResponse = {
  backend: string;
  modelId: string;
  items: ReceiptItem[];
  rawResponse: string;
};

type ModelCatalogResponse = {
  defaultModelId: string;
  models: AvailableModel[];
  provider: string;
  source: "router" | "fallback";
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [catalogSource, setCatalogSource] = useState<"router" | "fallback" | null>(null);
  const [provider, setProvider] = useState<string>("auto");
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      try {
        const response = await fetch("/api/extract", { cache: "no-store" });
        const payload = (await response.json()) as ModelCatalogResponse | { error?: string };

        if (!response.ok || !("models" in payload)) {
          throw new Error(
            "error" in payload && payload.error ? payload.error : "Failed to load model list.",
          );
        }

        if (!isMounted) {
          return;
        }

        setModels(payload.models);
        setSelectedModelId(payload.defaultModelId);
        setCatalogSource(payload.source);
        setProvider(payload.provider);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unexpected model catalog error.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingModels(false);
        }
      }
    }

    void loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setResult(null);
    setError(null);

    if (!nextFile) {
      setPreviewUrl(null);
      return;
    }

    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Select a receipt image before extracting.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("modelId", selectedModelId);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ExtractionResponse | { error?: string };
      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error ? payload.error : "Extraction failed.",
        );
      }

      setResult(payload as ExtractionResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unexpected request error.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Receipt AI</p>
          <h1>Upload a receipt and extract line items without running the model locally.</h1>
          <p className="lede">
            This frontend is designed for Vercel. The browser uploads the image to a server
            route, and the server route calls Hugging Face with a private token.
          </p>
        </div>
        <form className="upload-panel" onSubmit={handleSubmit}>
          <label className="file-dropzone" htmlFor="receipt-file">
            <span className="drop-title">Choose receipt image</span>
            <span className="drop-subtitle">PNG, JPG, or WEBP works best.</span>
            <input
              id="receipt-file"
              name="receipt-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
          <label className="model-select-group" htmlFor="model-id">
            <span className="input-label">Vision model</span>
            <select
              id="model-id"
              className="model-select"
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
              disabled={isLoading || isLoadingModels || models.length === 0}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
            <span className="hint-text">
              {isLoadingModels
                ? "Loading live model catalog..."
                : catalogSource === "router"
                  ? `Live catalog via ${provider}.`
                  : "Using fallback model list because the live catalog is unavailable."}
            </span>
          </label>
          <button className="submit-button" type="submit" disabled={!file || isLoading}>
            {isLoading ? "Extracting..." : "Extract receipt"}
          </button>
          {error ? <p className="status error">{error}</p> : null}
        </form>
      </section>

      <section className="workspace-grid">
        <article className="panel preview-panel">
          <div className="panel-heading">
            <h2>Preview</h2>
            <span>{file ? file.name : "No file selected"}</span>
          </div>
          {previewUrl ? (
            <img className="receipt-preview" src={previewUrl} alt="Receipt preview" />
          ) : (
            <div className="empty-state">Your receipt preview will appear here.</div>
          )}
        </article>

        <article className="panel result-panel">
          <div className="panel-heading">
            <h2>Extracted items</h2>
            <span>{result ? result.modelId : "Waiting for extraction"}</span>
          </div>
          {result ? (
            <>
              <div className="result-meta">Served by {result.backend}</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((entry) => (
                      <tr key={`${entry.item}-${entry.price}`}>
                        <td>{entry.item}</td>
                        <td>${entry.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <pre className="raw-response">{result.rawResponse}</pre>
            </>
          ) : (
            <div className="empty-state">
              Extracted line items and the raw model response will appear here.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
