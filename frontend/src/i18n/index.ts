import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files
import enTranslations from '../locales/en/translation.json';
import itTranslations from '../locales/it/translation.json';
import frTranslations from '../locales/fr/translation.json';
import deTranslations from '../locales/de/translation.json';

// Language resources
const resources = {
  en: {
    translation: enTranslations,
  },
  it: {
    translation: itTranslations,
  },
  fr: {
    translation: frTranslations,
  },
  de: {
    translation: deTranslations,
  },
};

// Language detection options
const detection = {
  // Order of language detection methods
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // Cache user language selection
  caches: ['localStorage'],
  
  // Don't use cookies for language detection
  excludeCacheFor: ['cimode'],
  
  // Language detection key for localStorage
  lookupLocalStorage: 'i18nextLng',
};

i18n
  // Language detection
  .use(LanguageDetector)
  // React integration
  .use(initReactI18next)
  // Initialize
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Supported languages
    supportedLngs: ['en', 'it', 'fr', 'de'],
    
    // Language detection
    detection,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],
    
    // React options
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Language information for the language selector
export const languages = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
  },
];

// Helper function to get current language info
export const getCurrentLanguage = () => {
  const currentLng = i18n.language || 'en';
  return languages.find(lang => lang.code === currentLng) || languages[0];
};

// Helper function to change language
export const changeLanguage = (languageCode: string) => {
  return i18n.changeLanguage(languageCode);
};
