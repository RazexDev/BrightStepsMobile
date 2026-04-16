import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import ParentDashboardTabs from '../../navigation/ParentDashboardTabs';

export default function ParentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const handlePinSubmit = () => {
    if (pinInput === '1234') {
      setIsUnlocked(true);
      setPinInput('');
    } else {
      Alert.alert('Incorrect PIN', 'Please try again.');
      setPinInput('');
    }
  };

  if (!isUnlocked) {
    return (
      <View style={styles.container}>
        <Modal
          animationType="fade"
          transparent={false}
          visible={!isUnlocked}
          onRequestClose={() => navigation.goBack()}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Parent Access</Text>
              <Text style={styles.modalSubtitle}>Enter your 4-digit PIN</Text>

              <TextInput
                style={styles.pinInput}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={true}
                value={pinInput}
                onChangeText={setPinInput}
                autoFocus={true}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePinSubmit} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>Unlock</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return <ParentDashboardTabs />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF4CC' },
  topRightBadge: { position: 'absolute', top: 40, right: 20, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#1E1007' },
  subtitle: { fontSize: 16, color: '#6B4C30', marginBottom: 40 },
  profileButton: { backgroundColor: '#3182CE', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginBottom: 15, width: '80%', alignItems: 'center' },
  profileButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  button: { backgroundColor: '#E85C45', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '80%', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: '#FEFCF5', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1007', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B4C30', marginBottom: 20 },
  pinInput: { width: '60%', borderBottomWidth: 3, borderBottomColor: '#3DB5A0', fontSize: 32, textAlign: 'center', letterSpacing: 10, marginBottom: 30, paddingBottom: 10, color: '#1E1007' },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, paddingVertical: 12, marginRight: 10, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: '#6B4C30' },
  submitBtn: { flex: 1, paddingVertical: 12, marginLeft: 10, borderRadius: 12, backgroundColor: '#3DB5A0', alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});