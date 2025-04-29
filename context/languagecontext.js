import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import your translation files
import en from '../assets/locale/en.json';
import hi from '../assets/locale/hi.json';


// Create translations object
const translationsMap = {
  en,
  hi,

};
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  const [translations, setTranslations] = useState(en);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with stored language or device language
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // Try to get stored language
        const storedLanguage = await AsyncStorage.getItem('appLanguage');
        
        // If no stored language, use device language or default to English
        const deviceLanguage = Localization.locale.split('-')[0];
        const initialLanguage = storedLanguage || 
                               (translationsMap[deviceLanguage] ? deviceLanguage : 'en');
        
        changeLanguage(initialLanguage);
      } catch (error) {
        console.error('Error loading language:', error);
        changeLanguage('en'); // Fallback to English
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Function to change the language
  const changeLanguage = async (langCode) => {
    try {
      // Check if the language is supported
      if (translationsMap[langCode]) {
        setLocale(langCode);
        setTranslations(translationsMap[langCode]);
        await AsyncStorage.setItem('appLanguage', langCode);
        console.log(`Language successfully changed to: ${langCode}`);
      } else {
        console.error(`Language code ${langCode} not supported`);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Translate function
  const t = (key) => {
    // Split the key by dots to access nested properties
    const keys = key.split('.');
    let result = translations;
    
    // Navigate through the nested objects
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key itself as fallback
      }
    }
    
    return result;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};