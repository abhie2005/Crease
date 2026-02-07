/**
 * User profile screen by username.
 * Displays public profile (name, username, student ID, role), recently played, pinned performance, match history (respecting privacy).
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserByUsername } from '@/services/users';
import { useAuth } from '@/providers/AuthProvider';
import { User } from '@/models/User';
import { ProfileContent } from '@/components/profile/ProfileContent';
import { setPinnedPerformance, clearPinnedPerformance } from '@/services/users';
import { COLORS } from '@/theme/colors';

/**
 * Screen that shows a user's public profile when navigating by username (e.g. /user/johndoe).
 * Respects privacy toggles for recently played, match history, and pinned performance.
 */
export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { userProfile: currentUser, refreshUserProfile } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isOwnProfile = !!(
    currentUser?.username &&
    username &&
    currentUser.username.toLowerCase() === String(username).toLowerCase()
  );

  useEffect(() => {
    const fetchUser = async () => {
      if (!username) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await getUserByUsername(username);
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  const handlePin = async (matchId: string, type: 'batting' | 'bowling') => {
    if (!currentUser?.uid || !isOwnProfile) return;
    try {
      await setPinnedPerformance(currentUser.uid, matchId, type);
      await refreshUserProfile?.();
      setUser((prev) => prev ? { ...prev, pinnedPerformance: { matchId, type } } : null);
    } catch (e) {
      Alert.alert('Error', 'Failed to pin performance');
    }
  };

  const handleUnpin = async () => {
    if (!currentUser?.uid || !isOwnProfile) return;
    try {
      await clearPinnedPerformance(currentUser.uid);
      await refreshUserProfile?.();
      setUser((prev) => prev ? { ...prev, pinnedPerformance: undefined } : null);
    } catch (e) {
      Alert.alert('Error', 'Failed to unpin');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[COLORS.DARK_TEAL, COLORS.DARK_TEAL_LIGHTER]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.MINT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[COLORS.DARK_TEAL, COLORS.DARK_TEAL_LIGHTER]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[COLORS.DARK_TEAL, COLORS.DARK_TEAL_LIGHTER]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            {isOwnProfile && (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => router.push('/profile/setup')}
                >
                  <Text style={styles.headerBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => router.push('/profile/settings')}
                >
                  <Text style={styles.headerBtnText}>Settings</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.title}>User Profile</Text>

          <ProfileContent
            user={user}
            isOwnProfile={isOwnProfile}
            showRecentlyPlayed={user.showRecentlyPlayed !== false}
            showMatchHistory={user.showMatchHistory !== false}
            showPinnedPerformance={user.showPinnedPerformance !== false}
            onPin={isOwnProfile ? handlePin : undefined}
            onUnpin={isOwnProfile ? handleUnpin : undefined}
            onRefreshUser={isOwnProfile ? () => getUserByUsername(String(username)).then(setUser) : undefined}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.MINT,
    fontWeight: '600'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  headerBtnText: {
    fontSize: 15,
    color: COLORS.MINT,
    fontWeight: '600'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24
  }
});
