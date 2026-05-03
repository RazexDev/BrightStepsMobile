import React, { useState, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import ParentDashboardTabs from '../../navigation/ParentDashboardTabs';
import { COLORS, SHADOWS, RADIUS } from '../../theme';

export default function ParentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigation = useNavigation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const inputRef = useRef(null);

  const dots = [pinInput.length > 0, pinInput.length > 1, pinInput.length > 2, pinInput.length > 3];

  const handlePinChange = (val) => {
    if (val.length > 4) return;
    setPinInput(val);
  };

  const handlePinSubmit = () => {
    if (pinInput === '1234') {
      setIsUnlocked(true);
      setPinInput('');
    } else {
      Alert.alert('Incorrect PIN', 'Please try again.');
      setPinInput('');
    }
  };

  const focusInput = () => inputRef.current?.focus();

  if (!isUnlocked) {
    return (
      <View style={styles.lockScreen}>
        <Modal animationType="fade" transparent={false} visible={!isUnlocked} onRequestClose={() => navigation.goBack()}>
          <TouchableWithoutFeedback onPress={focusInput}>
            <View style={styles.lockBg}>
              {/* Header */}
              <View style={styles.lockHeader}>
                <Text style={styles.lockEmoji}>🔐</Text>
                <Text style={styles.lockTitle}>Parent Portal</Text>
                <Text style={styles.lockSubtitle}>Enter your 4-digit PIN to access</Text>
              </View>

              {/* Dot indicators — tap triggers focus */}
              <TouchableOpacity onPress={focusInput} activeOpacity={0.7} style={styles.dotsWrap}>
                <View style={styles.dotsRow}>
                  {dots.map((filled, i) => (
                    <View key={i} style={[styles.dot, filled && styles.dotFilled]} />
                  ))}
                </View>
                <Text style={styles.tapHint}>Tap here to type your PIN</Text>
              </TouchableOpacity>

              {/* Actual TextInput — styled visibly so it can receive focus */}
              <TextInput
                ref={inputRef}
                style={styles.pinInput}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={true}
                value={pinInput}
                onChangeText={handlePinChange}
                onSubmitEditing={handlePinSubmit}
                autoFocus={true}
                returnKeyType="done"
                caretHidden={true}
              />

              <TouchableOpacity
                style={[styles.unlockBtn, pinInput.length < 4 && { opacity: 0.45 }]}
                onPress={handlePinSubmit}
                disabled={pinInput.length < 4}
                activeOpacity={0.85}
              >
                <Text style={styles.unlockBtnText}>Unlock Portal 🚀</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
                <Text style={styles.backLinkText}>← Go Back</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  }

  return <ParentDashboardTabs />;
}

const styles = StyleSheet.create({
  lockScreen: { flex: 1, backgroundColor: COLORS.bgMain },
  lockBg: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  lockHeader: { alignItems: 'center', marginBottom: 40 },
  lockEmoji: { fontSize: 64, marginBottom: 16 },
  lockTitle: { fontSize: 30, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  lockSubtitle: { fontSize: 15, color: COLORS.textMid, marginTop: 8, fontWeight: '500', textAlign: 'center' },
  dotsWrap: { alignItems: 'center', marginBottom: 8 },
  dotsRow: { flexDirection: 'row', marginBottom: 6 },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
    borderWidth: 2, borderColor: COLORS.borderMid,
  },
  dotFilled: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tapHint: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  // Visible styled input — shows a bottom border so user knows it's active
  pinInput: {
    width: 180,
    height: 52,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 18,
    color: COLORS.textDark,
    textAlign: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: COLORS.secondary,
    marginBottom: 36,
    backgroundColor: 'transparent',
  },
  unlockBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16, paddingHorizontal: 52,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
    ...SHADOWS.md, shadowColor: COLORS.secondary,
  },
  unlockBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backLink: { paddingVertical: 12 },
  backLinkText: { color: COLORS.textMid, fontWeight: '700', fontSize: 15 },
});