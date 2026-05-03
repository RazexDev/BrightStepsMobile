import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUtils';
import { COLORS, SHADOWS, RADIUS } from '../theme';

import RoutineManager from '../screens/parent/RoutineManager';
import ResourceLibraryScreen from '../screens/shared/ResourceLibraryScreen';
import ProgressReportsScreen from '../screens/shared/ProgressReportsScreen';

import AnalyticsScreen from '../screens/teacher/AnalyticsScreen';

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
          tabBarIndicatorStyle: { backgroundColor: '#5EAD6E', height: 3, borderRadius: 2 },
          tabBarLabelStyle: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
          tabBarActiveTintColor: '#1E1007',
          tabBarInactiveTintColor: '#B8906A',
          tabBarStyle: { backgroundColor: '#FEFCF5', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F0E8D8' },
        }}
      >
        <Tab.Screen name="Routines" component={RoutineManager} />
        <Tab.Screen name="Resources" component={ResourceLibraryScreen} />
        <Tab.Screen name="Progress Reports" component={ProgressReportsScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgMain },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titleContainer: { flex: 1, paddingRight: 10 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 3, fontWeight: '600' },
  actionContainer: { flexDirection: 'row', alignItems: 'center' },
  profilePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: 6, paddingRight: 14, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm },
  badgeImage: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: COLORS.secondary },
  badgeFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  fallbackText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  badgeText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginLeft: 8, maxWidth: 70 },
  logoutButton: { marginLeft: 12, backgroundColor: '#FFF1EE', padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
