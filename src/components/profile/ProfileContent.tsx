/**
 * Shared profile content: basic info, recently played, pinned performance, match history.
 * Used on (tabs)/profile and user/[username] with visibility from privacy toggles.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User } from '@/models/User';
import { RecentlyPlayedSection } from './RecentlyPlayedSection';
import { PinnedPerformanceSection } from './PinnedPerformanceSection';
import { MatchHistorySection } from './MatchHistorySection';
import { useTheme } from '@/providers/ThemeProvider';

export interface ProfileContentProps {
  user: User;
  isOwnProfile: boolean;
  /** For visitors: show recently played (default true). Owner always sees. */
  showRecentlyPlayed?: boolean;
  /** For visitors: show match history (default true). Owner always sees. */
  showMatchHistory?: boolean;
  /** For visitors: show pinned performance (default true). Owner always sees. */
  showPinnedPerformance?: boolean;
  onPin?: (matchId: string, type: 'batting' | 'bowling') => void;
  onUnpin?: () => void;
  onRefreshUser?: () => void;
}

function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'president':
      return 'President';
    case 'player':
      return 'Player';
    default:
      return role;
  }
}

export const ProfileContent: React.FC<ProfileContentProps> = ({
  user,
  isOwnProfile,
  showRecentlyPlayed = true,
  showMatchHistory = true,
  showPinnedPerformance = true,
  onPin,
  onUnpin,
  onRefreshUser
}) => {
  const { colors } = useTheme();
  const showRecent = isOwnProfile || showRecentlyPlayed !== false;
  const showHistory = isOwnProfile || showMatchHistory !== false;
  const showPinned = isOwnProfile || showPinnedPerformance !== false;
  const hasPin = !!(user.pinnedPerformance?.matchId);

  return (
    <View style={styles.container}>
      <View style={[styles.basicInfo, { backgroundColor: colors.cardBg, borderColor: colors.borderDefault }]}>
        <View style={[styles.infoRow, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>Name</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{user.name}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>Username</Text>
          <Text style={[styles.value, !user.username && styles.notSet, { color: user.username ? colors.textPrimary : colors.textTertiary }]}>
            {user.username || 'Not set'}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>Student ID</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{user.studentId}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: colors.borderDefault }]}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>Role</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{getRoleDisplayName(user.role)}</Text>
        </View>
      </View>

      {showRecent && (
        <RecentlyPlayedSection
          user={user}
          isOwnProfile={isOwnProfile}
          onPin={isOwnProfile ? onPin : undefined}
          hasExistingPin={hasPin}
        />
      )}

      {showPinned && (
        <PinnedPerformanceSection
          user={user}
          isOwnProfile={isOwnProfile}
          onUnpin={isOwnProfile ? onUnpin : undefined}
        />
      )}

      {showHistory && (
        <MatchHistorySection
          user={user}
          isOwnProfile={isOwnProfile}
          onPin={isOwnProfile ? onPin : undefined}
          hasExistingPin={hasPin}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8
  },
  basicInfo: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 44
  },
  label: {
    fontSize: 16,
    fontWeight: '500'
  },
  value: {
    fontSize: 16,
    fontWeight: '600'
  },
  notSet: {
    fontStyle: 'italic' as const
  }
});
