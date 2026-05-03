import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/axiosConfig';
import { getImageUrl } from '../../utils/imageUtils';
import { COLORS, SHADOWS, RADIUS } from '../../theme';

const ProfileSettingsScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [parentPin, setParentPin] = useState(user?.parentPin || '');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePicUri, setProfilePicUri] = useState(user?.profilePicUrl || null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) {
      setProfilePicUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (password) formData.append('password', password);
      if (user?.role === 'parent' && parentPin) formData.append('parentPin', parentPin);
      if (profilePicUri && !profilePicUri.startsWith('http')) {
        formData.append('profilePic', {
          uri: profilePicUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        });
      }

      const userId = user._id || user.id;
      const token = await AsyncStorage.getItem('token');
      const BASE = (await import('../../api/axiosConfig')).api.defaults.baseURL.replace('/api', '');

      const response = await fetch(`${BASE}/api/users/profile/${userId}`, {
        method: 'PUT',
        body: formData,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');

      if (updateUser) await updateUser(data.user || data);
      Alert.alert('Success ✅', 'Profile updated successfully!');
      setPassword('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Account', 'This cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const userId = user._id || user.id;
            await api.delete(`/users/profile/${userId}`);
            Alert.alert('Deleted', 'Your account has been removed.');
            logout();
          } catch {
            Alert.alert('Error', 'Failed to delete account.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85} style={styles.avatarWrap}>
            {profilePicUri ? (
              <Image source={{ uri: getImageUrl(profilePicUri) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {name ? name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase() || 'USER'}</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={COLORS.textLight} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Leave blank to keep current"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          {user?.role === 'parent' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parent PIN (4 Digits)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={18} color={COLORS.textLight} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  value={parentPin}
                  onChangeText={setParentPin}
                  placeholder="Update 4-digit PIN"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={true}
                />
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgMain },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgMuted, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  container: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.secondary },
  avatarFallback: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.bgMuted, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.border },
  avatarInitial: { fontSize: 40, fontWeight: '900', color: COLORS.primary },
  avatarEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarHint: { fontSize: 13, color: COLORS.textLight, fontWeight: '600', marginBottom: 10 },
  roleBadge: { backgroundColor: COLORS.bgMuted, paddingHorizontal: 16, paddingVertical: 5, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
  roleBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.gold, letterSpacing: 1 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 18 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgMain, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, height: 52 },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark },
  saveBtn: { backgroundColor: COLORS.secondary, paddingVertical: 16, borderRadius: RADIUS.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 14, ...SHADOWS.md, shadowColor: COLORS.secondary },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCard, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 14 },
  logoutBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  deleteBtnText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },
});

export default ProfileSettingsScreen;
