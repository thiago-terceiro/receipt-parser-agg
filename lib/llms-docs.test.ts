/**
 * @jest-environment node
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { AVAILABLE_MCP_TOOLS, MCP_SERVER_INFO } from "@/lib/mcp-server";
import { groceryCategories } from "@/lib/receipt";

describe("AI-ready documentation contracts (llms.txt & llms-full.txt)", () => {
  const llmsTxtPath = path.resolve(process.cwd(), "public/llms.txt");
  const llmsFullTxtPath = path.resolve(process.cwd(), "public/llms-full.txt");

  it("maintains non-empty public/llms.txt and public/llms-full.txt manifests", () => {
    expect(fs.existsSync(llmsTxtPath)).toBe(true);
    expect(fs.existsSync(llmsFullTxtPath)).toBe(true);

    const llmsTxt = fs.readFileSync(llmsTxtPath, "utf8");
    const llmsFullTxt = fs.readFileSync(llmsFullTxtPath, "utf8");

    expect(llmsTxt).toContain("# Receipt Parser & Aggregator AI");
    expect(llmsTxt).toContain("/llms-full.txt");
    expect(llmsFullTxt).toContain(MCP_SERVER_INFO.protocolVersion);
  });

  it("documents every registered MCP tool and exact groceryCategory enum without stale drift", () => {
    const llmsFullTxt = fs.readFileSync(llmsFullTxtPath, "utf8");

    for (const tool of AVAILABLE_MCP_TOOLS) {
      expect(llmsFullTxt).toContain(`\`${tool.name}\``);
    }

    for (const category of groceryCategories) {
      expect(llmsFullTxt).toContain(`"${category}"`);
    }

    // Ensure runtime ReceiptItem fields match lib/receipt.ts
    expect(llmsFullTxt).toContain("normalizedItem: string;");
    expect(llmsFullTxt).toContain("unitPrice: number;");
    expect(llmsFullTxt).toContain("lineTotal: number;");
  });
});
