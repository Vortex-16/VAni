import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { 
  Path, 
  Defs, 
  LinearGradient, 
  Stop, 
  Mask, 
  Rect, 
  Circle,
  Ellipse,
  G
} from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  useSharedValue, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing,
  interpolate,
  DerivedValue,
  useDerivedValue,
  withDelay
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

interface LiquidCapsuleProps {
  progress: number; // 0 to 1
  colorStart?: string;
  colorEnd?: string;
  size?: number;
}

export const LiquidCapsuleProgress: React.FC<LiquidCapsuleProps> = ({ 
  progress, 
  colorStart = '#4FA3A5', 
  colorEnd = '#7ED4D6',
  size = 200 
}) => {
  const width = size * 0.5;
  const height = size;
  const capsuleRadius = width / 2;
  
  const waveOffset = useSharedValue(0);
  const fillLevel = useSharedValue(0);

  useEffect(() => {
    waveOffset.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    fillLevel.value = withTiming(progress, { duration: 1000, easing: Easing.out(Easing.exp) });
  }, [progress]);

  const animatedWaveProps = useAnimatedProps(() => {
    const p = fillLevel.value;
    const amplitude = 5 * Math.sin(waveOffset.value);
    const y = height - (p * height);
    
    // Create a wave path
    let d = `M 0 ${y} `;
    for (let x = 0; x <= width; x += 1) {
      const waveY = y + 4 * Math.sin((x / width) * 2 * Math.PI + waveOffset.value);
      d += `L ${x} ${waveY} `;
    }
    d += `L ${width} ${height} L 0 ${height} Z`;
    
    return { d };
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colorEnd} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={colorStart} stopOpacity="1" />
          </LinearGradient>
          
          <LinearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <Stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </LinearGradient>

          <Mask id="capsuleMask">
            <Rect 
              x="0" 
              y="0" 
              width={width} 
              height={height} 
              rx={capsuleRadius} 
              fill="white" 
            />
          </Mask>
        </Defs>

        {/* Outer Glass Container */}
        <Rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx={capsuleRadius}
          fill="rgba(255, 255, 255, 0.15)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
        />

        {/* Liquid with Wave */}
        <G mask="url(#capsuleMask)">
          <AnimatedPath
            animatedProps={animatedWaveProps}
            fill="url(#liquidGradient)"
          />
          
          {/* Subtle surface highlight on liquid */}
          <AnimatedPath
            animatedProps={animatedWaveProps}
            fill="rgba(255,255,255,0.2)"
            transform="translate(0, -2)"
          />
        </G>

        {/* Inner Glass Highlights (Reflections) */}
        <Rect
          x={width * 0.15}
          y={height * 0.1}
          width={width * 0.1}
          height={height * 0.8}
          rx={width * 0.05}
          fill="rgba(255, 255, 255, 0.2)"
        />
        
        <Rect
          x={width * 0.8}
          y={height * 0.2}
          width={width * 0.05}
          height={height * 0.6}
          rx={width * 0.025}
          fill="rgba(255, 255, 255, 0.1)"
        />

        {/* Top Shine */}
        <Ellipse
          cx={width / 2}
          cy={height * 0.15}
          rx={width * 0.3}
          ry={height * 0.05}
          fill="rgba(255, 255, 255, 0.2)"
        />
      </Svg>
      
      {/* Progress Text */}
      <Animated.Text style={styles.percentageText}>
        {/* We'll handle text update in a parent or via useDerivedValue if needed, but for simplicity: */}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  percentageText: {
    position: 'absolute',
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  }
});
