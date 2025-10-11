/**
 * EmojiIcon Component
 * Displays emojis with optional grayscale and greenish tint effect
 */

import React from 'react';
import { Text, TextStyle, StyleProp, View, Platform } from 'react-native';

interface EmojiIconProps {
  emoji: string;
  size?: number;
  style?: StyleProp<TextStyle>;
  grayscale?: boolean;
  tintColor?: string;
}

export default function EmojiIcon({
  emoji,
  size = 16,
  style,
  grayscale = true,
  tintColor = '#059669', // Default greenish tint
}: EmojiIconProps) {
  const baseStyle: TextStyle = {
    fontSize: size,
  };

  // Apply grayscale effect through opacity and color overlay
  const grayscaleStyle: TextStyle = grayscale
    ? {
        opacity: 0.6,
        // On some platforms, we can blend with tint color
        color: tintColor,
      }
    : {};

  return (
    <Text
      style={[
        baseStyle,
        grayscaleStyle,
        style,
      ]}
      // Prevent text selection
      selectable={false}
    >
      {emoji}
    </Text>
  );
}
