import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { API_BASE } from '../config';
import { getSessionId } from './utils/session';
import { theme } from './theme';
import Avatar from './components/Avatar';
import HeaderGradient from './components/HeaderGradient';
import { PERSONA_DISPLAY_NAMES, PERSONA_PROMPTS } from './constants/personas';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  fadeAnim?: Animated.Value;
  meta?: {
    used?: {
      facts?: boolean;
      quotes?: boolean;
    };
    facts?: boolean;
    quotes?: boolean;
  };
}

export default function ChatScreen() {
  const { persona } = useLocalSearchParams<{ persona: string }>();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (persona) {
      // Add welcome message
      const welcomeFadeAnim = new Animated.Value(0);
      const displayName = PERSONA_DISPLAY_NAMES[persona] || persona;
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        text: `Hello! I'm ${displayName}. What would you like to discuss?`,
        isUser: false,
        timestamp: new Date(),
        fadeAnim: welcomeFadeAnim
      };
      
      setMessages([welcomeMessage]);
      
      // Animate welcome message in
      Animated.timing(welcomeFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [persona]);

  // Get persona-specific prompts (first two)
  const samplePrompts = PERSONA_PROMPTS[String(persona)]?.slice(0, 2) || [
    "Tell me something interesting",
    "Share your perspective"
  ];

  const handleChipPress = (prompt: string) => {
    if (loading) return; // Prevent duplicate requests
    setMessage(prompt);
    // Auto-send the message
    sendMessageWithText(prompt);
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || !persona) return;

    const userFadeAnim = new Animated.Value(0);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      fadeAnim: userFadeAnim
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Animate user message in
    Animated.timing(userFadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setMessage('');
    setLoading(true);

    try {
      // Get session ID
      const sessionId = await getSessionId();
      
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona: persona,
          message: userMessage.text,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const assistantFadeAnim = new Animated.Value(0);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.text,
        isUser: false,
        timestamp: new Date(),
        meta: data.meta,
        fadeAnim: assistantFadeAnim
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Animate assistant message in
      Animated.timing(assistantFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      const errorFadeAnim = new Animated.Value(0);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
        fadeAnim: errorFadeAnim
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Animate error message in
      Animated.timing(errorFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    sendMessageWithText(message);
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    Speech.speak(text, {
      rate: 0.98,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleStop = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const renderMessage = (msg: ChatMessage) => (
    <Animated.View
      key={msg.id}
      style={[
        styles.messageContainer,
        msg.isUser ? styles.userMessage : styles.assistantMessage,
        {
          opacity: msg.fadeAnim || 1, // Fallback to 1 for existing messages
        },
      ]}
    >
      {/* Render metadata badges for assistant messages */}
      {!msg.isUser && msg.meta && (
        <View style={styles.badgeContainer}>
          {(msg.meta.used?.facts || msg.meta.facts) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📚 Facts used</Text>
            </View>
          )}
          {(msg.meta.used?.quotes || msg.meta.quotes) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📝 Snippet used</Text>
            </View>
          )}
        </View>
      )}
      
      <Text style={[
        styles.messageText,
        msg.isUser ? styles.userMessageText : styles.assistantMessageText
      ]}>
        {msg.text}
      </Text>
      
      {/* TTS controls for assistant messages */}
      {!msg.isUser && msg.text && (
        <View style={styles.ttsContainer}>
          <TouchableOpacity
            style={[styles.ttsButton, isSpeaking && styles.ttsButtonDisabled]}
            onPress={() => handleSpeak(msg.text)}
            disabled={isSpeaking}
            activeOpacity={0.7}
            accessibilityLabel="Speak reply aloud"
          >
            <Text style={styles.ttsButtonText}>🔊 Speak</Text>
          </TouchableOpacity>
          
          {isSpeaking && (
            <TouchableOpacity
              style={styles.ttsButton}
              onPress={handleStop}
              activeOpacity={0.7}
              accessibilityLabel="Stop audio playback"
            >
              <Text style={styles.ttsButtonText}>⏹ Stop Audio</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Add disclaimer for assistant messages */}
      {!msg.isUser && (
        <>
          <Text style={styles.disclaimer}>
            — Fictionalized, educational response.
          </Text>
          <Text style={styles.ttsDisclaimer}>
            Audio generated with device TTS.
          </Text>
        </>
      )}
      
      <Text style={styles.timestamp}>
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 64}
    >
      <HeaderGradient persona={persona} />
      
      <View style={styles.personaHeader}>
        <Avatar name={persona} size={36} />
        <Text style={styles.personaHeaderText}>Chatting with {PERSONA_DISPLAY_NAMES[persona] || persona}</Text>
      </View>
      
      <ScrollView 
        style={styles.messagesContainer} 
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: Math.max(inputHeight + insets.bottom + 12, 40) }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(renderMessage)}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View 
        style={styles.inputContainer}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          setInputHeight(height);
        }}
      >
        {/* Sample prompt chips */}
        <View style={styles.chipsContainer}>
          {samplePrompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.chip,
                loading && styles.chipDisabled
              ]}
              onPress={() => handleChipPress(prompt)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                loading && styles.chipTextDisabled
              ]}>
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.messageInputRow}>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!message.trim() || loading}
            activeOpacity={0.7}
          >
            <Text style={styles.sendButtonText}>{loading ? 'Sending...' : 'Ask'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: 50, // Account for status bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  personaHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    textTransform: 'capitalize',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.lg,
  },
  messageContainer: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accent,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: theme.colors.text,
  },
  assistantMessageText: {
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.subtext,
    marginTop: 4,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingText: {
    marginLeft: 8,
    color: theme.colors.subtext,
    fontSize: 14,
  },
  inputContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  chipDisabled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.accent,
    textAlign: 'center',
  },
  chipTextDisabled: {
    color: theme.colors.subtext,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.bg,
  },
  sendButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  sendButtonText: {
    color: theme.colors.bg,
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.subtext,
    fontStyle: 'italic',
    marginTop: 6,
  },
  ttsDisclaimer: {
    fontSize: 10,
    color: theme.colors.subtext,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.7,
  },
  ttsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  ttsButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ttsButtonDisabled: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  ttsButtonText: {
    fontSize: 11,
    color: theme.colors.text,
  },
});