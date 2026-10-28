import { render } from "@testing-library/react";

import { getStackedJsonLd, JsonLd } from "./JsonLd";

describe("JsonLd", () => {
  it("generates stacked schema.org graph including Organization, WebApplication, and FAQPage", () => {
    const graph = getStackedJsonLd("https://receipt-parser-agg.vercel.app");

    expect(graph["@context"]).toBe("https://schema.org");
    expect(graph["@graph"]).toHaveLength(3);

    const types = graph["@graph"].map((node) => node["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebApplication");
    expect(types).toContain("FAQPage");
  });

  it("renders valid script tag in DOM", () => {
    const { container } = render(<JsonLd />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();
    const parsed = JSON.parse(script?.textContent || "{}");
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@graph"][1].name).toBe("Receipt Parser & Aggregator AI");
  });
});
