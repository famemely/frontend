import { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Custom hook for managing drawer slide animations
 * @param isOpen - Whether the drawer is open
 * @param drawerWidth - Width of the drawer (default: 280)
 * @returns Animated value and interpolated translateX value
 */
export function useDrawerAnimation(isOpen: boolean, drawerWidth: number = 280) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [isOpen, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  return {
    slideAnim,
    translateX,
  };
}
