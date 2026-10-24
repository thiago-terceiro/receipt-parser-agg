import * as fs from "node:fs";

import { pdf } from "pdf-to-img";

// Minimal valid PDF representing a supermarket grocery receipt
const receiptPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 180 >>
stream
BT
/F1 16 Tf
30 360 Td (FRESH MART GROCERY) Tj
/F1 12 Tf
0 -30 Td (Organic Whole Milk 1L      2.49 EUR) Tj
0 -25 Td (Sourdough Bread Loaf       3.20 EUR) Tj
0 -25 Td (Fresh Bananas 1kg          1.80 EUR) Tj
0 -40 Td (SUBTOTAL                  7.49 EUR) Tj
0 -20 Td (TOTAL                     7.49 EUR) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000474 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
544
%%EOF`;

export async function createSimulatedReceiptPng(): Promise<Buffer> {
  const doc = await pdf(Buffer.from(receiptPdf), { scale: 2 });
  try {
    const pageBuffer = await doc.getPage(1);
    return Buffer.from(pageBuffer);
  } finally {
    await doc.destroy();
  }
}

if (process.argv[1]?.endsWith("generate-simulated-receipt.ts")) {
  createSimulatedReceiptPng().then((pngBuffer) => {
    fs.writeFileSync("simulated-receipt.png", pngBuffer);
    console.log("Successfully generated simulated-receipt.png:", pngBuffer.length, "bytes");
  }).catch((err) => {
    console.error("Error generating receipt:", err);
    process.exit(1);
  });
}
