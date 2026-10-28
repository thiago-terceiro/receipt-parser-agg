import robots from "./robots";

describe("app/robots.ts", () => {
  it("returns decoupled AI robots configuration", () => {
    const result = robots();

    expect(result.sitemap).toBe("https://receipt-parser-agg.vercel.app/sitemap.xml");

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules.length).toBeGreaterThanOrEqual(3);

    // Verify training crawlers are disallowed
    const trainingRule = rules.find(
      (r) => Array.isArray(r.userAgent) && r.userAgent.includes("GPTBot"),
    );
    expect(trainingRule).toBeDefined();
    expect(trainingRule?.disallow).toContain("/");

    // Verify search and citation engines are allowed
    const searchRule = rules.find(
      (r) => Array.isArray(r.userAgent) && r.userAgent.includes("OAI-SearchBot"),
    );
    expect(searchRule).toBeDefined();
    expect(searchRule?.allow).toContain("/");
    expect(searchRule?.disallow).toContain("/api/");
  });
});
