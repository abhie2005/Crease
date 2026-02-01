/**
 * Profile settings: privacy toggles (show recently played, match history, pinned performance to others).
 * Accessed from Profile tab; only for current user.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { getUser } from '@/services/users';
import { updatePrivacy } from '@/services/users';
import { User } from '@/models/User';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user: authUser, userProfile, refreshUserProfile } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showRecentlyPlayed, setShowRecentlyPlayed] = useState(true);
  const [showMatchHistory, setShowMatchHistory] = useState(true);
  const [showPinnedPerformance, setShowPinnedPerformance] = useState(true);

  useEffect(() => {
    if (!authUser?.uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getUser(authUser.uid).then((u) => {
      if (!cancelled && u) {
        setProfile(u);
        setShowRecentlyPlayed(u.showRecentlyPlayed !== false);
        setShowMatchHistory(u.showMatchHistory !== false);
        setShowPinnedPerformance(u.showPinnedPerformance !== false);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [authUser?.uid]);

  const handleToggle = async (
    key: 'showRecentlyPlayed' | 'showMatchHistory' | 'showPinnedPerformance',
    value: boolean
  ) => {
    if (!authUser?.uid || saving) return;
    const prev = {
      showRecentlyPlayed,
      showMatchHistory,
      showPinnedPerformance
    };
    const next = { ...prev, [key]: value };
    setShowRecentlyPlayed(next.showRecentlyPlayed);
    setShowMatchHistory(next.showMatchHistory);
    setShowPinnedPerformance(next.showPinnedPerformance);
    setSaving(true);
    try {
      await updatePrivacy(authUser.uid, {
        showRecentlyPlayed: next.showRecentlyPlayed,
        showMatchHistory: next.showMatchHistory,
        showPinnedPerformance: next.showPinnedPerformance
      });
      await refreshUserProfile?.();
    } catch (e) {
      Alert.alert('Error', 'Failed to save privacy settings');
      setShowRecentlyPlayed(prev.showRecentlyPlayed);
      setShowMatchHistory(prev.showMatchHistory);
      setShowPinnedPerformance(prev.showPinnedPerformance);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Privacy</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What others can see on your profile</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Show recently played</Text>
          <Switch
            value={showRecentlyPlayed}
            onValueChange={(v) => handleToggle('showRecentlyPlayed', v)}
            disabled={saving}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Show match history</Text>
          <Switch
            value={showMatchHistory}
            onValueChange={(v) => handleToggle('showMatchHistory', v)}
            disabled={saving}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Show pinned performance</Text>
          <Switch
            value={showPinnedPerformance}
            onValueChange={(v) => handleToggle('showPinnedPerformance', v)}
            disabled={saving}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8'
  },
  backBtn: {
    marginRight: 12
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  }
});
