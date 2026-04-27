import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUtils';

import RoutineManager from '../screens/parent/RoutineManager';
import ResourceLibraryScreen from '../screens/shared/ResourceLibraryScreen';
import ProgressReportsScreen from '../screens/shared/ProgressReportsScreen';
import TeacherChatScreen from '../screens/shared/TeacherChatScreen';

const Tab = createMaterialTopTabNavigator();

export default function ParentDashboardTabs() {
  const { user, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Parent Portal</Text>
          <Text style={styles.headerSubtitle}>Manage your child's progress</Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.profilePill} onPress={() => navigation.navigate('ProfileSettings')}>
            {user?.profilePicUrl ? (
              <Image 
                source={{ uri: getImageUrl(user.profilePicUrl) }} 
                style={styles.badgeImage} 
              />
            ) : (
              <View style={styles.badgeFallback}>
                <Text style={styles.fallbackText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
                </Text>
              </View>
            )}
            <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
              {user?.name ? user.name.split(' ')[0] : 'Parent'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Tab.Navigator
        screenOptions={{
          swipeEnabled: true,
          tabBarScrollEnabled: true,
          tabBarItemStyle: { width: 'auto', paddingHorizontal: 16 },
          tabBarIndicatorStyle: { backgroundColor: '#10B981', height: 4, borderRadius: 2 },
          tabBarLabelStyle: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
          tabBarActiveTintColor: '#0F172A',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: { backgroundColor: '#F8FAFC', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
        }}
      >
        <Tab.Screen name="Routines" component={RoutineManager} />
        <Tab.Screen name="Resources" component={ResourceLibraryScreen} />
        <Tab.Screen name="Progress Reports" component={ProgressReportsScreen} />
        <Tab.Screen name="Teacher Chat" component={TeacherChatScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, backgroundColor: '#F8FAFC' },
  titleContainer: { flex: 1, paddingRight: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '500' },
  actionContainer: { flexDirection: 'row', alignItems: 'center' },
  profilePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 6, paddingRight: 14, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  badgeImage: { width: 32, height: 32, borderRadius: 16 },
  badgeFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  fallbackText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#334155', marginLeft: 8, maxWidth: 70 },
  logoutButton: { marginLeft: 12, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
