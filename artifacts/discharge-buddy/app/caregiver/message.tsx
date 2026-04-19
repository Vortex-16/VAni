import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  sender: 'caregiver' | 'patient';
  time: string;
}

export default function MessagePage() {
  const { linkedPatients } = useApp();
  const insets = useSafeAreaInsets();
  const patient = linkedPatients[0];
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hi Mary, how are you feeling today?', sender: 'caregiver', time: '10:00 AM' },
    { id: '2', text: 'I am feeling much better, thank you!', sender: 'patient', time: '10:05 AM' },
  ]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'caregiver',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInputText('');
    
    // Logic for backend dev: Trigger SMS/WhatsApp API here
    console.log(`Triggering backend to send message to ${patient?.name} via SMS/WhatsApp: ${inputText}`);
  };

  if (!patient) return null;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <LinearGradient
        colors={['#06B6D4', '#0891B2']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{patient.name.charAt(0)}</Text>
            </View>
            <View>
                <Text style={styles.headerTitle}>{patient.name}</Text>
                <Text style={styles.headerSub}>Patient · Online</Text>
            </View>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.chatContent}
        ref={(ref) => ref?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View 
            key={msg.id} 
            style={[
              styles.messageBubble, 
              msg.sender === 'caregiver' ? styles.caregiverBubble : styles.patientBubble
            ]}
          >
            <Text style={[
                styles.messageText,
                msg.sender === 'caregiver' ? styles.caregiverText : styles.patientText
            ]}>{msg.text}</Text>
            <Text style={styles.messageTime}>{msg.time}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Feather name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FB' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    borderBottomLeftRadius: 25, 
    borderBottomRightRadius: 25 
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  chatContent: { padding: 20, paddingBottom: 100 },
  messageBubble: { 
    maxWidth: '80%', 
    padding: 12, 
    borderRadius: 18, 
    marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1
  },
  caregiverBubble: { alignSelf: 'flex-end', backgroundColor: '#06B6D4', borderBottomRightRadius: 4 },
  patientBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14 },
  caregiverText: { color: '#fff' },
  patientText: { color: '#1E1B4B' },
  messageTime: { fontSize: 9, color: 'rgba(0,0,0,0.4)', marginTop: 4, alignSelf: 'flex-end' },
  inputArea: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  input: { 
    flex: 1, 
    backgroundColor: '#F9FAFB', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    maxHeight: 100,
    fontSize: 14,
    color: '#1E1B4B'
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#06B6D4', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 10 
  },
});
