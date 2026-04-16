import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/imageUtils';

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Top Right Profile Badge */}
      <TouchableOpacity style={styles.topRightBadge} onPress={() => navigation.navigate('ProfileSettings')}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#6B4C30', marginRight: 8 }}>
          Hi, {user?.name ? user.name.split(' ')[0] : 'Teacher'}!
        </Text>
        {user?.profilePicUrl ? (
          <Image 
            source={{ uri: getImageUrl(user.profilePicUrl) }} 
            style={{ width: 35, height: 35, borderRadius: 20 }} 
          />
        ) : (
          <View style={{ width: 35, height: 35, borderRadius: 20, backgroundColor: '#3182CE', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.title}>Teacher Analytics</Text>
      <Text style={styles.subtitle}>Your team member will build this!</Text>
      
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F7F3' },
  topRightBadge: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#1E1007' },
  subtitle: { fontSize: 16, color: '#333', marginBottom: 40 },
  button: { marginTop: 30, backgroundColor: '#E85C45', padding: 12, borderRadius: 8, width: '80%', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});