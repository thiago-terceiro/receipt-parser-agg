/**
 * Defensive Security Module: Indirect Prompt Injection & Payload Sanitization.
 *
 * Protects LLMs, multimodal OCR pipelines, and web rendering from adversarial
 * prompt injections, zero-width unicode smuggling, and DOM-based attacks.
 */

// Invisible / zero-width characters frequently used to conceal jailbreak tokens
const INVISIBLE_UNICODE_REGEX =
  /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u2060\u2061\u2062\u2063\u2064\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

// Credit card Primary Account Number (PAN) candidates (13-19 digits with optional spaces or hyphens)
const PAN_CANDIDATE_REGEX = /\b\d(?:[ -]?\d){12,18}\b/g;

// Explicit CVV / CVC / CID security code labels followed by 3-4 digits
const CVV_LABEL_REGEX = /\b(?:cvv2?|cvc2?|cid)\s*[:#=-]?\s*\d{3,4}\b/gi;

export const MAX_EXTRACTED_ITEM_NAME_LENGTH = 200;

// Common signatures and instruction-override delimiters for indirect prompt injections
const PROMPT_INJECTION_SIGNATURES: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules|directives)/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules|directives)/i,
  /system\s*:\s*(?:you\s+are|override|new\s+instructions)/i,
  /<\|(?:im_start|im_end|system|user|assistant)\|>/i,
  /\[(?:INST|\/INST|SYS|\/SYS)\]/i,
  /```(?:system|admin|override)/i,
  /forget\s+(?:everything\s+)?(?:you\s+(?:know|were\s+told))/i,
  /bypass\s+(?:all\s+)?(?:safety|content|policy)\s+guidelines/i,
];

/**
 * Strips zero-width characters, non-printable control characters,
 * and dangerous unicode smugglers from raw input.
 */
export const stripInvisibleCharacters = (text: string): string => {
  if (!text) return "";
  return text.replace(INVISIBLE_UNICODE_REGEX, "");
};

/**
 * Checks whether the text contains patterns resembling indirect prompt injections.
 */
export const containsPromptInjectionSignatures = (text: string): boolean => {
  if (!text) return false;
  const cleaned = stripInvisibleCharacters(text);
  return PROMPT_INJECTION_SIGNATURES.some((pattern) => pattern.test(cleaned));
};

/**
 * Deterministically redacts credit card Primary Account Numbers (PANs, 13-19 digits)
 * and explicit CVV/CVC security codes from model output strings.
 */
export const redactFinancialPii = (text: string): string => {
  if (!text) return "";

  const withoutCvv = text.replace(CVV_LABEL_REGEX, "[REDACTED-CVV]");

  return withoutCvv.replace(PAN_CANDIDATE_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, "");
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      return "[REDACTED-PAN]";
    }
    return match;
  });
};

/**
 * Neutralizes prompt injection strings by disarming markdown code fences,
 * system instruction tokens, and control characters.
 */
export const sanitizeUntrustedTextForLlm = (text: string): string => {
  if (!text) return "";

  // 1. Strip invisible/control characters
  let sanitized = stripInvisibleCharacters(text);

  // 2. Disarm code fence delimiters
  sanitized = sanitized.replace(/```/g, "'''");

  // 3. Disarm common chat template markers
  sanitized = sanitized
    .replace(/<\|/g, "&lt;|")
    .replace(/\|>/g, "|&gt;")
    .replace(/\[INST\]/gi, "(INST)")
    .replace(/\[\/INST\]/gi, "(/INST)")
    .replace(/\[SYS\]/gi, "(SYS)")
    .replace(/\[\/SYS\]/gi, "(/SYS)");

  return sanitized.trim();
};

/**
 * Post-inference sanitizer for extracted receipt item names.
 * Strips invisible characters, disarms injection markers, redacts financial PII,
 * normalizes whitespace, and enforces a strict maximum character length.
 */
export const sanitizeExtractedItemName = (
  text: string,
  maxLength = MAX_EXTRACTED_ITEM_NAME_LENGTH,
): string => {
  if (!text) return "";

  const disarmed = sanitizeUntrustedTextForLlm(text);
  const redacted = redactFinancialPii(disarmed);
  const collapsed = redacted.replace(/\s+/g, " ").trim();

  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return collapsed.slice(0, maxLength).trim();
};

/**
 * Wraps untrusted user content in a strict XML demarcation boundary
 * to inform the LLM that enclosed text is strictly data, not instructions.
 */
export const wrapInUntrustedXmlBoundary = (
  tag: string,
  content: string,
): string => {
  const safeTag = tag.replace(/[^a-zA-Z0-9_-]/g, "");
  const sanitizedContent = sanitizeUntrustedTextForLlm(content);
  return `<untrusted_${safeTag}>\n${sanitizedContent}\n</untrusted_${safeTag}>`;
};
