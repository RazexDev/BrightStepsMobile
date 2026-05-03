import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api/axiosConfig';
import { COLORS, SHADOWS, RADIUS } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { login, updateUser } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    (async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hardware && enrolled) setIsBiometricSupported(true);
    })();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBiometricAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('biometricToken');
      const storedUser = await AsyncStorage.getItem('biometricUser');
      if (!storedToken || !storedUser) {
        Alert.alert('Setup Required', 'Please log in with your password first to enable biometrics.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to Bright Steps',
        fallbackLabel: 'Use Password'
      });
      if (result.success) {
        await AsyncStorage.setItem('token', storedToken);
        await AsyncStorage.setItem('user', storedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        await updateUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.log('Biometric error:', e);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Network error. Check your connection and try again.';
      Alert.alert('Login Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </TouchableOpacity>

          {isBiometricSupported && (
            <TouchableOpacity style={styles.biometricBtn} activeOpacity={0.85} onPress={handleBiometricAuth}>
              <Ionicons name="finger-print-outline" size={22} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={styles.biometricText}>Log in with Biometrics</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgMain },
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { marginTop: 16, marginBottom: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center', ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border },
  header: { alignItems: 'center', marginBottom: 36, marginTop: 14 },
  emoji: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.textMid, marginTop: 6, fontWeight: '500' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, height: 54, ...SHADOWS.sm },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.textDark },
  eyeBtn: { padding: 6 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 28, marginTop: -6 },
  forgotText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  button: { backgroundColor: COLORS.primary, paddingVertical: 17, borderRadius: RADIUS.lg, alignItems: 'center', ...SHADOWS.md, shadowColor: COLORS.primary },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  biometricBtn: { flexDirection: 'row', backgroundColor: COLORS.bgCard, paddingVertical: 15, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginTop: 14, borderWidth: 1.5, borderColor: COLORS.border },
  biometricText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  registerLink: { alignItems: 'center', marginTop: 22 },
  registerLinkText: { fontSize: 14, color: COLORS.textMid, fontWeight: '500' },
});