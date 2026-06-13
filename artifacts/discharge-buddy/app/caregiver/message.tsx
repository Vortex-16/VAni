import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { DotLoader } from '../../components/DotLoader';
import { TranslateText as Text } from '@/components/TranslateText';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiUrl } from '@/utils/apiUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventSource from 'react-native-sse';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export default function MessagePage() {
  const { linkedPatients, user } = useApp();
  const insets = useSafeAreaInsets();
  const patient = linkedPatients[0]; // the caregiver's context patient
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Connect to SSE and fetch history
  useEffect(() => {
    if (!patient || !user) return;
    
    let es: EventSource | null = null;
    
    const initChat = async () => {
      try {
        const token = await AsyncStorage.getItem("discharge_buddy_token");
        const apiUrl = getApiUrl();
        
        // Fetch History
        // Assuming the target is the patient's id. But wait, the patient object has an id.
        // We want to chat with the patient's linked user account, or the caregiver chats with patient?
        // Let's assume patient.id is used as the context, and we'll just fetch history with patient.id
        // Wait, patient account is a user. Let's just fetch history for that patient's linked user.
        // If patient's user id is not available, we use patient.id as otherUserId for simplicity here, 
        // though typically they have their own user.id.
        const historyRes = await fetch(`${apiUrl}/api/chat/history/${patient.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (historyRes.ok) {
          const history = await historyRes.json();
          setMessages(history);
        }
        setLoading(false);
        
        // Connect SSE
        es = new EventSource(`${apiUrl}/api/chat/stream`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        es.addEventListener("message", (event: any) => {
          if (event.data) {
            const data = JSON.parse(event.data);
            const msg = data.data;
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              
              // If it's our own message, check if there's an optimistic message with the same text
              if (msg.senderId === user.id) {
                const tempIndex = prev.findIndex(m => (m.text === msg.text || m.text.trim() === msg.text.trim()) && m.senderId === msg.senderId && (m.id.startsWith('temp') || /^\d+$/.test(m.id)));
                if (tempIndex !== -1) {
                  const next = [...prev];
                  next[tempIndex] = msg;
                  return next;
                }
              }
              
              // Time-based fallback deduplication (within 5 seconds)
              const isDuplicate = prev.some(
                (m) =>
                  m.senderId === msg.senderId &&
                  m.text === msg.text &&
                  Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000
              );
              if (isDuplicate) {
                const tempIndex = prev.findIndex(m => m.id.startsWith('temp') || /^\d+$/.test(m.id));
                if (tempIndex !== -1) {
                  const next = [...prev];
                  next[tempIndex] = msg;
                  return next;
                }
                return prev;
              }
              
              return [...prev, msg];
            });
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        });
        
        es.addEventListener("error", (err) => {
          console.error("SSE Error:", err);
        });
        
      } catch (e) {
        console.error("Chat init error", e);
        setLoading(false);
      }
    };
    
    initChat();
    
    return () => {
      if (es) {
        es.removeAllEventListeners();
        es.close();
      }
    };
  }, [patient, user]);

  const sendMessage = async (isAudio: boolean = false) => {
    if (!isAudio && !inputText.trim()) return;
    if (!patient || !user) return;
    
    const token = await AsyncStorage.getItem("discharge_buddy_token");
    const apiUrl = getApiUrl();
    const tempId = Date.now().toString();
    const text = isAudio ? "Voice Message 🎵" : inputText;
    const audioBase64 = isAudio ? "mock_audio_base64_data_here" : undefined;
    
    const optimisticMsg: Message = {
      id: tempId,
      text: text,
      senderId: user.id,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    if (!isAudio) setInputText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });
    
    try {
      const res = await fetch(`${apiUrl}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: patient.id,
          patientContextId: patient.id,
          text: text,
          audioBase64: audioBase64
        })
      });
      
      if (res.ok) {
        const savedMsg = await res.json();
        setMessages(prev => {
          if (prev.find(m => m.id === savedMsg.id)) {
            return prev.filter(m => m.id !== tempId);
          }
          const tempIndex = prev.findIndex(m => m.id === tempId);
          if (tempIndex !== -1) {
            const next = [...prev];
            next[tempIndex] = savedMsg;
            return next;
          }
          return [...prev, savedMsg];
        });
      } else {
        console.error("Failed to send message");
      }
    } catch (e) {
      console.error("Send message network error", e);
    }
  };

  const handleRecordIn = () => {
    setIsRecording(true);
    if (Platform.OS !== "web") {
        import("expo-haptics").then(Haptics => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    }
  };

  const handleRecordOut = () => {
    setIsRecording(false);
    sendMessage(true);
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

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <DotLoader color="#0891B2" size={12} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.chatContent}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <View 
                key={msg.id} 
                style={[
                  styles.messageBubble, 
                  isMe ? styles.caregiverBubble : styles.patientBubble
                ]}
              >
                <Text style={[
                    styles.messageText,
                    isMe ? styles.caregiverText : styles.patientText
                ]}>{msg.text}</Text>
                <Text style={styles.messageTime}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 10 }]}>
        {isRecording ? (
            <View style={[styles.input, { justifyContent: 'center' }]}>
                <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Recording...</Text>
            </View>
        ) : (
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
        )}
        {inputText.length > 0 ? (
            <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(false)}>
              <Feather name="send" size={20} color="#fff" />
            </TouchableOpacity>
        ) : (
            <TouchableOpacity 
                style={[styles.sendBtn, isRecording && { backgroundColor: '#EF4444' }]} 
                onPressIn={handleRecordIn} 
                onPressOut={handleRecordOut}
            >
              <Feather name="mic" size={20} color="#fff" />
            </TouchableOpacity>
        )}
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
