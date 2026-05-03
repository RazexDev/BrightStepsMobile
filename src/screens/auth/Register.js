import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [parentPin, setParentPin] = useState('');
  const [role, setRole] = useState('parent');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) return Alert.alert('Missing Info', 'Please fill all fields.');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match.');
    if (role === 'parent' && (!parentPin || parentPin.length !== 4)) return Alert.alert('Invalid PIN', 'Parent PIN must be exactly 4 digits.');
    setLoading(true);
    try {
      await register(name, email, password, role, parentPin);
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.title}>Join BrightSteps</Text>
            <Text style={styles.subtitle}>Create your account and start the journey</Text>
          </View>

          {/* Role Toggle */}
          <View style={styles.roleRow}>
            {['parent', 'teacher'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                  {r === 'parent' ? '👨‍👩‍👧 Parent / Student' : '👨‍🏫 Teacher'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Inputs */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

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
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create a password"
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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor={COLORS.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          {role === 'parent' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parent PIN (4 Digits)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter a 4-digit PIN"
                  placeholderTextColor={COLORS.textMuted}
                  value={parentPin}
                  onChangeText={setParentPin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={true}
                />
              </View>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>This PIN will be used to unlock the Parent Dashboard.</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create Account 🚀'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Log In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgMain },
  container: { paddingHorizontal: 24, paddingBottom: 50 },
  backBtn: { marginTop: 16, marginBottom: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center', ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  emoji: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.textMid, marginTop: 6, fontWeight: '500' },
  roleRow: { flexDirection: 'row', backgroundColor: COLORS.bgSection, borderRadius: RADIUS.md, padding: 5, marginBottom: 28, borderWidth: 1, borderColor: COLORS.border },
  roleChip: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center' },
  roleChipActive: { backgroundColor: COLORS.bgCard, ...SHADOWS.sm },
  roleChipText: { fontSize: 15, fontWeight: '700', color: COLORS.textMid },
  roleChipTextActive: { color: COLORS.primary },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, height: 54, ...SHADOWS.sm },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.textDark },
  eyeBtn: { padding: 6 },
  button: { backgroundColor: COLORS.primary, paddingVertical: 17, borderRadius: RADIUS.lg, alignItems: 'center', marginTop: 10, ...SHADOWS.md, shadowColor: COLORS.primary },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  loginLink: { alignItems: 'center', marginTop: 22 },
  loginLinkText: { fontSize: 14, color: COLORS.textMid, fontWeight: '500' },
});