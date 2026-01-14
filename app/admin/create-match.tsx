import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { createMatch } from '@/services/matches';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function CreateMatchScreen() {
  const { userProfile } = useAuth();
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [umpireUid, setUmpireUid] = useState('');
  const [teamAPlayers, setTeamAPlayers] = useState('');
  const [teamBPlayers, setTeamBPlayers] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check authorization
  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'president')) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unauthorized access</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCreate = async () => {
    if (!teamAName.trim() || !teamBName.trim() || !umpireUid.trim()) {
      Alert.alert('Error', 'Please fill in team names and umpire UID');
      return;
    }

    setLoading(true);
    try {
      const teamAPlayerUids = teamAPlayers
        .split(',')
        .map(uid => uid.trim())
        .filter(uid => uid.length > 0);

      const teamBPlayerUids = teamBPlayers
        .split(',')
        .map(uid => uid.trim())
        .filter(uid => uid.length > 0);

      const matchId = await createMatch(
        userProfile.uid,
        umpireUid.trim(),
        { name: teamAName.trim(), playerUids: teamAPlayerUids },
        { name: teamBName.trim(), playerUids: teamBPlayerUids }
      );

      Alert.alert('Success', 'Match created successfully', [
        {
          text: 'OK',
          onPress: () => router.push(`/match/${matchId}`)
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Match</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Match Details</Text>

          <Input
            label="Team A Name"
            value={teamAName}
            onChangeText={setTeamAName}
            placeholder="Enter team A name"
            autoCapitalize="words"
          />

          <Input
            label="Team A Player UIDs (comma-separated)"
            value={teamAPlayers}
            onChangeText={setTeamAPlayers}
            placeholder="uid1, uid2, uid3..."
            multiline
            numberOfLines={3}
          />

          <Input
            label="Team B Name"
            value={teamBName}
            onChangeText={setTeamBName}
            placeholder="Enter team B name"
            autoCapitalize="words"
          />

          <Input
            label="Team B Player UIDs (comma-separated)"
            value={teamBPlayers}
            onChangeText={setTeamBPlayers}
            placeholder="uid1, uid2, uid3..."
            multiline
            numberOfLines={3}
          />

          <Input
            label="Umpire UID"
            value={umpireUid}
            onChangeText={setUmpireUid}
            placeholder="Enter umpire user ID"
          />

          <Button
            title="Create Match"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center'
  }
});
