import { DoseLog } from "../context/AppContext";

const MESSAGES = {
  urgent: [
    "Your next dose is coming up, [Name].",
    "Please take your medication soon, [Name].",
    "It's almost time for your medicine.",
    "Your medication window is opening.",
    "Get ready for your upcoming dose, [Name].",
    "A dose is scheduled shortly.",
    "Time to prepare your medication.",
    "Please check your upcoming schedule, [Name]."
  ],
  dueNow: [
    "It's time to take your medication, [Name].",
    "Your dose is scheduled for now.",
    "Please take your medicine.",
    "Take a moment for your health, [Name].",
    "Time for your scheduled dose.",
    "Your medication is due, [Name].",
    "Please attend to your current dose.",
    "It is time for your scheduled care."
  ],
  missed: [
    "You might want to check your last dose, [Name].",
    "A scheduled dose was missed.",
    "Please review your medication log, [Name].",
    "Check your schedule when you can.",
    "Let's review your past doses, [Name].",
    "A past dose requires your attention.",
    "Please check your recent medication schedule.",
    "Review your missed medication, [Name]."
  ],
  idleMorning: [
    "Good morning, [Name]. Let's start gently.",
    "A fresh start today, [Name].",
    "Take a moment to center yourself.",
    "You're on track today, [Name].",
    "Wishing you a peaceful morning.",
    "Take a deep breath.",
    "Everything is in order this morning, [Name].",
    "Start your day with calm focus."
  ],
  idleAfternoon: [
    "Everything's taken care of for now, [Name].",
    "Take a moment to slow down.",
    "Things look good, [Name]. Keep going.",
    "Hope your afternoon is peaceful.",
    "You're managing well today, [Name].",
    "Pause and take a steady breath.",
    "Your schedule is clear right now.",
    "A quiet moment for yourself, [Name]."
  ],
  idleEvening: [
    "Good evening, [Name]. Time to unwind.",
    "Rest well tonight.",
    "Take a moment to relax, [Name].",
    "Everything is settled for the day.",
    "A calm end to your day, [Name].",
    "Reflect on a day well managed.",
    "Prepare for a restful night.",
    "Your daily health tasks are complete, [Name]."
  ]
};

function getRandomMessage(category: string[], userName?: string) {
  const randomIndex = Math.floor(Math.random() * category.length);
  let msg = category[randomIndex];
  
  if (userName) {
    const firstName = userName.split(" ")[0];
    msg = msg.replace("[Name]", firstName);
  } else {
    // Clean up placeholder if no name exists
    msg = msg.replace(", [Name]", "").replace("[Name]", "there");
  }
  
  return msg;
}

export function getDynamicMessage(doses: DoseLog[], currentTime: Date = new Date(), userName?: string): string {
  // Sort doses by time to find the most relevant ones
  const todayDoses = [...doses].sort((a, b) => {
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });

  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  let hasMissed = false;
  let dueNow = false;
  let urgentUpcoming = false;

  for (const dose of todayDoses) {
    if (dose.status === "taken") continue;

    const [h, m] = dose.scheduledTime.split(":").map(Number);
    const doseMinutes = h * 60 + m;
    const diff = doseMinutes - nowMinutes;

    if (dose.status === "missed" || diff < -15) {
      hasMissed = true;
    } else if (diff >= -15 && diff <= 5) {
      dueNow = true;
    } else if (diff > 5 && diff <= 30) {
      urgentUpcoming = true;
    }
  }

  if (dueNow) {
    return getRandomMessage(MESSAGES.dueNow, userName);
  }

  if (urgentUpcoming) {
    return getRandomMessage(MESSAGES.urgent, userName);
  }

  if (hasMissed) {
    return getRandomMessage(MESSAGES.missed, userName);
  }

  // Idle state
  const hour = currentTime.getHours();
  if (hour >= 5 && hour < 12) {
    return getRandomMessage(MESSAGES.idleMorning, userName);
  } else if (hour >= 12 && hour < 17) {
    return getRandomMessage(MESSAGES.idleAfternoon, userName);
  } else {
    return getRandomMessage(MESSAGES.idleEvening, userName);
  }
}
