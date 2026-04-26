import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const PURPLE = '#6C47FF';
const GRAY = '#94A3B8';

const CHIP_WIDTH = 90;
const GAP = 12;

export type TimeOfDay = 'morning' | 'early' | 'afternoon' | 'evening' | 'night';

interface FilterOption {
  id: TimeOfDay;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const OPTIONS: FilterOption[] = [
  { id: 'early', label: 'Early', icon: 'zap' },
  { id: 'morning', label: 'Morning', icon: 'sun' },
  { id: 'afternoon', label: 'Afternoon', icon: 'cloud' },
  { id: 'evening', label: 'Evening', icon: 'sunset' },
  { id: 'night', label: 'Night', icon: 'moon' },
];

interface TimeOfDayFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeOfDayFilter({ value, onChange }: TimeOfDayFilterProps) {
  const activeIndex = useSharedValue(0);

  useEffect(() => {
    const index = OPTIONS.findIndex(opt => 
      value.toLowerCase().includes(opt.id)
    );
    if (index !== -1) {
      activeIndex.value = withSpring(index, { damping: 15, stiffness: 100 });
    }
  }, [value]);

  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: activeIndex.value * (CHIP_WIDTH + GAP) }
      ],
    };
  });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Layer 1: Background Cards */}
        {OPTIONS.map((option) => (
          <View key={`bg-${option.id}`} style={styles.cardBg} />
        ))}

        {/* Layer 2: Animated Slider (Now in front of cards) */}
        <Animated.View style={[styles.slider, sliderStyle]} />

        {/* Layer 3: Content and Interactivity */}
        <View style={styles.contentLayer}>
          {OPTIONS.map((option, index) => {
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.7}
                onPress={() => onChange(option.label === 'Early' ? 'Early Morning' : option.label)}
                style={styles.chip}
              >
                <OptionContent 
                  option={option} 
                  index={index} 
                  activeIndex={activeIndex} 
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function OptionContent({ option, index, activeIndex }: { option: FilterOption, index: number, activeIndex: SharedValue<number> }) {
  const activeIconStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const activeProgress = Math.max(0, 1 - distance);
    return {
      opacity: activeProgress,
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    };
  });

  const inactiveIconStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const activeProgress = Math.max(0, 1 - distance);
    return {
      opacity: 1 - activeProgress,
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const activeProgress = Math.max(0, 1 - distance);
    return {
      color: interpolateColor(activeProgress, [0, 1], [GRAY, '#FFFFFF'])
    };
  });

  const innerBgStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const activeProgress = Math.max(0, 1 - distance);
    return {
      backgroundColor: interpolateColor(activeProgress, [0, 1], ['transparent', 'rgba(255, 255, 255, 0.25)'])
    };
  });

  return (
    <>
      <Animated.View style={[styles.iconContainer, innerBgStyle]}>
        <Animated.View style={inactiveIconStyle}>
          <Feather name={option.icon} size={24} color={GRAY} />
        </Animated.View>
        <Animated.View style={activeIconStyle}>
          <Feather name={option.icon} size={24} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, textStyle]}>
        {option.label}
      </Animated.Text>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    height: 110,
  },
  scrollContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: GAP,
    paddingBottom: 8,
    position: 'relative',
  },
  contentLayer: {
    position: 'absolute',
    left: 20,
    top: 0,
    flexDirection: 'row',
    gap: GAP,
    zIndex: 10,
  },
  cardBg: {
    width: CHIP_WIDTH,
    height: 98,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 0,
  },
  slider: {
    position: 'absolute',
    left: 20,
    top: 0,
    width: CHIP_WIDTH,
    height: 98,
    backgroundColor: PURPLE,
    borderRadius: 28,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 5, // Higher than cardBg, lower than contentLayer
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHIP_WIDTH,
    height: 98,
    borderRadius: 28,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
