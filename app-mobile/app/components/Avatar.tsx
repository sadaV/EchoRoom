import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PERSONA_EMOJI, PERSONA_COLORS } from '../constants/personas';
import { theme } from '../theme';

interface AvatarProps {
  name: string;
  size?: number;
}

export default function Avatar({ name, size = 40 }: AvatarProps) {
  // TODO: Check for Lottie JSON at app/assets/avatars/${name}.json
  // For now, we'll use the fallback chip implementation
  // When lottie-react-native is available, this would be:
  // const lottieSource = require(`../assets/avatars/${name}.json`);
  // if (lottieSource exists) return <LottieView source={lottieSource} autoPlay loop />;
  
  const backgroundColor = PERSONA_COLORS[name] || theme.colors.accent;
  const emoji = PERSONA_EMOJI[name];
  const displayText = emoji || name.charAt(0).toUpperCase();
  
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: emoji ? size * 0.5 : size * 0.4,
            color: theme.colors.text,
          },
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});