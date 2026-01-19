import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserByUsername } from '@/services/users';
import { User } from '@/models/User';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>User Profile</Text>

          <View style={styles.profileInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{user.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Username:</Text>
              <Text style={[styles.value, !user.username && styles.notSet]}>
                {user.username || 'Not set'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Student ID:</Text>
              <Text style={styles.value}>{user.studentId}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Role:</Text>
              <Text style={styles.value}>{user.role}</Text>
            </View>
          </View>
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
    flex: 1,
    padding: 24
  },
  header: {
    marginBottom: 16
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 24
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24
  },
  profileInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 44
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  },
  notSet: {
    color: '#999',
    fontStyle: 'italic'
  }
});
