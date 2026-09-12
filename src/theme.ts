import { createTheme, type CSSVariablesResolver } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 7, dark: 6 },
  colors: {
    brand: ['#fff0f3', '#ffdde4', '#fbb9c8', '#f38aa4', '#e95c82', '#db3566', '#c72154', '#a91645', '#8e163e', '#781737'],
    dark: ['#eef0f6', '#c6ccda', '#a5afc2', '#737f96', '#45516a', '#303b50', '#222c3e', '#192234', '#121a29', '#0e1522'],
  },
  fontFamily: "'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  headings: { fontFamily: "'Segoe UI', Inter, sans-serif", fontWeight: '700' },
  defaultRadius: 'md',
  fontSizes: { xs: '0.8125rem', sm: '0.9375rem', md: '1rem', lg: '1.125rem', xl: '1.375rem' },
  lineHeights: { xs: '1.5', sm: '1.6', md: '1.65', lg: '1.6', xl: '1.5' },
  components: {
    Button: { defaultProps: { size: 'md' } },
    ActionIcon: { defaultProps: { size: 'lg' } },
    Card: { defaultProps: { withBorder: true, radius: 'lg' } },
    TextInput: { defaultProps: { size: 'md' } },
    PasswordInput: { defaultProps: { size: 'md' } },
    Select: { defaultProps: { size: 'md' } },
    MultiSelect: { defaultProps: { size: 'md' } },
    Textarea: { defaultProps: { size: 'md' } },
    NumberInput: { defaultProps: { size: 'md' } },
    Table: { defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'md' } },
    NavLink: { defaultProps: { variant: 'light' } },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { '--mantine-color-text': '#243047', '--mantine-color-dimmed': '#5c677a', '--mantine-color-placeholder': '#667287' },
  dark: { '--mantine-color-text': '#eef0f6', '--mantine-color-dimmed': '#a5afc2', '--mantine-color-placeholder': '#a5afc2' },
});
