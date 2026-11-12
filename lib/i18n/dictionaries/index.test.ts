import { loadLocaleMessages, pickMessageNamespaces } from "./index";

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
});
