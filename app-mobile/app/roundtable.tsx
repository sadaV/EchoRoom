import React, { useState } from 'react';
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
import * as Speech from 'expo-speech';
import { API_BASE } from '../config';
import { getSessionId } from './utils/session';

interface RoundtableReply {
  persona: string;
  text: string;
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
      setReplies(data.replies);
    } catch (error) {
      console.error('Error starting roundtable:', error);
      Alert.alert('Error', 'Failed to start roundtable discussion. Please try again.');
      
      // Fallback error replies
      setReplies(defaultPersonas.map(persona => ({
        persona,
        text: 'Sorry, I encountered an error and cannot participate right now.'
      })));
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

  const renderReply = (reply: RoundtableReply, index: number) => (
    <View key={index} style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <Text style={styles.personaName}>{reply.persona}</Text>
        <TouchableOpacity
          style={styles.speakerButton}
          onPress={() => handleSpeak(reply.text, index)}
          activeOpacity={0.7}
        >
          <Text style={styles.speakerButtonText}>
            {speakingIndex === index ? '⏹' : '🔊'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Render metadata badges */}
      {reply.meta && (
        <View style={styles.badgeContainer}>
          {(reply.meta.used?.facts || reply.meta.facts) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📚 Facts used</Text>
            </View>
          )}
          {(reply.meta.used?.quotes || reply.meta.quotes) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📝 Snippet used</Text>
            </View>
          )}
        </View>
      )}
      
      <Text style={styles.replyText}>{reply.text}</Text>
      
      {/* Add disclaimer */}
      <Text style={styles.disclaimer}>
        — Fictionalized, educational response.
      </Text>
      <Text style={styles.ttsDisclaimer}>
        Audio generated with device TTS.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Roundtable Discussion</Text>
      <Text style={styles.subheader}>
        Ask a question to {defaultPersonas.join(', ')}
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
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Gathering responses...</Text>
            </View>
          ) : (
            <ScrollView style={styles.repliesContainer} contentContainerStyle={styles.repliesContent}>
              {replies.map(renderReply)}
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetDiscussion}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>Ask Another Question</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subheader: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  askButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
  },
  askButtonDisabled: {
    backgroundColor: '#ccc',
  },
  askButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  repliesContainer: {
    flex: 1,
  },
  repliesContent: {
    paddingBottom: 20,
  },
  replyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  personaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  speakerButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  speakerButtonText: {
    fontSize: 14,
  },
  replyText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  resetButtonText: {
    color: '#fff',
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
    marginTop: 8,
  },
  ttsDisclaimer: {
    fontSize: 10,
    color: '#bbb',
    fontStyle: 'italic',
    marginTop: 2,
  },
});