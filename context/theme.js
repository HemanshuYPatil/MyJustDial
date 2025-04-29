import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define your theme colors
const lightTheme = {
  background: '#FFFFFF',
  text: '#333333',
  primary: '#2d6cdf',
  secondary: '#e0e0e0',
  card: '#F5F5F5',
  border: '#DDDDDD',
};

const darkTheme = {
  background: '#121212',
  text: '#FFFFFF',
  primary: '#4D8DF6',
  secondary: '#2A2A2A',
  card: '#1E1E1E',
  border: '#333333',
};

// Create the context
const ThemeContext = createContext();

// Storage key
const THEME_PREFERENCE_KEY = '@theme_preference';

// Provider component
export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get initial theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // If no saved preference, use device theme
          setIsDarkMode(deviceTheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThemePreference();
  }, [deviceTheme]);

  // Save theme preference when it changes
  useEffect(() => {
    if (!isLoading) {
      const saveThemePreference = async () => {
        try {
          await AsyncStorage.setItem(
            THEME_PREFERENCE_KEY, 
            isDarkMode ? 'dark' : 'light'
          );
        } catch (error) {
          console.error('Failed to save theme preference:', error);
        }
      };
      
      saveThemePreference();
    }
  }, [isDarkMode, isLoading]);

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // Current theme colors
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};