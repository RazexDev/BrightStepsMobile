import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api/axiosConfig';

export default function LoginScreen({ navigation }) {
  const { login, updateUser } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    (async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hardware && enrolled) {
        setIsBiometricSupported(true);
      }
    })();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
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
        // Re-hydrate the active session!
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
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        {isBiometricSupported && (
          <TouchableOpacity style={styles.biometricButton} activeOpacity={0.8} onPress={handleBiometricAuth}>
            <Ionicons name="finger-print-outline" size={24} color="#3B82F6" style={{ marginRight: 10 }} />
            <Text style={styles.biometricText}>Log in with Biometrics</Text>
          </TouchableOpacity>
        )}

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  innerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backButton: { position: 'absolute', top: 60, left: 10, zIndex: 10, padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  headerContainer: { marginBottom: 40, marginTop: 40 },
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#0F172A' },
  eyeIcon: { padding: 8 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 30 },
  forgotText: { color: '#3B82F6', fontWeight: '600', fontSize: 14 },
  button: { backgroundColor: '#3B82F6', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  biometricButton: { flexDirection: 'row', backgroundColor: '#EFF6FF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 15, borderWidth: 1, borderColor: '#DBEAFE' },
  biometricText: { color: '#3B82F6', fontSize: 16, fontWeight: '700' }
});