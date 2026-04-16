import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // Default to student

  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Please fill all fields');
    try {
      await register(name, email, password, role);
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Join BrightSteps ✨</Text>
        
        {/* Role Selector */}
        <View style={styles.roleContainer}>
          <TouchableOpacity 
            style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
            onPress={() => setRole('student')}
          >
            <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleBtn, role === 'parent' && styles.roleBtnActive]}
            onPress={() => setRole('parent')}
          >
            <Text style={[styles.roleText, role === 'parent' && styles.roleTextActive]}>Parent</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFCF5' },
  backBtn: { padding: 20 },
  backText: { fontSize: 16, fontWeight: 'bold', color: '#6B4C30' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: '900', color: '#1E1007', marginBottom: 30, textAlign: 'center' },
  roleContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#eee', borderRadius: 12, padding: 4 },
  roleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  roleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  roleText: { fontSize: 16, fontWeight: 'bold', color: '#6B4C30' },
  roleTextActive: { color: '#E85C45' },
  input: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  button: { backgroundColor: '#E85C45', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});