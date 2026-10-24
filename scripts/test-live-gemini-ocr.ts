import * as fs from "node:fs";
import * as path from "node:path";

// Load .env.local manually without extra dependency
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import { createSimulatedReceiptPng } from "./generate-simulated-receipt";
import { POST } from "../app/api/extract/route";

async function runLiveTest() {
  console.log("=== STARTING LIVE END-TO-END GEMINI OCR TEST ===");
  console.log("Model ID:", process.env.GEMINI_MODEL_ID || "gemini-flash-latest");
  console.log("API Key configured:", Boolean(process.env.GEMINI_API_KEY));

  const pngBuffer = await createSimulatedReceiptPng();
  console.log("Simulated receipt PNG generated. Size:", pngBuffer.length, "bytes.");

  const file = new File([new Uint8Array(pngBuffer)], "simulated-grocery-receipt.png", {
    type: "image/png",
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("modelId", process.env.GEMINI_MODEL_ID || "gemini-flash-latest");

  const request = new Request("http://localhost:3000/api/extract", {
    method: "POST",
    body: formData,
  });

  console.log("Dispatching POST request to /api/extract handler...");
  const startTime = Date.now();
  const response = await POST(request);
  const durationMs = Date.now() - startTime;

  console.log("HTTP Status:", response.status);
  console.log("Execution Time:", `${durationMs}ms`);

  const responseJson = await response.json();
  console.log("\nResponse Body:");
  console.log(JSON.stringify(responseJson, null, 2));

  if (response.status !== 200) {
    console.error("FAIL: Expected 200 OK, got", response.status);
    process.exit(1);
  }

  if (responseJson.backend !== "gemini") {
    console.error("FAIL: Expected backend to be 'gemini', got", responseJson.backend);
    process.exit(1);
  }

  if (!Array.isArray(responseJson.items) || responseJson.items.length === 0) {
    console.error("FAIL: Expected non-empty items array");
    process.exit(1);
  }

  console.log("\n=== TEST PASSED: Gemini OCR is LIVE and WORKING! ===");
  console.log(`Extracted ${responseJson.items.length} items in ${responseJson.currencyCode || "EUR"}:`);
  for (const item of responseJson.items) {
    console.log(`  - [${item.category}] ${item.item} (${item.quantity}x @ ${item.unitPrice}) = ${item.lineTotal}`);
  }
}

runLiveTest().catch((err) => {
  console.error("Live test crashed:", err);
  process.exit(1);
});
