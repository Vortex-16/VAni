import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import { Feather } from '@expo/vector-icons';

const PURPLE = '#6C47FF';
const GRAY = '#94A3B8';

export type TimeOfDay = 'morning' | 'early' | 'afternoon' | 'evening' | 'night';

interface FilterOption {
  id: TimeOfDay;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const OPTIONS: FilterOption[] = [
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
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {OPTIONS.map((option) => {
          const isActive = value.toLowerCase().includes(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.7}
              onPress={() => onChange(option.label === 'Early' ? 'Early Morning' : option.label)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Feather 
                name={option.icon} 
                size={16} 
                color={isActive ? '#FFFFFF' : GRAY} 
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOpacity: 0.3,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: GRAY,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
