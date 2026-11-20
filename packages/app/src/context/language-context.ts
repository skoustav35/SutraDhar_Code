import type { Flatten } from "@solid-primitives/i18n"
import type { UiI18nPluralKey } from "@sutradhar/ui/context/i18n"
import type { dict as uiEn } from "@sutradhar/ui/i18n/en"
import { createContext, useContext, type Accessor } from "solid-js"
import type { dict as en } from "@/i18n/en"
import type { DesktopNativeLocale } from "@/i18n/desktop-native"

export type Locale = DesktopNativeLocale
export type Direction = "ltr" | "rtl"

type RawDictionary = typeof en & typeof uiEn
export type Dictionary = Flatten<RawDictionary>
export type PluralKey =
  | UiI18nPluralKey
  | "session.question.pending"
  | "session.followupDock.summary"
  | "session.revertDock.summary"

export type LanguageContextValue = {
  ready: Accessor<boolean>
  locale: Accessor<Locale>
  intl: Accessor<string>
  direction: Accessor<Direction>
  layoutLocale: Accessor<string>
  locales: readonly Locale[]
  label: (value: Locale) => string
  t: (key: keyof Dictionary, params?: Record<string, string | number | boolean>) => string
  plural: (key: PluralKey, count: number, params?: Record<string, string | number | boolean>) => string
  setLocale: (next: Locale) => void
  setDirection: (next: Direction) => void
}

// Keep the context in its own module. Dictionary modules are edited often, and
// if this context were recreated by an HMR update every consumer that refreshed
// alongside it would read a different context than the mounted provider.
const Context = createContext<LanguageContextValue>()

export function useLanguage() {
  const value = useContext(Context)
  if (!value) throw new Error("Language context must be used within a context provider")
  return value
}

export const LanguageContext = Context
