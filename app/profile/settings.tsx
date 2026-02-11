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
import { useSafeAreaHeader } from '@/hooks/useSafeAreaHeader';
import { useAuth } from '@/providers/AuthProvider';
import { getUser } from '@/services/users';
import { updatePrivacy } from '@/services/users';
import { User } from '@/models/User';
import { ThemedBackground } from '@/components/ThemedBackground';
import { useTheme } from '@/providers/ThemeProvider';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { headerStyle } = useSafeAreaHeader();
  const { user: authUser, userProfile, refreshUserProfile } = useAuth();
  const { theme, colors, setTheme } = useTheme();
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
      <View style={styles.container}>
        <ThemedBackground>
        <View style={[styles.header, headerStyle, { backgroundColor: colors.backgroundLighter, borderBottomColor: colors.borderDefault }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
        </ThemedBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedBackground>
      <View style={[styles.header, headerStyle, { backgroundColor: colors.backgroundLighter, borderBottomColor: colors.borderDefault }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy</Text>
      </View>
      <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderDefault }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Theme</Text>
        <View style={[styles.row, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Appearance</Text>
          <View style={styles.themeButtons}>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === 'dark' && { backgroundColor: colors.accent },
                { borderColor: colors.borderDefault }
              ]}
              onPress={() => setTheme('dark')}
            >
              <Text style={[styles.themeBtnText, { color: theme === 'dark' ? '#fff' : colors.textSecondary }]}>Dark</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === 'light' && { backgroundColor: colors.accent },
                { borderColor: colors.borderDefault }
              ]}
              onPress={() => setTheme('light')}
            >
              <Text style={[styles.themeBtnText, { color: theme === 'light' ? '#fff' : colors.textSecondary }]}>Light</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.borderDefault }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>What others can see on your profile</Text>
        <View style={[styles.row, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Show recently played</Text>
          <Switch
            value={showRecentlyPlayed}
            onValueChange={(v) => handleToggle('showRecentlyPlayed', v)}
            disabled={saving}
            trackColor={{ false: colors.borderDefault, true: colors.accent }}
          />
        </View>
        <View style={[styles.row, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Show match history</Text>
          <Switch
            value={showMatchHistory}
            onValueChange={(v) => handleToggle('showMatchHistory', v)}
            disabled={saving}
            trackColor={{ false: colors.borderDefault, true: colors.accent }}
          />
        </View>
        <View style={[styles.row, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Show pinned performance</Text>
          <Switch
            value={showPinnedPerformance}
            onValueChange={(v) => handleToggle('showPinnedPerformance', v)}
            disabled={saving}
            trackColor={{ false: colors.borderDefault, true: colors.accent }}
          />
        </View>
      </View>
      </ThemedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  backBtn: {
    marginRight: 12
  },
  backText: {
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8
  },
  themeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  themeBtnText: {
    fontSize: 14,
    fontWeight: '600'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  label: {
    fontSize: 16,
    fontWeight: '500'
  }
});
