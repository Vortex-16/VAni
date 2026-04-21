import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

interface ErrorNoticeProps {
  message: string;
  visible?: boolean;
  onDismiss?: () => void;
}

export const ErrorNotice: React.FC<ErrorNoticeProps> = ({ message, visible = true, onDismiss }) => {
  if (!visible || !message) return null;

  return (
    <Animated.View 
      entering={FadeInDown.springify().damping(15)} 
      exiting={FadeOutUp}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Feather name="alert-circle" size={16} color="#ffffff" />
        </View>
        <Text style={styles.text} numberOfLines={3}>
          {message}
        </Text>
      </View>
      
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={10}>
          <Feather name="x" size={14} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#da373c', // Discord Error Red
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#da373c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    marginRight: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: 5,
    borderRadius: 6,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    lineHeight: 18,
  },
  dismissBtn: {
    marginLeft: 8,
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
  },
});
