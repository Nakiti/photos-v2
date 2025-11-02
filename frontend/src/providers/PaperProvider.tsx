import { useColorScheme } from "react-native";
import { PaperProvider as PaperProviderBase } from "react-native-paper";
import { useTheme } from "react-native-paper";
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const AxiomLightTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#005A9C',        // Axiom Blue (Confident, professional)
      onPrimary: '#FFFFFF',
      secondary: '#006A6A',      // Muted Teal (Complementary, calm)
      onSecondary: '#FFFFFF',
      tertiary: '#5F5F5F',       // Mid-Gray (For neutral actions)
      onTertiary: '#FFFFFF',
      background: '#F8F9FA',      // Clean Off-White
      surface: '#FFFFFF',         // Pure White
      onSurface: '#1B1B1B',       // Near Black
      onSurfaceVariant: '#6C757D', // Slate Gray (for secondary text)
      error: '#B00020',           // Standard Error Red
    },
  };

  const AxiomDarkTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: '#4DA9E9',        // Lighter Axiom Blue for contrast
      onPrimary: '#001D35',
      secondary: '#4DDAD9',      // Lighter Teal for contrast
      onSecondary: '#002020',
      tertiary: '#CACACA',       // Light Gray
      onTertiary: '#333333',
      background: '#121212',      // Standard Dark
      surface: '#1E1E1E',         // Elevated Surface
      onSurface: '#E1E1E1',       // Off-white text
      onSurfaceVariant: '#ADB5BD', // Lighter Slate Gray
      error: '#CF6679',           // Material Dark Error Red
    },
  };

export const PaperProvider = ({ children }: { children: React.ReactNode }) => {
    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? AxiomDarkTheme : AxiomLightTheme;
    
    return (
        <PaperProviderBase theme={theme}>
            {children}
        </PaperProviderBase>
    )
}