import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import * as ImagePicker from "expo-image-picker";

const TEAL = "#0891b2";
const TEAL_DARK = "#0c4a6e";
const WHITE = "#ffffff";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useApp();
  
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [bloodType, setBloodType] = useState(user?.bloodType || "");
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [ecName, setEcName] = useState(user?.emergencyContactName || "");
  const [ecPhone, setEcPhone] = useState(user?.emergencyContactPhone || "");
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.warn("Permission denied");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {
      console.error("Pick image error", e);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      console.warn("Name is required");
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ 
        name: name.trim(), 
        email: email.trim(), 
        phone: phone.trim(), 
        avatar,
        bloodType,
        allergies,
        emergencyContactName: ecName,
        emergencyContactPhone: ecPhone
      });
      
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/profile");
      }
    } catch (err) {
      console.error("Save failed:", err);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: WHITE }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color={WHITE} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable 
          onPress={handleSave} 
          disabled={loading}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.saveText, loading && { opacity: 0.5 }]}>
            {loading ? "..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <Feather name="camera" size={32} color={TEAL} />
              )}
            </View>
            <View style={styles.editBadge}>
              <Feather name="plus" size={14} color={WHITE} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tap to change picture</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>General Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Medical Details</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>BLOOD TYPE</Text>
              <TextInput
                style={styles.input}
                value={bloodType}
                onChangeText={setBloodType}
                placeholder="O+"
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
              <Text style={styles.label}>ALLERGIES</Text>
              <TextInput
                style={styles.input}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="None or specific"
              />
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONTACT NAME</Text>
            <TextInput
              style={styles.input}
              value={ecName}
              onChangeText={setEcName}
              placeholder="Name of contact"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONTACT PHONE</Text>
            <TextInput
              style={styles.input}
              value={ecPhone}
              onChangeText={setEcPhone}
              placeholder="Phone of contact"
              keyboardType="phone-pad"
            />
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.bottomSaveBtn, 
              loading && { opacity: 0.7 },
              pressed && { opacity: 0.8 }
            ]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.bottomSaveText}>
              {loading ? "Saving..." : "Update Profile"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: TEAL_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#f8fafc",
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  avatarInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: WHITE,
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Inter_500Medium",
  },
  form: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: TEAL_DARK,
    marginTop: 8,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#1e293b",
  },
  row: {
    flexDirection: "row",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  bottomSaveBtn: {
    backgroundColor: TEAL,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 20,
  },
  bottomSaveText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
