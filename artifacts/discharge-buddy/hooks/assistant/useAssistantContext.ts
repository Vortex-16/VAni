import { usePathname, useSegments } from 'expo-router';
import { useMemo } from 'react';

export type AppFeatureModule = 
  | 'authentication'
  | 'dashboard'
  | 'medicine'
  | 'journal'
  | 'settings'
  | 'activity'
  | 'chatbot'
  | 'unknown';

/**
 * Foundation for context awareness.
 * Evaluates current router path to determine the active feature module.
 * Can be expanded later to parse screen content or fetch specific context IDs.
 */
export function useAssistantContext() {
  const pathname = usePathname();
  const segments = useSegments();

  const activeModule = useMemo<AppFeatureModule>(() => {
    if (!pathname) return 'unknown';

    if (pathname.includes('/login') || pathname.includes('/intro') || pathname.includes('/register')) {
      return 'authentication';
    }
    if (pathname.includes('/medicines')) {
      return 'medicine';
    }
    if (pathname.includes('/journal')) {
      return 'journal';
    }
    if (pathname.includes('/settings') || pathname.includes('/profile')) {
      return 'settings';
    }
    if (pathname.includes('/progress') || pathname.includes('/activity')) {
      return 'activity';
    }
    if (pathname.includes('/chat') || pathname.includes('/bot')) {
      return 'chatbot';
    }
    if (pathname.includes('/dashboard') || pathname === '/' || pathname === '/(tabs)') {
      return 'dashboard';
    }

    return 'unknown';
  }, [pathname]);

  return {
    pathname,
    segments,
    activeModule,
    // Future placeholders for deeper context awareness
    isModalActive: segments[segments.length - 1]?.includes('modal'),
    hasInputFocus: false, // Could tie into Keyboard context later
  };
}
