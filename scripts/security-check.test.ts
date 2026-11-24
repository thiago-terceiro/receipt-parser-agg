/**
 * @jest-environment node
 */

import { runSecurityAudit, scanSourceContent } from "./security-check";

describe("scripts/security-check", () => {
  it("passes full security and architectural audit on the repository", () => {
    const report = runSecurityAudit(process.cwd());
    expect(report.violations).toEqual([]);
    expect(report.passed).toBe(true);
    expect(report.scannedFiles).toBeGreaterThan(100);
  });

  it("detects hardcoded private keys, cloud tokens, and disabled TLS verification", () => {
    const fakeKeyHeader = ["-----BEGIN", "RSA PRIVATE KEY-----"].join(" ");
    const fakeAwsKey = ["AKIA", "1234567890ABCDEF"].join("");
    const fakeGoogleKey = ["AIza", "SyA1234567890abcdef1234567890abcdef"].join("");
    const fakeTlsDisable = ["NODE_TLS_REJECT_UNAUTHORIZED", ' = "0";'].join("");

    const violations = scanSourceContent(
      "lib/compromised.ts",
      [fakeKeyHeader, fakeAwsKey, fakeGoogleKey, fakeTlsDisable].join("\n"),
    );

    const rules = violations.map((v) => v.rule);
    expect(rules).toContain("private-key-header");
    expect(rules).toContain("aws-access-key");
    expect(rules).toContain("google-api-key");
    expect(rules).toContain("tls-verify-disabled");
  });

  it("detects unsafe dynamic code execution and unescaped HTML injection in production components", () => {
    const evalFn = ["ev", "al"].join("");
    const unescapedHtmlProp = ["dangerously", "SetInnerHTML"].join("");
    const badCode = [
      `const res = ${evalFn}(userInput);`,
      "const fn = new Function('a', 'return a');",
      `<div ${unescapedHtmlProp}={{ __html: raw }} />`,
    ].join("\n");

    const prodViolations = scanSourceContent("components/UnsafeView.tsx", badCode);
    expect(prodViolations.map((v) => v.rule)).toEqual([
      "unsafe-eval",
      "unsafe-eval",
      "unescaped-inner-html",
    ]);

    // Test files are allowed to reference patterns in test assertions
    const testViolations = scanSourceContent("components/UnsafeView.test.tsx", badCode);
    expect(testViolations).toEqual([]);
  });
});
