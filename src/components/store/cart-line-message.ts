import type { Translator } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages";
import type { QuoteLineDTO } from "@/lib/types";

/** Customer-facing explanation of a cart line problem, in the active language. */
export function cartLineMessage(t: Translator<Messages>, line: Pick<QuoteLineDTO, "status" | "maxQuantity">): string {
  switch (line.status) {
    case "unavailable":
      return t("cart.lineUnavailable");
    case "not_found":
      return t("cart.lineRemoved");
    case "quantity_reduced":
      return t("cart.lineReduced", { count: line.maxQuantity });
    default:
      return "";
  }
}
