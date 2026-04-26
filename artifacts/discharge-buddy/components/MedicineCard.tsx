import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DoseLog, Medicine } from "@/context/AppContext";

interface Props {
  medicine: Medicine;
  dose?: DoseLog;
  onTake?: (doseId: string) => void;
  onSnooze?: (doseId: string) => void;
  onEdit?: (med: Medicine) => void;
  onDelete?: (medId: string) => void;
  compact?: boolean;
}

type FeatherName = React.ComponentProps<typeof Feather>["name"];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: FeatherName; label: string }> = {
  taken:   { color: "#10B981", bg: "#D1FAE5", icon: "check-circle", label: "Taken ✓" },
  missed:  { color: "#EF4444", bg: "#FEE2E2", icon: "x-circle",     label: "Missed" },
  snoozed: { color: "#F59E0B", bg: "#FEF3C7", icon: "clock",        label: "Snoozed" },
  pending: { color: "#7C3AED", bg: "#EDE9FE", icon: "circle",       label: "Due" },
};

function MedIcon({ medicine }: { medicine: Medicine }) {
  return (
    <View style={[styles.pillIconWrap, { backgroundColor: `${medicine.color}18` }]}>
      <Text style={[styles.medInitial, { color: medicine.color }]}>
        {medicine.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function MedicineCard({ medicine, dose, onTake, onSnooze, onEdit, onDelete, compact }: Props) {
  const status = dose ? dose.status : "active";
  const cfg = status === "active" 
    ? { color: "#64748b", bg: "#f1f5f9", icon: "check" as FeatherName, label: "Active" }
    : (STATUS_CONFIG[status] ?? STATUS_CONFIG.pending);
  const isWebBox = Platform.OS === "web"
    ? { boxShadow: "0px 2px 12px rgba(0,0,0,0.07)" }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      };

  const handleTake = () => {
    if (dose && onTake) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onTake(dose.id);
    }
  };

  const handleSnooze = () => {
    if (dose && onSnooze) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSnooze(dose.id);
    }
  };

  return (
    <View style={[styles.card, isWebBox, { borderLeftColor: medicine.color }]}>
      {/* Left accent bar is handled by borderLeftColor */}

      {/* Content row */}
      <View style={styles.row}>
        {/* Medicine icon */}
        <MedIcon medicine={medicine} />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{medicine.name}</Text>

          <View style={styles.chipRow}>
            {/* Dosage chip */}
            <View style={[styles.chip, { backgroundColor: `${medicine.color}15` }]}>
              <Text style={[styles.chipText, { color: medicine.color }]}>{medicine.dosage}</Text>
            </View>

            {/* Time chip */}
            {(dose?.scheduledTime || (medicine.times && medicine.times.length > 0)) && (
              <View style={styles.timeChip}>
                <Feather name="clock" size={10} color="#64748b" />
                <Text style={styles.timeText}>
                  {dose?.scheduledTime ?? medicine.times[0]}
                  {(!dose && medicine.times.length > 1) ? ` (+${medicine.times.length - 1})` : ""}
                </Text>
              </View>
            )}
          </View>

          {!compact && medicine.simplifiedInstructions && (
            <Text style={styles.instructions} numberOfLines={2}>
              {medicine.simplifiedInstructions}
            </Text>
          )}
        </View>

        {/* Right: status + actions */}
        <View style={styles.right}>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Feather name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>

          {dose?.status === "taken" && (
            <View style={styles.checkCircle}>
              <Feather name="check" size={14} color="#10b981" />
            </View>
          )}

          {!dose && (onEdit || onDelete) && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {onEdit && (
                <TouchableOpacity 
                  onPress={() => {
                    console.log("[MedicineCard] Edit tapped for:", medicine.id);
                    onEdit(medicine);
                  }} 
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 10 }}
                >
                  <Feather name="edit-2" size={18} color="#64748b" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity 
                  onPress={() => {
                    console.log("[MedicineCard] Delete tapped for:", medicine.id);
                    onDelete(medicine.id);
                  }} 
                  hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
                >
                  <Feather name="trash-2" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Action buttons for pending */}
      {dose?.status === "pending" && onTake && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleSnooze}
            style={styles.snoozeBtn}
            activeOpacity={0.8}
          >
            <Feather name="clock" size={14} color="#f59e0b" />
            <Text style={styles.snoozeBtnText}>Snooze</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTake}
            style={[styles.takeBtn, { backgroundColor: medicine.color }]}
            activeOpacity={0.85}
          >
            <Feather name="check" size={14} color="#fff" />
            <Text style={styles.takeBtnText}>Take Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Frequency tag */}
      <View style={styles.freqRow}>
        <Feather name="repeat" size={10} color="#94a3b8" />
        <Text style={styles.freqText}>{medicine.frequency}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  // Medicine icon
  pillIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  medInitial: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },

  // Info
  info: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1E1B4B",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
  },
  chipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 50,
    backgroundColor: "#f1f5f9",
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
  instructions: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 16,
  },

  // Right
  right: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 50,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  snoozeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#fef3c7",
    backgroundColor: "#fffbeb",
  },
  snoozeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#f59e0b",
  },
  takeBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 50,
  },
  takeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  // Frequency
  freqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: -2,
  },
  freqText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
  },
});
