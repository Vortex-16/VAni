import { Link, Stack, router } from "expo-router";
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import { useEffect } from 'react';

import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();

  useEffect(() => {
    // Automatically redirect to the home screen after a short delay
    // This fixes issues where the router briefly lands here on startup
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        
        <Text style={[styles.title, { color: colors.foreground }]}>
          Finding your way...
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Go to home screen
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loader: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    marginTop: 20,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
