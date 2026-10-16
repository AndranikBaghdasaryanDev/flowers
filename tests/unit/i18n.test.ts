import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, localizePath, negotiateLocale, stripLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { createTranslator } from "@/i18n/translate";

type Node = string | { [key: string]: Node };

/** Flattens a dictionary into dot-path → leaf (plural objects count as leaves). */
function flatten(node: Node, prefix = "", out = new Map<string, Node>()): Map<string, Node> {
  if (typeof node === "string" || "other" in node) {
    out.set(prefix, node);
    return out;
  }
  for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const placeholders = (leaf: Node) =>
  [...new Set(JSON.stringify(leaf).match(/\{\w+\}/g) ?? [])].sort();
const tags = (leaf: Node) => [...new Set(JSON.stringify(leaf).match(/<\/?\w+>/g) ?? [])].sort();

const en = flatten(messages.en as unknown as Node);

describe("dictionaries", () => {
  for (const locale of LOCALES) {
    const dict = flatten(messages[locale] as unknown as Node);

    it(`${locale} has exactly the English keys`, () => {
      expect([...dict.keys()].filter((k) => !en.has(k))).toEqual([]);
      expect([...en.keys()].filter((k) => !dict.has(k))).toEqual([]);
    });

    it(`${locale} keeps placeholders and markup tags`, () => {
      const mismatched = [...en.entries()]
        .filter(([k, v]) => {
          const other = dict.get(k);
          if (other === undefined) return false;
          return placeholders(other).join() !== placeholders(v).join() || tags(other).join() !== tags(v).join();
        })
        .map(([k]) => k);
      expect(mismatched).toEqual([]);
    });

    it(`${locale} has no empty strings and covers its plural categories`, () => {
      const rules = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
      const problems: string[] = [];
      for (const [k, v] of dict) {
        if (typeof v === "string") {
          if (!v.trim()) problems.push(`${k}: empty`);
        } else {
          for (const cat of rules) if (cat !== "zero" && cat !== "two" && !(cat in v) && cat !== "other") problems.push(`${k}: missing ${cat}`);
        }
      }
      expect(problems).toEqual([]);
    });
  }

  it("every literal key used in the source exists in English", () => {
    const root = path.resolve(__dirname, "../../src");
    const missing = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "messages") walk(full);
        } else if (/\.tsx?$/.test(entry.name)) {
          const src = fs.readFileSync(full, "utf8");
          for (const m of src.matchAll(/\bt(?:r)?(?:\.rich)?\(\s*"([a-z][\w]*(?:\.[\w]+)+)"/g)) {
            if (!en.has(m[1])) missing.add(`${m[1]} (${path.relative(root, full)})`);
          }
        }
      }
    };
    walk(root);
    expect([...missing]).toEqual([]);
  });
});

describe("translator", () => {
  it("interpolates, pluralises and falls back", () => {
    const t = createTranslator("ru", { a: { n: { one: "{count} цветок", few: "{count} цветка", many: "{count} цветов", other: "{count} цветка" }, hi: "Привет, {name}" } });
    expect(t("a.hi" as never, { name: "Анна" })).toBe("Привет, Анна");
    expect(t("a.n" as never, { count: 1 })).toBe("1 цветок");
    expect(t("a.n" as never, { count: 3 })).toBe("3 цветка");
    expect(t("a.n" as never, { count: 5 })).toBe("5 цветов");
    expect(t.dynamic("a.missing", undefined, "fallback")).toBe("fallback");
  });
});

describe("locale routing helpers", () => {
  it("negotiates, localizes and strips paths", () => {
    expect(negotiateLocale("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(negotiateLocale("de-DE")).toBe("hy");
    expect(negotiateLocale(null)).toBe("hy");
    expect(localizePath("/shop?x=1", "en")).toBe("/en/shop?x=1");
    expect(localizePath("/", "ru")).toBe("/ru");
    expect(localizePath("/admin", "en")).toBe("/admin");
    expect(stripLocale("/hy/products/rose")).toBe("/products/rose");
    expect(stripLocale("/en")).toBe("/");
  });
});
