import type { Locale } from "@/i18n/config";
import type { DeepMessages } from "@/i18n/translate";
import { en } from "./en";
import { hy } from "./hy";
import { ru } from "./ru";

/** Every locale provides the English keys; plural entries may use any CLDR categories. */
export type Messages = DeepMessages<typeof en>;

export const messages: Record<Locale, Messages> = { hy, en, ru };
