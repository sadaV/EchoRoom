import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { API_BASE } from '../config';
import { getSessionId } from './utils/session';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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

  useEffect(() => {
    if (persona) {
      // Add welcome message
      setMessages([{
        id: 'welcome',
        text: `Hello! I'm ${persona}. What would you like to discuss?`,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [persona]);

  const samplePrompts = [
    "Explain gravity in simple words",
    "What is E=mc^2?", 
    "How do you think about time?",
    "Give a fun analogy"
  ];

  const handleChipPress = (prompt: string) => {
    if (loading) return; // Prevent duplicate requests
    setMessage(prompt);
    // Auto-send the message
    sendMessageWithText(prompt);
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || !persona) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
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
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.text,
        isUser: false,
        timestamp: new Date(),
        meta: data.meta
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
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
    <View
      key={msg.id}
      style={[
        styles.messageContainer,
        msg.isUser ? styles.userMessage : styles.assistantMessage
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
          >
            <Text style={styles.ttsButtonText}>🔊 Read</Text>
          </TouchableOpacity>
          
          {isSpeaking && (
            <TouchableOpacity
              style={styles.ttsButton}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <Text style={styles.ttsButtonText}>⏹ Stop</Text>
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
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.personaHeader}>Chatting with {persona}</Text>
      
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {messages.map(renderMessage)}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  personaHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    textTransform: 'capitalize',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  chipDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  chipText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
  chipTextDisabled: {
    color: '#999',
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 6,
  },
  ttsDisclaimer: {
    fontSize: 10,
    color: '#bbb',
    fontStyle: 'italic',
    marginTop: 2,
  },
  ttsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  ttsButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ttsButtonDisabled: {
    backgroundColor: '#f8f8f8',
    borderColor: '#eee',
  },
  ttsButtonText: {
    fontSize: 11,
    color: '#333',
  },
});