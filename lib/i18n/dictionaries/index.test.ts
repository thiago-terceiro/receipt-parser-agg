import fs from "node:fs";
import path from "node:path";

import {
  loadLocaleMessages,
  pickMessageNamespaces,
  routeMessageNamespaces,
} from "./index";

const collectReferencedNamespaces = (relativeDir: string): Set<string> => {
  const rootDir = path.resolve(process.cwd(), relativeDir);
  const namespaces = new Set<string>();

  const walk = (currentDir: string) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (
        (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) ||
        entry.name.includes(".test.")
      ) {
        continue;
      }
      const source = fs.readFileSync(fullPath, "utf8");
      for (const match of source.matchAll(/\btranslations\.([a-zA-Z0-9_]+)/g)) {
        namespaces.add(match[1]);
      }
    }
  };

  walk(rootDir);
  return namespaces;
};

describe("i18n dictionaries", () => {
  it("loads only the requested locale dictionary", async () => {
    const [en, es, ptBR] = await Promise.all([
      loadLocaleMessages("en"),
      loadLocaleMessages("es"),
      loadLocaleMessages("pt-BR"),
    ]);

    expect(en.common.language).toBe("Language");
    expect(es.common.language).toBe("Idioma");
    expect(ptBR.common.language).toBe("Idioma");
    expect(ptBR.auth.signOut).not.toBe(es.auth.signOut);
  });

  it("picks only the specified namespaces for route-scoped client providers", async () => {
    const en = await loadLocaleMessages("en");
    const picked = pickMessageNamespaces(en, ["common", "invite"]);

    expect(Object.keys(picked)).toEqual(["common", "invite"]);
    expect(picked.common).toBe(en.common);
    expect(picked.invite).toBe(en.invite);
    expect("receipt" in picked).toBe(false);
    expect("groceries" in picked).toBe(false);
  });

  it("includes every namespace accessed by each route's client components", () => {
    const componentNamespaces = collectReferencedNamespaces("components");
    const homeNamespaces = collectReferencedNamespaces("contents/home");
    const groceriesNamespaces = collectReferencedNamespaces(
      "contents/groceries-dashboard",
    );
    const inviteNamespaces = collectReferencedNamespaces("contents/invite");

    for (const ns of componentNamespaces) {
      expect(routeMessageNamespaces.layout).toContain(ns);
      expect(routeMessageNamespaces.invite).toContain(ns);
    }
    for (const ns of homeNamespaces) {
      expect(routeMessageNamespaces.home).toContain(ns);
    }
    for (const ns of groceriesNamespaces) {
      expect(routeMessageNamespaces.groceries).toContain(ns);
    }
    for (const ns of inviteNamespaces) {
      expect(routeMessageNamespaces.invite).toContain(ns);
    }
  });
});
