import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
  receiverId?: string;
  patientContextId?: string;
  createdAt: string;
}

export default function CaregiverChatPage() {
  const { user, linkedPatients, activePatientId } = useApp();
  const insets = useSafeAreaInsets();
  // Optional explicit counterpart, e.g. navigated from a specific family member
  // or patient card: /caregiver-chat?peerId=<userId>&peerName=<name>.
  const params = useLocalSearchParams<{ peerId?: string; peerName?: string; patientContextId?: string }>();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Track the keyboard so we can drop the safe-area bottom padding while it's
  // up — adding both at once is what makes the input bar jump/jitter.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));
    });
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // The conversation is always scoped to a patient. Resolve it in priority order:
  //   1. explicit ?patientContextId= (e.g. from a patient card)
  //   2. the user's own linked patient (patient users)
  //   3. the currently-selected patient (family/caregiver context)
  //   4. the first managed patient (caregivers have linkedPatientId = null, so
  //      without this their messages would fail "patientContextId is required").
  const patientContextId =
    params.patientContextId ||
    user?.linkedPatientId ||
    activePatientId ||
    linkedPatients?.[0]?.id;

  // Who we're talking to. If not passed explicitly, we learn it from history
  // (the other participant). A manager can leave it undefined — the server
  // resolves manager → patient. A patient with multiple managers needs it set.
  const peerIdRef = useRef<string | undefined>(params.peerId);

  useEffect(() => {
    if (!user) return;

    let es: EventSource | null = null;

    const initChat = async () => {
      try {
        const token = await AsyncStorage.getItem('discharge_buddy_token');
        const apiUrl = getApiUrl();

        if (patientContextId) {
          const qs = peerIdRef.current ? `?withUserId=${peerIdRef.current}` : '';
          const historyRes = await fetch(`${apiUrl}/api/chat/history/${patientContextId}${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (historyRes.ok) {
            const history: Message[] = await historyRes.json();
            setMessages(history);
            // Infer the peer from history if it wasn't provided.
            if (!peerIdRef.current) {
              const other = history.find((m) => m.senderId !== user.id);
              if (other) peerIdRef.current = other.senderId;
            }
          }
        }
        setLoading(false);

        // Subscribe to the real-time stream.
        es = new EventSource(`${apiUrl}/api/chat/stream`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        es.addEventListener('message', (event) => {
          if (!event.data) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type !== 'message' || !parsed.data) return;
            const msg: Message = parsed.data;
            // Only show messages from this patient conversation.
            if (patientContextId && msg.patientContextId && msg.patientContextId !== patientContextId) return;
            if (!peerIdRef.current && msg.senderId !== user.id) peerIdRef.current = msg.senderId;
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));
          } catch {
            // ignore malformed frames
          }
        });
      } catch (e) {
        console.error('Chat init error', e);
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
  }, [user, patientContextId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user) return;
    if (!patientContextId) {
      Alert.alert('No conversation', 'No linked patient to message yet. Link a patient first.');
      return;
    }

    const token = await AsyncStorage.getItem('discharge_buddy_token');
    const apiUrl = getApiUrl();
    const tempId = `temp-${Date.now()}`;
    const text = inputText.trim();

    const optimisticMsg: Message = {
      id: tempId,
      text,
      senderId: user.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));

    try {
      const res = await fetch(`${apiUrl}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // receiverId is sent when known so a patient can reply to the right
        // person (family vs caregiver); the server validates it's linked.
        body: JSON.stringify({
          patientContextId,
          receiverId: peerIdRef.current,
          text,
        }),
      });

      if (res.ok) {
        const savedMsg: Message = await res.json();
        if (!peerIdRef.current) peerIdRef.current = savedMsg.receiverId;
        setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
      } else {
        // Roll back the optimistic bubble and tell the user WHY (so a failed
        // send no longer silently vanishes).
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputText(text); // restore so they can retry
        Alert.alert('Message not sent', err?.error || `Server error (${res.status}).`);
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      Alert.alert('Message not sent', 'Could not reach the server. Check your connection.');
    }
  };

  const peerName = params.peerName || 'Care Team';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#6C47FF', '#8B6CFF']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{peerName}</Text>
        <View style={{ width: 26 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <Text style={styles.empty}>No messages yet. Say hello 👋</Text>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <View key={m.id} style={[styles.bubbleRow, mine ? styles.rowRight : styles.rowLeft]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{m.text}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message…"
          placeholderTextColor="#9CA3AF"
          multiline
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={!inputText.trim()}>
          <Feather name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { padding: 2 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  bubbleRow: { marginVertical: 4, flexDirection: 'row' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: '#6C47FF', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EDE9FE' },
  bubbleText: { fontSize: 15, color: '#1F2937' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EDE9FE' },
  input: { flex: 1, maxHeight: 120, backgroundColor: '#F5F3FF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1F2937' },
  sendBtn: { marginLeft: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center' },
});
