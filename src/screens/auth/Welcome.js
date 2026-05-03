import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS, RADIUS } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>✨</Text>
        </Animated.View>
        <Text style={styles.title}>
          Bright<Text style={{ color: COLORS.primary }}>Steps</Text>
        </Text>
        <Text style={styles.subtitle}>
          Empowering your child's learning journey with personalized growth tools.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.loginBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginBtnText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.signupBtnText}>Create an Account</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>For students, parents & teachers 🌟</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconContainer: {
    width: 130, height: 130,
    backgroundColor: COLORS.bgMuted,
    borderRadius: 65,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 36,
    borderWidth: 3, borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 42, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', letterSpacing: -1.5, marginBottom: 16 },
  subtitle: { fontSize: 16, color: COLORS.textMid, textAlign: 'center', lineHeight: 26, fontWeight: '500' },
  footer: { paddingHorizontal: 24, paddingBottom: 44 },
  loginBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18, borderRadius: RADIUS.lg,
    alignItems: 'center', marginBottom: 14,
    ...SHADOWS.md,
    shadowColor: COLORS.primary,
  },
  loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  signupBtn: {
    backgroundColor: COLORS.bgCard,
    paddingVertical: 18, borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  signupBtnText: { color: COLORS.textDark, fontSize: 18, fontWeight: '800' },
  footerNote: { textAlign: 'center', marginTop: 20, fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
});