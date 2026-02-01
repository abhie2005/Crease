/**
 * Profile tab: user info, recently played, pinned performance, match history, Edit, Settings, logout.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { logOut } from '@/firebase/auth';
import { setPinnedPerformance, clearPinnedPerformance } from '@/services/users';
import { Button } from '@/components/Button';
import { ProfileContent } from '@/components/profile/ProfileContent';

/** Profile screen with user details, stats sections, Edit, Settings, and logout. */
export default function ProfileScreen() {
  const { userProfile, user, refreshUserProfile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const handlePin = async (matchId: string, type: 'batting' | 'bowling') => {
    if (!userProfile?.uid) return;
    try {
      await setPinnedPerformance(userProfile.uid, matchId, type);
      await refreshUserProfile?.();
    } catch (e) {
      Alert.alert('Error', 'Failed to pin performance');
    }
  };

  const handleUnpin = async () => {
    if (!userProfile?.uid) return;
    try {
      await clearPinnedPerformance(userProfile.uid);
      await refreshUserProfile?.();
    } catch (e) {
      Alert.alert('Error', 'Failed to unpin');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
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
          </View>

          {userProfile ? (
            <>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {userProfile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              {user?.email && (
                <View style={styles.emailRow}>
                  <Text style={styles.emailLabel}>Email</Text>
                  <Text style={styles.emailValue}>{user.email}</Text>
                </View>
              )}
              <ProfileContent
                user={userProfile}
                isOwnProfile
                showRecentlyPlayed={userProfile.showRecentlyPlayed !== false}
                showMatchHistory={userProfile.showMatchHistory !== false}
                showPinnedPerformance={userProfile.showPinnedPerformance !== false}
                onPin={handlePin}
                onUnpin={handleUnpin}
                onRefreshUser={refreshUserProfile}
              />
              <View style={styles.buttonContainer}>
                <Button
                  title="Logout"
                  onPress={handleLogout}
                  variant="secondary"
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No profile data available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
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
    color: '#007AFF',
    fontWeight: '600'
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  emailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  emailLabel: {
    fontSize: 14,
    color: '#666'
  },
  emailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#999'
  }
});
