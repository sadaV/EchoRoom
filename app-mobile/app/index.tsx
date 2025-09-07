import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Animated, SafeAreaView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { API_BASE } from '../config';
import { theme } from './theme';
import Avatar from './components/Avatar';
import { PERSONA_DISPLAY_NAMES, PERSONA_TAGLINE, HOME_TITLE } from './constants/personas';

interface Persona {
  name: string;
  description?: string;
  speakingStyle?: string;
}

// Constants for grid layout
const COLS = 2;
const H_PAD = 20;
const GAP = 14;

export default function PersonasScreen() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const response = await fetch(`${API_BASE}/personas`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setPersonas(data);
    } catch (error) {
      console.error('Error fetching personas:', error);
      Alert.alert('Error', 'Failed to load personas. Using default personas.');
      // Fallback to default personas
      setPersonas([
        { name: 'Einstein', description: 'Brilliant physicist known for relativity theory', speakingStyle: 'thoughtful and scientific' },
        { name: 'Shakespeare', description: 'Master playwright and poet of the English Renaissance', speakingStyle: 'eloquent and dramatic' },
        { name: 'Cleopatra', description: 'Legendary queen of ancient Egypt', speakingStyle: 'regal and commanding' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonaPress = (persona: Persona) => {
    router.push(`/chat?persona=${encodeURIComponent(persona.name)}`);
  };

  // Compute tile size based on screen width
  const size = Math.floor((width - H_PAD * 2 - GAP * (COLS - 1)) / COLS);

  const AnimatedPersonaCard = ({ item }: { item: Persona }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    };
    
    return (
      <TouchableOpacity 
        onPress={() => handlePersonaPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1} // Disable default opacity since we're using scale
      >
        <Animated.View 
          style={[
            styles.card,
            {
              width: size,
              height: size,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Avatar name={item.name} size={28} />
            <Text 
              style={styles.cardTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {PERSONA_DISPLAY_NAMES[item.name] || item.name}
            </Text>
          </View>
          <Text 
            style={styles.cardTagline}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {PERSONA_TAGLINE[item.name] || item.description || `Speaking style: ${item.speakingStyle || 'conversational'}`}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderPersona = ({ item }: { item: Persona }) => <AnimatedPersonaCard item={item} />;

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.colors.bg }]}>
        <Text style={styles.loadingText}>Loading personas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.headerContainer}>
        <View style={styles.titleSection}>
          <Text style={styles.header}>EchoRoom</Text>
          <Text style={styles.subtitle}>
            Ever wish you could hear what these icons would say about your ideas? Start the conversation.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.roundtableIconButton}
          onPress={() => router.push('/roundtable')}
          activeOpacity={0.7}
        >
          <Text style={styles.roundtableIconText}>🗣️</Text>
          <Text style={styles.roundtableIconLabel}>Roundtable</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={personas}
        renderItem={renderPersona}
        keyExtractor={(item) => item.name}
        numColumns={COLS}
        columnWrapperStyle={{ gap: GAP, justifyContent: 'space-between' }}
        contentContainerStyle={{ 
          paddingHorizontal: H_PAD, 
          paddingTop: 16, 
          paddingBottom: 40, 
          rowGap: GAP 
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titleSection: {
    flex: 1,
    marginRight: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.subtext,
    lineHeight: 20,
    maxWidth: '90%',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.subtext,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginLeft: 8,
    textTransform: 'capitalize',
    flex: 1,
  },
  cardTagline: {
    fontSize: 14,
    color: theme.colors.subtext,
    lineHeight: 18,
    marginTop: 2,
  },
  roundtableIconButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roundtableIconText: {
    fontSize: 16,
    marginBottom: 2,
  },
  roundtableIconLabel: {
    color: theme.colors.bg,
    fontSize: 11,
    fontWeight: 'bold',
  },
});