import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';

export default function StudentDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>✨ BrightSteps</Text>
          <View style={styles.headerRight}>
            <Text style={styles.greeting}>Hi, {user?.name || 'Student'}! 👋</Text>
            {/* The PIN Gateway is still here! */}
            <TouchableOpacity onPress={() => navigation.navigate('ParentHub')} style={styles.parentBtn}>
              <Text style={styles.parentBtnText}>⚙️ Parent Portal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroStar}>🌟</Text>
          <Text style={styles.heroTitle}>What are we <Text style={{color: '#E85C45'}}>doing</Text> today?</Text>
          <Text style={styles.heroSubtitle}>Pick something and let&apos;s have fun! 🚀</Text>
        </View>

        {/* Adventure Cards */}
        <Text style={styles.sectionLabel}>🧭 CHOOSE YOUR ADVENTURE</Text>

        <View style={styles.cardsWrapper}>
          {/* Card 1: Routine */}
          <View style={[styles.card, { borderLeftColor: '#5EAD6E' }]}>
            <Text style={styles.cardEmoji}>📅</Text>
            <Text style={styles.cardTitle}>My Routine</Text>
            <Text style={styles.cardDesc}>See what&apos;s happening today!</Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#5EAD6E' }]}>
              <Text style={styles.cardBtnText}>Let&apos;s Go! ❯</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Games (This links to your GameHub!) */}
          <View style={[styles.card, { borderLeftColor: '#E85C45' }]}>
            <Text style={styles.cardEmoji}>🎮</Text>
            <Text style={styles.cardTitle}>Play Games</Text>
            <Text style={styles.cardDesc}>Fun games that help you learn.</Text>
            <TouchableOpacity 
              style={[styles.cardBtn, { backgroundColor: '#E85C45' }]}
              onPress={() => navigation.navigate('StudentHub')} // Links to GameHub
            >
              <Text style={styles.cardBtnText}>Play Now! ❯</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Resources */}
          <View style={[styles.card, { borderLeftColor: '#44A7CE' }]}>
            <Text style={styles.cardEmoji}>📚</Text>
            <Text style={styles.cardTitle}>Resources</Text>
            <Text style={styles.cardDesc}>Explore learning materials!</Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#44A7CE' }]}>
              <Text style={styles.cardBtnText}>Explore! ❯</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FEFCF5' },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#1E1007' },
  headerRight: { alignItems: 'flex-end' },
  greeting: { fontSize: 16, fontWeight: 'bold', color: '#1E1007' },
  parentBtn: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#FEF4CC', borderRadius: 12 },
  parentBtnText: { fontSize: 12, fontWeight: 'bold', color: '#C8881A' },
  hero: { alignItems: 'center', marginBottom: 40 },
  heroStar: { fontSize: 50, marginBottom: 10 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#1E1007', textAlign: 'center' },
  heroSubtitle: { fontSize: 16, color: '#6B4C30', marginTop: 8 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#B8906A', letterSpacing: 1, marginBottom: 15 },
  cardsWrapper: { gap: 15 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderLeftWidth: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardEmoji: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1007', marginBottom: 5 },
  cardDesc: { fontSize: 14, color: '#6B4C30', marginBottom: 15 },
  cardBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  cardBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  logoutBtn: { marginTop: 40, alignSelf: 'center' },
  logoutText: { color: '#E85C45', fontWeight: 'bold', fontSize: 16 }
});