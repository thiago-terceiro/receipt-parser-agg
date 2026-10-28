import React from "react";

export interface JsonLdProps {
  locale?: string;
  baseUrl?: string;
}

export const getStackedJsonLd = (baseUrl = "https://receipt-parser-agg.vercel.app") => {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "Receipt Parser & Aggregator AI",
        "url": baseUrl,
        "description":
          "AI-first multimodal receipt extraction and collaborative household grocery budgeting platform.",
        "sameAs": ["https://github.com/thiago-terceiro/receipt-parser-agg"],
      },
      {
        "@type": "WebApplication",
        "@id": `${baseUrl}/#webapp`,
        "name": "Receipt Parser & Aggregator AI",
        "url": baseUrl,
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "All modern browsers (Chrome, Firefox, Safari, Edge)",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
        },
        "featureList": [
          "Multimodal Receipt OCR powered by Google Gemini 3.8 Flash",
          "Multi-page PDF and image extraction (PNG, JPEG, WebP)",
          "Structured line item extraction (price, quantity, category, tax)",
          "Shared collaborative grocery budgeting boards with RLS security",
          "Model Context Protocol (MCP) agent support",
        ],
        "creator": {
          "@id": `${baseUrl}/#organization`,
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does Receipt Parser AI extract line items from receipts?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Receipt Parser AI uses Google Gemini 3.8 Flash multimodal vision models to analyze scanned receipt images or PDFs and output structured JSON containing item names, prices, quantities, and expense categories.",
            },
          },
          {
            "@type": "Question",
            "name": "Does Receipt Parser AI extract or store credit card details?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "No. The extraction schema and system prompts strictly prohibit the extraction, logging, or persistence of Primary Account Numbers (PANs), CVVs, cardholder names, or personal banking identifiers.",
            },
          },
          {
            "@type": "Question",
            "name": "Can multiple people collaborate on the same grocery board?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. Shared boards allow household members, roommates, or partners to join via secure cryptographic invite links to view, edit, and track shared grocery expenses in real time.",
            },
          },
        ],
      },
    ],
  };
};

export function JsonLd({ baseUrl = "https://receipt-parser-agg.vercel.app" }: JsonLdProps) {
  const schemaGraph = getStackedJsonLd(baseUrl);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
    />
  );
}
