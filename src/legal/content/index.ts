import type { Locale } from "@/i18n/config";
import { ar } from "./ar";
import { en } from "./en";
import { fr } from "./fr";
import type { LegalContent } from "./types";

export const LEGAL_CONTENT: Record<Locale, LegalContent> = { fr, en, ar };
