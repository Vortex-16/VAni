export interface KBEntry {
  answer: string;
  route?: string;
}

export const KNOWLEDGE_BASE: Record<string, KBEntry> = {
  // Navigation & Features
  "guide me": {
    answer: "Welcome to Discharge Buddy! I am Buddy, your personal health assistant. I can help you track your medicines and remind you when to take them, log your symptoms and pain levels, keep a daily recovery journal, connect with your caregiver or family, handle emergencies with one tap, and answer any health questions. Just speak to me or tap a quick action below. What would you like to do first?",
  },
  "how to use app": {
    answer: "This app has five main tabs at the bottom. Home shows your daily medicine doses and recovery score. Medicines lets you add or edit your medication schedule. Activity tracks your symptom history and recovery trends. Progress shows your adherence stats and lets you generate reports. The Plus button in the center lets you scan prescriptions or log symptoms quickly. You can also just talk to me anytime for help!",
  },
  "features": {
    answer: "Here are the key features of this app. One: Medicine Reminders - get alerts for every dose and track your daily adherence score. Two: Symptom Tracking - log how you feel, rate pain levels, and monitor recovery trends. Three: Recovery Journal - record daily reflections about your mood and energy. Four: Emergency Tools - one tap SOS, CPR guide, and choking assistance. Five: Caregiver Linking - share a Care Code so your family or doctor can monitor your progress. Six: Prescription Scanner - scan any paper prescription and the app reads and saves it automatically. Seven: AI Chatbot - ask health questions and get simple answers. Eight: Voice Assistant - control everything by voice in multiple languages. Nine: Notifications and Alerts - stay updated on missed doses and caregiver messages. Ten: Progress Reports - generate a PDF report to share with your doctor. Which feature would you like to know more about?",
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
    answer: "I am Buddy, your voice assistant! Here is what you can tell me: Say a medicine name to mark a dose taken. Say 'I feel dizzy' or any symptom to log it. Say 'remind me in 30 minutes'. Say 'emergency' for urgent help. Say 'open journal' or any screen name to navigate. Say 'change language to Hindi' to switch my language. Say 'stop' or 'close' to close me. You can also tap the quick action chips below to get started!",
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

export function matchKnowledgeBaseExact(transcript: string): KBEntry | null {
  const normalized = transcript.toLowerCase().trim();
  return KNOWLEDGE_BASE[normalized] || null;
}

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
