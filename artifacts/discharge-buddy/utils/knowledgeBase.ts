export interface KBEntry {
  answer: string;
  route?: string;
}

export const KNOWLEDGE_BASE: Record<string, KBEntry> = {
  // Navigation & Features
  "guide me": {
    answer: "Welcome to VAni! I can help you with your medications, track your symptoms, record a journal, or call for help. What would you like to explore?",
  },
  "how to use app": {
    answer: "You can use the tabs at the bottom to navigate. The Home tab shows your daily tasks. Use the plus button to scan documents or log symptoms. You can always ask me for help!",
  },
  "features": {
    answer: "VAni offers medication reminders, symptom tracking, emergency alerts, caregiver linking, a recovery journal, and a voice assistant like me.",
  },
  "caregiver setup": {
    answer: "To set up a caregiver, go to your Profile and share your unique Care Code. They can enter this code in their app to link with your account.",
    route: "/profile"
  },
  "medicines": {
    answer: "You can view your daily doses on the Home tab. If you need to check drug interactions, tap the Drug Checker. I can also set medication reminders for you.",
    route: "/(tabs)/"
  },
  "reminders": {
    answer: "I can set reminders for your medications. Just tell me the time and the medicine name.",
  },
  "symptom logs": {
    answer: "To log a symptom, tap the Plus button on the Home tab, or just tell me your symptoms directly.",
  },
  "symptom tracking": {
    answer: "Tracking symptoms helps monitor your recovery. You can report your pain level and specific symptoms so your doctor or caregiver stays informed.",
  },
  "journal": {
    answer: "Your recovery journal lets you record voice notes about how you feel each day. It helps track your mental well-being.",
    route: "/journal"
  },
  "stress tracking": {
    answer: "Stress tracking is available through your daily journal. Regular meditation can also help reduce stress.",
    route: "/meditation"
  },
  "scanner": {
    answer: "You can use the scanner to digitize prescriptions or medical documents. Tap the Plus button and select Scan Document.",
    route: "/scan"
  },
  "voice assistant": {
    answer: "I am your voice assistant! You can talk to me to log symptoms, ask questions, set reminders, or navigate the app.",
  },
  "caregiver features": {
    answer: "Caregivers can view patient adherence, send reminders, message the patient, and receive alerts if symptoms worsen or a dose is missed.",
  },
  "messaging": {
    answer: "You can message your linked caregiver directly from the Chat tab.",
    route: "/chat"
  },
  "emergency tools": {
    answer: "In an emergency, use the red SOS button or say 'Emergency'. This will alert your contacts and provide CPR guidance.",
    route: "/emergency"
  },
  "cpr": {
    answer: "The CPR assistant provides step-by-step guidance and a 100 beats-per-minute metronome. Tap the SOS button and select CPR.",
    route: "/cpr"
  },
  "choking assistance": {
    answer: "For choking, the app provides visual and audio instructions for the Heimlich maneuver. Tap the SOS button.",
    route: "/cpr"
  },
  "settings": {
    answer: "In Settings, you can update your preferences, change your password, and adjust notification permissions.",
    route: "/settings"
  },
  "language": {
    answer: "To change my speaking language, go to Settings and select your preferred language under Voice Assistant.",
    route: "/settings"
  },
  "notifications": {
    answer: "You can view your recent alerts in the Notifications screen. Make sure push notifications are enabled in your device settings.",
    route: "/notifications"
  },
  "profile management": {
    answer: "Your Profile shows your recovery stats, adherence score, and lets you generate a PDF report for your doctor.",
    route: "/profile"
  }
};

export function matchKnowledgeBase(transcript: string): KBEntry | null {
  const normalized = transcript.toLowerCase().trim();

  // Exact match
  if (KNOWLEDGE_BASE[normalized]) {
    return KNOWLEDGE_BASE[normalized];
  }

  // Substring match
  for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
    if (normalized.includes(key)) {
      return entry;
    }
  }

  return null;
}
