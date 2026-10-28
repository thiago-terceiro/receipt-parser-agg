/**
 * Handles HTTP content negotiation for AI agents requesting text/markdown.
 * Allows LLMs, curl, and autonomous agents to ingest clean, token-efficient
 * documentation and workspace summaries instead of full HTML DOM trees.
 */

export const isMarkdownRequested = (acceptHeader: string | null | undefined): boolean => {
  if (!acceptHeader) return false;
  const lower = acceptHeader.toLowerCase();
  return lower.includes("text/markdown");
};

export const getMarkdownHeaders = (): Record<string, string> => ({
  "Content-Type": "text/markdown; charset=utf-8",
  "Vary": "Accept",
  "X-Content-Type-Options": "nosniff",
});

export const getMarkdownContentForRoute = (pathname: string): string => {
  const normalized = pathname.replace(/^\/(?:en|es|pt-br)(?:\/|$)/, "/");

  if (normalized === "/" || normalized === "") {
    return `# Receipt Parser & Aggregator AI — Home Workspace

Welcome to Receipt Parser & Aggregator AI. This web application provides multimodal receipt digitization, item extraction, and collaborative household grocery budgeting.

## Features
- **Multimodal OCR**: Powered by Google Gemini 3.8 Flash (\`gemini-flash-latest\`).
- **Supported Formats**: PNG, JPEG, WebP, and PDF (up to 5 pages, 10 MB maximum).
- **Structured Schema**: Extracts items, prices, quantities, categories, tax, and currency.
- **Shared Boards**: Multi-tenant grocery boards with owner, editor, and viewer roles.

## API Quickstart
\`\`\`bash
# Upload a receipt for OCR extraction
curl -X POST https://receipt-parser-agg.vercel.app/api/extract \\
  -F "file=@receipt.png" \\
  -F "modelId=gemini-flash-latest"
\`\`\`

## Documentation
- Machine-readable manifest: [/llms.txt](/llms.txt)
- Complete technical manual: [/llms-full.txt](/llms-full.txt)
- Remote MCP server: [/api/mcp/sse](/api/mcp/sse)
`;
  }

  if (normalized.startsWith("/groceries")) {
    return `# Groceries Dashboard & Shared Boards

The Groceries Dashboard aggregates line items extracted from digitized receipts into collaborative household expense boards.

## Capabilities
- **Expense Categorization**: Produce, Dairy, Meat, Bakery, Beverages, Pantry, Household, and Personal Care.
- **Currency Support**: Automatic ISO 4217 normalization (EUR, USD, BRL, GBP).
- **Multi-Tenant Collaboration**: Invite roommates or family members via secure token links.

## Active Endpoints
- \`GET /api/boards\`: List all user boards.
- \`POST /api/boards\`: Create a new board.
- \`GET /api/boards/[boardId]\`: Fetch board spending summary and items.
`;
  }

  if (normalized.startsWith("/invite")) {
    return `# Board Invitation Acceptance

This endpoint allows invited members to join a shared grocery board.

## Workflow
1. User receives an invite link containing an \`inviteToken\`.
2. Authenticated user submits the token to \`POST /api/invites/accept\`.
3. Supabase assigns member role (\`editor\` or \`viewer\`) and updates active board context.
`;
  }

  return `# Receipt AI Platform

Path: \`${pathname}\`

Visit [/llms.txt](/llms.txt) for the complete directory of endpoints and documentation.
`;
};
