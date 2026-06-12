import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';

interface DotLoaderProps {
  color?: string;
  size?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function DotLoader({ color = '#6C47FF', size = 8, gap = 6, style }: DotLoaderProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (val: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createAnim(dot1, 0);
    const anim2 = createAnim(dot2, 150);
    const anim3 = createAnim(dot3, 300);

    Animated.parallel([anim1, anim2, anim3]).start();

    return () => {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [dot1, dot2, dot3]);

  const getStyle = (val: Animated.Value) => {
    const scale = val.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1.2],
    });
    const opacity = val.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });
    const translateY = val.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -4],
    });
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      marginHorizontal: gap / 2,
      transform: [{ scale }, { translateY }],
      opacity,
    };
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={getStyle(dot1)} />
      <Animated.View style={getStyle(dot2)} />
      <Animated.View style={getStyle(dot3)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
