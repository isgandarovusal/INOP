import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import az from "./locales/az.json";

const LANGUAGE_KEY = "inop_language";

const supportedLanguages = ["az", "en", "ru"] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];

const languageLoaders = {
  en: () => import("./locales/en.json"),
  ru: () => import("./locales/ru.json"),
};

void i18n.use(initReactI18next).init({
  resources: {
    az: {
      translation: az,
    },
  },
  lng: "az",
  fallbackLng: "az",
  interpolation: {
    escapeValue: false,
  },
});

export async function changeLanguage(language: string) {
  const normalized = language.split("-")[0] as SupportedLanguage;

  if (!supportedLanguages.includes(normalized)) {
    return;
  }

  if (normalized !== "az" && !i18n.hasResourceBundle(normalized, "translation")) {
    const module = await languageLoaders[normalized]();

    i18n.addResourceBundle(
      normalized,
      "translation",
      module.default,
      true,
      true,
    );
  }

  localStorage.setItem(LANGUAGE_KEY, normalized);
  await i18n.changeLanguage(normalized);
}

const savedLanguage = localStorage.getItem(LANGUAGE_KEY);

if (savedLanguage && savedLanguage !== "az") {
  void changeLanguage(savedLanguage);
}

export default i18n;
