import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import * as Speech from 'expo-speech';
import { API_BASE } from '../config';
import { getSessionId } from './utils/session';
import { theme } from './theme';
import Avatar from './components/Avatar';
import HeaderGradient from './components/HeaderGradient';
import { PERSONA_DISPLAY_NAMES } from './constants/personas';

interface RoundtableReply {
  persona: string;
  text: string;
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

interface RoundtableResponse {
  replies: RoundtableReply[];
}

export default function RoundtableScreen() {
  const [message, setMessage] = useState('');
  const [replies, setReplies] = useState<RoundtableReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const defaultPersonas = ['Einstein', 'Shakespeare', 'Cleopatra'];

  const startDiscussion = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setHasAsked(true);

    try {
      // Get session ID
      const sessionId = await getSessionId();
      
      const response = await fetch(`${API_BASE}/roundtable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personas: defaultPersonas,
          message: message.trim(),
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: RoundtableResponse = await response.json();
      
      // Add fade animations to replies
      const repliesWithAnimation = data.replies.map((reply, index) => {
        const fadeAnim = new Animated.Value(0);
        return { ...reply, fadeAnim };
      });
      
      setReplies(repliesWithAnimation);
      
      // Animate replies in with stagger effect
      repliesWithAnimation.forEach((reply, index) => {
        Animated.timing(reply.fadeAnim!, {
          toValue: 1,
          duration: 200,
          delay: index * 100, // Stagger by 100ms per reply
          useNativeDriver: true,
        }).start();
      });
    } catch (error) {
      console.error('Error starting roundtable:', error);
      Alert.alert('Error', 'Failed to start roundtable discussion. Please try again.');
      
      // Fallback error replies with animation
      const errorReplies = defaultPersonas.map((persona, index) => {
        const fadeAnim = new Animated.Value(0);
        return {
          persona,
          text: 'Sorry, I encountered an error and cannot participate right now.',
          fadeAnim
        };
      });
      
      setReplies(errorReplies);
      
      // Animate error replies in
      errorReplies.forEach((reply, index) => {
        Animated.timing(reply.fadeAnim!, {
          toValue: 1,
          duration: 200,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });
    } finally {
      setLoading(false);
    }
  };

  const resetDiscussion = () => {
    setMessage('');
    setReplies([]);
    setHasAsked(false);
    setSpeakingIndex(null);
    Speech.stop();
  };

  const handleSpeak = (text: string, index: number) => {
    if (speakingIndex === index) {
      // Stop if already speaking this card
      Speech.stop();
      setSpeakingIndex(null);
      return;
    }
    
    // Stop any current speech and start new one
    Speech.stop();
    setSpeakingIndex(index);
    
    Speech.speak(text, {
      rate: 0.98,
      pitch: 1.0,
      onDone: () => setSpeakingIndex(null),
      onStopped: () => setSpeakingIndex(null),
      onError: () => setSpeakingIndex(null),
    });
  };

  const renderConversationItem = ({ item, index }: { item: RoundtableReply, index: number }) => (
    <Animated.View
      style={[
        styles.conversationRow,
        {
          opacity: item.fadeAnim || 1, // Fallback to 1 for existing replies
        },
      ]}
    >
      <View style={styles.rowContainer}>
        <Avatar name={item.persona} size={28} />
        <View style={styles.bubble}>
          <View style={styles.bubbleHeader}>
            <Text style={styles.personaName}>{PERSONA_DISPLAY_NAMES[item.persona] || item.persona}</Text>
            <TouchableOpacity
              style={styles.speakButton}
              onPress={() => handleSpeak(item.text, index)}
              activeOpacity={0.7}
              accessibilityLabel={speakingIndex === index ? "Stop audio playback" : "Speak reply aloud"}
            >
              <Text style={styles.speakButtonText}>
                {speakingIndex === index ? '⏹' : '🔊 Speak'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.replyText}>{item.text}</Text>
          
          {/* Render metadata badges */}
          {item.meta && (
            <View style={styles.badgeContainer}>
              {(item.meta.used?.facts || item.meta.facts) && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>📚 Facts used</Text>
                </View>
              )}
              {(item.meta.used?.quotes || item.meta.quotes) && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>📝 Snippet used</Text>
                </View>
              )}
            </View>
          )}
          
          <Text style={styles.disclaimer}>
            — Fictionalized, educational response. Audio generated with device TTS.
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <HeaderGradient />
      
      <Text style={styles.header}>Roundtable Discussion</Text>
      <Text style={styles.subheader}>
        Ask a question to {defaultPersonas.map(p => PERSONA_DISPLAY_NAMES[p] || p).join(', ')}
      </Text>

      {!hasAsked ? (
        <View style={styles.inputSection}>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="What would you like to discuss? (e.g., 'What is the meaning of life?')"
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.askButton, !message.trim() && styles.askButtonDisabled]}
            onPress={startDiscussion}
            disabled={!message.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.askButtonText}>Start Discussion</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>Question:</Text>
            <Text style={styles.questionText}>{message}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Gathering responses...</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={replies}
                renderItem={renderConversationItem}
                keyExtractor={(item, index) => `${item.persona}-${index}`}
                style={styles.conversationContainer}
                contentContainerStyle={styles.conversationContent}
                showsVerticalScrollIndicator={false}
              />
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetDiscussion}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>Ask Another Question</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.lg,
    paddingTop: 50, // Account for status bar
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  subheader: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.subtext,
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
    fontSize: 16,
    backgroundColor: theme.colors.bg,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  askButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  askButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  askButtonText: {
    color: theme.colors.bg,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.subtext,
    marginTop: 16,
  },
  conversationContainer: {
    flex: 1,
  },
  conversationContent: {
    paddingBottom: 24,
  },
  conversationRow: {
    marginBottom: theme.spacing.md,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bubble: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 12,
    flexShrink: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  personaName: {
    fontWeight: '800',
    color: theme.colors.text,
    fontSize: 16,
  },
  speakButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  speakButtonText: {
    fontSize: 11,
    color: theme.colors.accent,
  },
  replyText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.md,
    padding: 16,
    marginTop: 8,
  },
  resetButtonText: {
    color: theme.colors.bg,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
    marginTop: 8,
  },
});