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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { logOut } from '@/firebase/auth';
import { setPinnedPerformance, clearPinnedPerformance } from '@/services/users';
import { Button } from '@/components/Button';
import { ProfileContent } from '@/components/profile/ProfileContent';
import { COLORS } from '@/theme/colors';

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
      <LinearGradient
        colors={[COLORS.DARK_TEAL, COLORS.DARK_TEAL_LIGHTER]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {userProfile ? (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.profileHeaderTop}>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.push('/profile/setup')}
                  >
                    <Text style={styles.iconButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.push('/profile/settings')}
                  >
                    <Text style={styles.iconButtonText}>⚙️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.profileCard}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {userProfile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <Text style={styles.profileUsername}>@{userProfile.username}</Text>
                
                <View style={styles.profileDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Role</Text>
                    <Text style={styles.detailValue}>{userProfile.role}</Text>
                  </View>
                  {userProfile.studentId && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Student ID</Text>
                      <Text style={styles.detailValue}>{userProfile.studentId}</Text>
                    </View>
                  )}
                  {user?.email && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{user.email}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.content}>
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
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No profile data available</Text>
          </View>
        )}
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
  profileHeader: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24
  },
  profileHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.CARD_BG,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER_DEFAULT
  },
  iconButtonText: {
    fontSize: 16
  },
  profileCard: {
    backgroundColor: COLORS.CARD_BG_ELEVATED,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER_DEFAULT
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff'
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  profileUsername: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 20
  },
  profileDetails: {
    width: '100%',
    gap: 12
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  content: {
    padding: 16
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)'
  }
});
