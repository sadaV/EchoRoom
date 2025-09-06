import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { API_BASE } from '../config';

interface Persona {
  name: string;
  description?: string;
  speakingStyle?: string;
}

export default function PersonasScreen() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchDiagnostics = async () => {
    try {
      const response = await fetch(`${API_BASE}/diag/agent`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      Alert.alert('Agent Diagnostics', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      Alert.alert('Error', 'Failed to fetch diagnostics information.');
    }
  };

  const renderPersona = ({ item }: { item: Persona }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handlePersonaPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardDescription}>
        {item.description || `Speaking style: ${item.speakingStyle || 'conversational'}`}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading personas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose a Persona</Text>
      <FlatList
        data={personas}
        renderItem={renderPersona}
        keyExtractor={(item) => item.name}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
      />
      <TouchableOpacity 
        style={styles.roundtableButton}
        onPress={() => router.push('/roundtable')}
        activeOpacity={0.7}
      >
        <Text style={styles.roundtableButtonText}>Start Roundtable Discussion</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.diagnosticsButton}
        onPress={fetchDiagnostics}
        activeOpacity={0.7}
      >
        <Text style={styles.diagnosticsButtonText}>Diagnostics</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 80,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 0.48,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  roundtableButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  roundtableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  diagnosticsButton: {
    backgroundColor: '#424242',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  diagnosticsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});