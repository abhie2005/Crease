import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User } from '@/models/User';
import { Ionicons } from '@expo/vector-icons';

interface PlayerResultCardProps {
  player: User;
  onPress: (username?: string) => void;
}

export const PlayerResultCard: React.FC<PlayerResultCardProps> = ({ player, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(player.username)}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {player.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{player.name}</Text>
          {player.username && (
            <Text style={styles.username}>@{player.username}</Text>
          )}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{player.role}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#adb5bd" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 2
  },
  username: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    marginBottom: 6
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  }
});
