import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatches } from '@/services/matches';
import { Match } from '@/models/Match';
import { logOut } from '@/firebase/auth';

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = subscribeToMatches((matchesList) => {
      setMatches(matchesList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderMatchItem = ({ item }: { item: Match }) => {
    const statusColors = {
      upcoming: '#FFA500',
      live: '#FF0000',
      completed: '#00AA00'
    };

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => router.push(`/match/${(item as any).id}`)}
      >
        <View style={styles.matchHeader}>
          <Text style={styles.matchTeams}>
            {item.teamA.name} vs {item.teamB.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[item.status] }
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {item.status === 'live' && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>
              {item.score.runs}/{item.score.wickets} ({item.score.overs}.
              {item.score.balls})
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crease</Text>
        <View style={styles.headerRight}>
          {userProfile && (
            <Text style={styles.userInfo}>
              {userProfile.name} ({userProfile.role})
            </Text>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {userProfile && (userProfile.role === 'admin' || userProfile.role === 'president') && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/admin/create-match')}
        >
          <Text style={styles.createButtonText}>+ Create Match</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No matches yet</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => (item as any).id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  userInfo: {
    fontSize: 14,
    color: '#666'
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600'
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#999'
  },
  listContent: {
    padding: 16
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  scoreContainer: {
    marginTop: 8
  },
  scoreText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  }
});

