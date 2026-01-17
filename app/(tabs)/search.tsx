import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { searchUsersByUsername } from '@/services/users';
import { User } from '@/models/User';
import { Input } from '@/components/Input';

export default function SearchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchUsersByUsername(query, user?.uid);
      setResults(searchResults);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (user: User) => {
    if (user.username) {
      router.push(`/user/${user.username}`);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#FF6B6B';
      case 'president':
        return '#FFA500';
      case 'player':
        return '#007AFF';
      default:
        return '#666';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'president':
        return 'President';
      case 'player':
        return 'Player';
      default:
        return role;
    }
  };

  const renderResultItem = ({ item }: { item: User }) => {
    if (!item.username) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <Text style={styles.username}>@{item.username}</Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleBadgeColor(item.role) }
              ]}
            >
              <Text style={styles.roleText}>{getRoleDisplayName(item.role)}</Text>
            </View>
          </View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.studentId}>Student ID: {item.studentId}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={48} color="#999" />
          <Text style={styles.emptyText}>
            No users found matching "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Search Users</Text>
        <Text style={styles.emptySubtitle}>
          Start typing to search for users by username
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by username..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </View>

      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={
          results.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmptyState}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  loadingIndicator: {
    marginTop: 8,
    marginLeft: 8
  },
  list: {
    padding: 16
  },
  emptyList: {
    flex: 1
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  resultContent: {
    flex: 1
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  roleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  name: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  studentId: {
    fontSize: 12,
    color: '#999'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 16
  }
});