import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import az from "./locales/az.json";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

const STORAGE_KEY = "inop-language";

const supportedLanguages = ["az", "en", "ru"] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];

const savedLanguage = localStorage.getItem(STORAGE_KEY);

const initialLanguage: SupportedLanguage =
  savedLanguage && supportedLanguages.includes(savedLanguage as SupportedLanguage)
    ? (savedLanguage as SupportedLanguage)
    : "az";

void i18n.use(initReactI18next).init({
  resources: {
    az: { translation: az },
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(language: SupportedLanguage) {
  localStorage.setItem(STORAGE_KEY, language);
  void i18n.changeLanguage(language);
}

export default i18n;
