import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export type SecurityViolation = {
  rule: string;
  file: string;
  line?: number;
  message: string;
};

export type SecurityAuditReport = {
  passed: boolean;
  scannedFiles: number;
  violations: SecurityViolation[];
};

const SOURCE_DIRECTORIES = [
  "app",
  "components",
  "contents",
  "context",
  "i18n",
  "lib",
  "scripts",
  "supabase",
] as const;

const SECRET_PATTERNS: ReadonlyArray<{ rule: string; regex: RegExp; message: string }> = [
  {
    rule: "private-key-header",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?(?:PRIVATE )?KEY-----/,
    message: "Hardcoded private key PEM header detected.",
  },
  {
    rule: "aws-access-key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    message: "Hardcoded AWS access key ID detected.",
  },
  {
    rule: "github-pat",
    regex: /\b(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/,
    message: "Hardcoded GitHub Personal Access Token detected.",
  },
  {
    rule: "google-api-key",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/,
    message: "Hardcoded Google/Gemini API key detected.",
  },
  {
    rule: "tls-verify-disabled",
    regex: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']0["']|rejectUnauthorized\s*:\s*false/,
    message: "TLS certificate verification is disabled.",
  },
];

const CODE_EXECUTION_PATTERNS: ReadonlyArray<{
  rule: string;
  regex: RegExp;
  message: string;
}> = [
  {
    rule: "unsafe-eval",
    regex: /\beval\s*\(|new\s+Function\s*\(/,
    message: "Unsafe dynamic code execution (eval / new Function) is prohibited.",
  },
  {
    rule: "unescaped-inner-html",
    regex: new RegExp(`\\b${["dangerously", "SetInnerHTML"].join("")}\\b`),
    message: "Unescaped HTML injection prop is prohibited in production components.",
  },
];

const isTestOrStoryFile = (filePath: string): boolean =>
  /\.(?:test|spec|stories)\.[cm]?[jt]sx?$/i.test(filePath);

const collectFiles = (dirPath: string): string[] => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (/\.(?:[cm]?[jt]sx?|sql|json|ya?ml)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
};

export const scanSourceContent = (
  relativeFile: string,
  content: string,
): SecurityViolation[] => {
  const violations: SecurityViolation[] = [];
  const isTest = isTestOrStoryFile(relativeFile);
  const isSecurityCheckSelf =
    relativeFile.replace(/\\/g, "/") === "scripts/security-check.ts";
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    for (const pattern of SECRET_PATTERNS) {
      if (!isSecurityCheckSelf && pattern.regex.test(line)) {
        violations.push({
          rule: pattern.rule,
          file: relativeFile,
          line: lineNumber,
          message: pattern.message,
        });
      }
    }

    if (!isTest && !isSecurityCheckSelf && /\.[cm]?[jt]sx?$/i.test(relativeFile)) {
      for (const pattern of CODE_EXECUTION_PATTERNS) {
        if (pattern.regex.test(line)) {
          violations.push({
            rule: pattern.rule,
            file: relativeFile,
            line: lineNumber,
            message: pattern.message,
          });
        }
      }
    }
  });

  return violations;
};

const verifyArchitecturalGuardrails = (rootDir: string): SecurityViolation[] => {
  const violations: SecurityViolation[] = [];

  const requireFilePatterns = (
    relativeFile: string,
    checks: ReadonlyArray<{ rule: string; pattern: RegExp; message: string }>,
  ) => {
    const fullPath = path.join(rootDir, relativeFile);
    if (!fs.existsSync(fullPath)) {
      violations.push({
        rule: "missing-critical-security-file",
        file: relativeFile,
        message: `Required security-critical file '${relativeFile}' is missing.`,
      });
      return;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    for (const check of checks) {
      if (!check.pattern.test(content)) {
        violations.push({
          rule: check.rule,
          file: relativeFile,
          message: check.message,
        });
      }
    }
  };

  // 1. OTel Traces Proxy SSRF & DoS guardrails
  requireFilePatterns("app/api/otel/v1/traces/route.ts", [
    {
      rule: "otel-ssrf-hardcoded-endpoint",
      pattern: /HONEYCOMB_TRACES_ENDPOINT\s*=\s*["']https:\/\/api\.honeycomb\.io\/v1\/traces["']/,
      message: "OTel proxy must hardcode https://api.honeycomb.io/v1/traces to prevent SSRF.",
    },
    {
      rule: "otel-rate-limit-enforced",
      pattern: /\bcheckOtelRateLimit\s*\(/,
      message: "OTel proxy must enforce checkOtelRateLimit.",
    },
    {
      rule: "otel-payload-cap-enforced",
      pattern: /\bMAX_PAYLOAD_BYTES\b/,
      message: "OTel proxy must enforce MAX_PAYLOAD_BYTES streaming payload cap.",
    },
  ]);

  // 2. AI Receipt Extraction route guardrails
  requireFilePatterns("app/api/extract/route.ts", [
    {
      rule: "extract-rate-limit-enforced",
      pattern: /\bcheckReceiptExtractionRateLimit\s*\(/,
      message: "/api/extract must enforce checkReceiptExtractionRateLimit.",
    },
    {
      rule: "extract-streaming-body-cap",
      pattern: /\bparseBoundedFormData\s*\(/,
      message: "/api/extract must enforce streaming multipart payload size limits.",
    },
    {
      rule: "extract-system-instruction-separation",
      pattern: /\bsystemInstruction\s*:\s*buildReceiptSystemInstruction\s*\(\)/,
      message: "/api/extract must pass buildReceiptSystemInstruction() as a dedicated systemInstruction.",
    },
    {
      rule: "extract-constrained-json-schema",
      pattern: /\bresponseJsonSchema\s*:\s*receiptItemsJsonSchema\.schema\b/,
      message: "/api/extract must enforce constrained JSON schema decoding.",
    },
  ]);

  // 3. Receipt AI prompt & post-inference sanitization guardrails
  requireFilePatterns("lib/receipt.ts", [
    {
      rule: "receipt-post-inference-sanitization",
      pattern: /\bsanitizeExtractedItemName\s*\(/,
      message: "lib/receipt.ts must sanitize extracted item names via sanitizeExtractedItemName.",
    },
    {
      rule: "receipt-pii-prompt-guardrail",
      pattern: /Do not extract credit card numbers,\s*PANs,\s*CVVs/i,
      message: "lib/receipt.ts prompt must explicitly prohibit PAN/CVV extraction.",
    },
  ]);

  // 4. Security sanitizer PII redaction & prompt injection defenses
  requireFilePatterns("lib/security-sanitizer.ts", [
    {
      rule: "sanitizer-financial-pii-redaction",
      pattern: /\bredactFinancialPii\b/,
      message: "lib/security-sanitizer.ts must export redactFinancialPii for deterministic PAN/CVV redaction.",
    },
    {
      rule: "sanitizer-invisible-unicode-strip",
      pattern: /\bstripInvisibleCharacters\b/,
      message: "lib/security-sanitizer.ts must export stripInvisibleCharacters.",
    },
  ]);

  // 5. MCP endpoint & server guardrails
  requireFilePatterns("app/api/mcp/messages/route.ts", [
    {
      rule: "mcp-payload-cap-enforced",
      pattern: /\bMAX_MCP_PAYLOAD_BYTES\b/,
      message: "/api/mcp/messages must enforce MAX_MCP_PAYLOAD_BYTES streaming body cap.",
    },
    {
      rule: "mcp-rate-limit-enforced",
      pattern: /\bcheckMcpRateLimit\s*\(/,
      message: "/api/mcp/messages must enforce checkMcpRateLimit.",
    },
  ]);

  requireFilePatterns("lib/mcp-server.ts", [
    {
      rule: "mcp-null-prototype-accumulator",
      pattern: /Object\.create\(null\)/,
      message: "lib/mcp-server.ts must use Object.create(null) for category aggregation to prevent prototype pollution.",
    },
  ]);

  // 6. Auth registration & timing-safe password verification
  requireFilePatterns("app/api/auth/register/route.ts", [
    {
      rule: "register-rate-limit-enforced",
      pattern: /\bcheckRegisterRateLimit\s*\(/,
      message: "/api/auth/register must enforce checkRegisterRateLimit.",
    },
  ]);

  requireFilePatterns("lib/auth-passwords.ts", [
    {
      rule: "auth-timing-safe-compare",
      pattern: /\btimingSafeEqual\s*\(/,
      message: "lib/auth-passwords.ts must verify password digests with crypto.timingSafeEqual.",
    },
  ]);

  // 7. Next.js security headers
  requireFilePatterns("next.config.ts", [
    {
      rule: "next-frame-options-deny",
      pattern: /X-Frame-Options[\s\S]*?DENY/,
      message: "next.config.ts must enforce X-Frame-Options: DENY.",
    },
    {
      rule: "next-content-type-options-nosniff",
      pattern: /X-Content-Type-Options[\s\S]*?nosniff/,
      message: "next.config.ts must enforce X-Content-Type-Options: nosniff.",
    },
  ]);

  // 8. Supabase RLS & security definer search_path guardrails
  requireFilePatterns(
    "supabase/migrations/202611120001_optimize_indexes_and_rls_initplan.sql",
    [
      {
        rule: "supabase-force-rls",
        pattern: /alter table public\.user_credentials force row level security;/i,
        message: "Supabase migrations must enforce FORCE ROW LEVEL SECURITY on public.user_credentials.",
      },
      {
        rule: "supabase-security-definer-search-path",
        pattern: /set search_path = public, pg_temp/i,
        message: "Supabase security definer functions must pin search_path = public, pg_temp.",
      },
    ],
  );

  return violations;
};

export const runSecurityAudit = (
  rootDir = process.cwd(),
): SecurityAuditReport => {
  const violations: SecurityViolation[] = [];
  let scannedFiles = 0;

  for (const dirName of SOURCE_DIRECTORIES) {
    const dirPath = path.join(rootDir, dirName);
    const files = collectFiles(dirPath);

    for (const filePath of files) {
      scannedFiles += 1;
      const relativeFile = path.relative(rootDir, filePath).replace(/\\/g, "/");
      const content = fs.readFileSync(filePath, "utf8");
      violations.push(...scanSourceContent(relativeFile, content));
    }
  }

  violations.push(...verifyArchitecturalGuardrails(rootDir));

  return {
    passed: violations.length === 0,
    scannedFiles,
    violations,
  };
};

const isDirectExecution = (): boolean => {
  if (!process.argv[1]) {
    return false;
  }
  const scriptPath = path.resolve(fileURLToPath(import.meta.url));
  const invokedPath = path.resolve(process.argv[1]);
  return scriptPath === invokedPath;
};

if (isDirectExecution()) {
  const report = runSecurityAudit();
  if (!report.passed) {
    console.error(
      `[security:check] FAILED with ${report.violations.length} violation(s) across ${report.scannedFiles} files:`,
    );
    for (const v of report.violations) {
      const location = v.line ? `${v.file}:${v.line}` : v.file;
      console.error(`  - [${v.rule}] ${location}: ${v.message}`);
    }
    process.exit(1);
  }

  console.info(
    `[security:check] PASSED (${report.scannedFiles} files audited, 0 security violations).`,
  );
}
