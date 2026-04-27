import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

export default function RoutinesScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState(route?.params?.studentId || user?.studentId || '');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [editingId, setEditingId] = useState(null);
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState('');

  const fetchRoutines = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const response = await api.get(`/routines/student/${studentId}`);
      const data = response.data.data || response.data;
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not load routines. ' + (error.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchRoutines();
  }, [studentId]);

  const handleSaveRoutine = async () => {
    if (!taskName.trim()) {
      Alert.alert('Validation', 'Task name is required.');
      return;
    }
    
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/routines/${editingId}`, {
          taskName,
          category,
        });
        Alert.alert('Success', 'Routine updated!');
      } else {
        await api.post('/routines', {
          studentId,
          parentId: user?._id || user?.id,
          taskName,
          category,
          isCompleted: false,
        });
        Alert.alert('Success', 'New routine added!');
      }
      
      setShowAddModal(false);
      resetForm();
      fetchRoutines();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save routine.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (item) => {
    try {
      await api.put(`/routines/${item._id}`, {
        isCompleted: !item.isCompleted,
      });
      fetchRoutines();
      if (!item.isCompleted) {
        Alert.alert('Great job!', 'Routine updated.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this routine?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/routines/${id}`);
            fetchRoutines();
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to delete routine.');
          }
        },
      },
    ]);
  };

  const openEditModal = (item) => {
    setEditingId(item._id);
    setTaskName(item.taskName);
    setCategory(item.category || '');
    setShowAddModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTaskName('');
    setCategory('');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.checkboxContainer} onPress={() => handleToggleCompletion(item)}>
        <View style={[styles.checkbox, item.isCompleted && styles.checkboxCompleted]}>
          {item.isCompleted && <Ionicons name="checkmark" size={18} color="#FFF" />}
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, item.isCompleted && styles.cardTitleCompleted]}>
            {item.taskName}
          </Text>
          {item.category ? <Text style={styles.cardCategory}>{item.category}</Text> : null}
        </View>
      </TouchableOpacity>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
          <Ionicons name="pencil" size={20} color="#6B4C30" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
          <Ionicons name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Routine Manager ⭐</Text>
        <Text style={styles.headerSubtitle}>Create and manage your child's daily routine</Text>
      </View>

      {!user?.studentId && (
        <View style={styles.studentIdContainer}>
          <Text style={styles.label}>Student ID (for testing):</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.idInput}
              value={studentId}
              onChangeText={setStudentId}
              placeholder="Enter Student ID"
            />
            <TouchableOpacity style={styles.loadBtn} onPress={fetchRoutines}>
              <Text style={styles.loadBtnText}>Load</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading && routines.length === 0 ? (
        <ActivityIndicator size="large" color="#5EAD6E" style={{ marginTop: 20 }} />
      ) : !studentId ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👨‍👧</Text>
          <Text style={styles.emptyText}>Please select a child first.</Text>
          <Text style={styles.emptySubText}>Enter a student ID to manage their routines.</Text>
        </View>
      ) : routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌟</Text>
          <Text style={styles.emptyText}>No routines yet!</Text>
          <Text style={styles.emptySubText}>Add some tasks to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {studentId ? (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => { resetForm(); setShowAddModal(true); }}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      ) : null}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Routine' : 'Add Routine'}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Task Name (e.g. Brush Teeth)"
              value={taskName}
              onChangeText={setTaskName}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g. Morning)"
              value={category}
              onChangeText={setCategory}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRoutine}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFCF5' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E1007' },
  headerSubtitle: { fontSize: 14, color: '#6B4C30', marginTop: 4 },
  studentIdContainer: { paddingHorizontal: 20, marginBottom: 10 },
  label: { fontSize: 14, color: '#6B4C30', marginBottom: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  idInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  loadBtn: { backgroundColor: '#5EAD6E', padding: 12, borderRadius: 8, marginLeft: 10 },
  loadBtnText: { color: '#FFF', fontWeight: 'bold' },
  listContainer: { padding: 20, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  checkboxCompleted: { backgroundColor: '#5EAD6E', borderColor: '#5EAD6E' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E1007' },
  cardTitleCompleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  cardCategory: { fontSize: 12, color: '#6B4C30', marginTop: 4 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1E1007' },
  emptySubText: { fontSize: 14, color: '#6B4C30', marginTop: 5 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#5EAD6E', alignItems: 'center', justifyContent: 'center', shadowColor: '#5EAD6E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E1007', marginBottom: 20 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginRight: 10 },
  cancelBtnText: { color: '#6B4C30', fontWeight: 'bold', fontSize: 16 },
  saveBtn: { backgroundColor: '#5EAD6E', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
