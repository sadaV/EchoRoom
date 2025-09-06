import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { PERSONA_COLORS } from '../constants/personas';
import { theme } from '../theme';

interface HeaderGradientProps {
  persona?: string;
  height?: number;
}

export default function HeaderGradient({ persona, height = 90 }: HeaderGradientProps) {
  const personaColor = persona ? PERSONA_COLORS[persona] : null;
  const colors = personaColor 
    ? [personaColor + '40', theme.colors.bg + '80', theme.colors.bg]
    : [theme.colors.accent + '40', theme.colors.bg + '80', theme.colors.bg];
  
  return (
    <LinearGradient
      colors={colors}
      style={{
        height,
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1,
      }}
      locations={[0, 0.6, 1]}
    />
  );
}