export const theme = {
  colors: {
    bg: '#ffffff',
    card: '#f3f6ff',
    text: '#0b1220',
    subtext: '#4b5563',
    border: '#e6e9f5',
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    success: '#16a34a',
    warn: '#f59e0b',
    bubble: '#7c3aed'
  },
  radius: { 
    sm: 10, 
    md: 14, 
    lg: 18, 
    xl: 24 
  },
  spacing: { 
    xs: 6, 
    sm: 10, 
    md: 14, 
    lg: 18 
  },
  shadows: {}
};

export type Theme = typeof theme;