import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { logOut } from '@/firebase/auth';

export default function ProfileScreen() {
  const { userProfile, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        
        {userProfile && (
          <View style={styles.profileInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{userProfile.name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Student ID:</Text>
              <Text style={styles.value}>{userProfile.studentId}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Username:</Text>
              <Text style={[styles.value, !userProfile.username && styles.notSet]}>
                {userProfile.username || 'Not set'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Role:</Text>
              <Text style={styles.value}>{userProfile.role}</Text>
            </View>
            
            {user?.email && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60
  },
  content: {
    flex: 1,
    padding: 24
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
  },
  logoutButton: {
    backgroundColor: '#FF0000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
