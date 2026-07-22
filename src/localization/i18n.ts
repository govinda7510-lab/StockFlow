import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './translations/en.json';
import ur from './translations/ur.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', rtl: true },
];

const resources = {
  en: { translation: en },
  ur: { translation: ur },
};

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';
const defaultLang = SUPPORTED_LANGUAGES.find(l => l.code === deviceLocale)
  ? deviceLocale
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export const changeLanguage = async (lang: string): Promise<void> => {
  await i18n.changeLanguage(lang);
};

export const isRTL = (lang: string): boolean => {
  return SUPPORTED_LANGUAGES.find(l => l.code === lang)?.rtl ?? false;
};

export default i18n;
