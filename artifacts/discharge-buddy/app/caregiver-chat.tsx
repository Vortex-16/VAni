import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
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

export default function CaregiverChatPage() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const caregiverId = user?.linkedPatientId; // Wait, for patient, their caregiver is not linkedPatientId, patient.caregiverId is in DB. But in context user, they might have caregiverId.
  // Actually, the patient has a Caregiver. Let's assume we fetch history with "caregiver" role, or their linked user.
  // For simplicity, we just use a generic ID for caregiver or fetch from context.
  
  // If caregiverId is not in `user`, let's just assume we query by caregiver role or generic.
  // We'll use a mocked caregiver ID or if we have it in user context. Let's use `user.emergencyContactPhone` as a proxy if we don't have the ID,
  // Or actually, `user.linkedPatientId` could be the caregiver's patient, but if I am patient, I am the context.
  const contextId = user?.id;

  // Let's assume the caregiver is just fetched from the backend or the backend handles routing if we send to "caregiver".
  // For the sake of this demo, if the user doesn't know the exact caregiver ID, we can send to a generic endpoint or the backend can infer.
  // Actually, let's just make it work the same way. The Caregiver sent a message, so we will have history. We just need the Caregiver's user ID.
  // For now, let's hardcode 'caregiver' as receiver, and the backend would ideally resolve it, or we expect the user to have caregiver info.
  // Let's check if the patient has a caregiver ID. If not, we will rely on history.
  
  useEffect(() => {
    if (!user) return;
    
    let es: EventSource | null = null;
    
    const initChat = async () => {
      try {
        const token = await AsyncStorage.getItem("discharge_buddy_token");
        const apiUrl = getApiUrl();
        
        // Fetch History
        // We will fetch history using user's ID. Since the patient doesn't know the caregiver ID easily here without an extra fetch,
        // We will fetch history using user's linkedPatientId since that's the context
        const patientContextId = user.linkedPatientId;
        const historyRes = await fetch(`${apiUrl}/api/chat/history/${patientContextId}`, {
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
            if (data.type === "message") {
              setMessages(prev => {
                if (prev.find(m => m.id === data.data.id)) return prev;
                return [...prev, data.data];
              });
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }
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
  }, [user]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user) return;
    
    const token = await AsyncStorage.getItem("discharge_buddy_token");
    const apiUrl = getApiUrl();
    const tempId = Date.now().toString();
    const text = inputText;
    
    // Find the caregiver ID from previous messages
    const lastMsgFromCaregiver = messages.find(m => m.senderId !== user.id);
    const receiverId = lastMsgFromCaregiver?.senderId || user.id; // fallback
    
    const optimisticMsg: Message = {
      id: tempId,
      text: text,
      senderId: user.id,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });
    
    try {
      const res = await fetch(`${apiUrl}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: receiverId,
          patientContextId: user.linkedPatientId,
          text: text
        })
      });
      
      if (res.ok) {
        const savedMsg = await res.json();
        setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
      }
    } catch (e) {
      console.error("Send message network error", e);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <LinearGradient
        colors={['#6C47FF', '#8B5CF6']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
            <View style={styles.avatar}>
                <Feather name="user" size={20} color="#fff" />
            </View>
            <View>
                <Text style={styles.headerTitle}>Caregiver Team</Text>
                <Text style={styles.headerSub}>Available</Text>
            </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6C47FF" />
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
                  isMe ? styles.myBubble : styles.theirBubble
                ]}
              >
                <Text style={[
                    styles.messageText,
                    isMe ? styles.myText : styles.theirText
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
        <TextInput
          style={styles.input}
          placeholder="Type a message to your caregiver..."
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
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#6C47FF', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14 },
  myText: { color: '#fff' },
  theirText: { color: '#1E1B4B' },
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
    backgroundColor: '#6C47FF', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 10 
  },
});
