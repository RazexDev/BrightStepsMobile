import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>🚀</Text>
        </View>
        <Text style={styles.title}>Bright<Text style={{color: '#3B82F6'}}>Steps</Text></Text>
        <Text style={styles.subtitle}>Empowering your child's learning journey with personalized growth tools.</Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity 
          style={styles.loginBtn} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginBtnText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signupBtn} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.signupBtnText}>Create an Account</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  iconContainer: { width: 120, height: 120, backgroundColor: '#EFF6FF', borderRadius: 60, justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5, marginBottom: 40 },
  emoji: { fontSize: 60 },
  title: { fontSize: 40, fontWeight: '900', color: '#0F172A', textAlign: 'center', letterSpacing: -1, marginBottom: 15 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  footer: { paddingHorizontal: 24, paddingBottom: 50 },
  loginBtn: { backgroundColor: '#3B82F6', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 15, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 4 },
  loginBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  signupBtn: { backgroundColor: '#F1F5F9', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  signupBtnText: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' }
});