import { Ionicons } from '@expo/vector-icons';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createRoutine, deleteRoutine, getRoutinesByStudentId } from '../../api/routineApi';
import { AuthContext } from '../../context/AuthContext';

// Simple Custom Dropdown Component
const CustomDropdown = ({ label, value, options, onSelect, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.dropdownWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setVisible(true)}>
        <Text style={[styles.dropdownBtnText, !value && { color: '#9CA3AF' }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6B4C30" />
      </TouchableOpacity>
      
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.dropdownList}>
            {options.map((opt, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.dropdownOption} 
                onPress={() => { onSelect(opt); setVisible(false); }}
              >
                <Text style={styles.dropdownOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function RoutineManager({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Advanced Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [goal, setGoal] = useState('');
  const [supportType, setSupportType] = useState('');
  const [tasks, setTasks] = useState([{ description: '', durationMinutes: '' }]);

  const studentId = route?.params?.studentId || user?.studentId || user?.childId || user?._id || user?.id;
  const parentId = user?._id || user?.id;

  const CATEGORIES = ['Morning', 'Afternoon', 'Evening', 'Bedtime', 'School', 'Other'];
  const GOALS = ['Hygiene', 'Focus', 'Behavior', 'Independence', 'Learning', 'Other'];
  const SUPPORT_TYPES = ['Autism', 'ADHD', 'Dyslexia', 'General', 'None'];

  const fetchRoutines = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await getRoutinesByStudentId(studentId);
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not load routines for the student.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, [studentId]);

  const addTask = () => setTasks([...tasks, { description: '', durationMinutes: '' }]);
  
  const removeTask = (index) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const updateTask = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleAddRoutine = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Routine title is required.');
    
    // Filter out completely empty tasks
    const validTasks = tasks
      .filter(t => t.description.trim() !== '')
      .map(t => ({
        description: t.description.trim(),
        durationMinutes: Number(t.durationMinutes) || 0
      }));

    // Debug: show exactly what we're sending
    console.log('=== CREATING ROUTINE ===');
    console.log('Title:', title);
    console.log('Tasks state (raw):', JSON.stringify(tasks));
    console.log('Valid tasks (filtered):', JSON.stringify(validTasks));
    console.log('studentId:', studentId, 'parentId:', parentId);

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        goal,
        supportType,
        tasks: validTasks,
        studentId,
        parentId,
      };
      console.log('Full payload:', JSON.stringify(payload));
      await createRoutine(payload);
      
      // Reset form
      setTitle('');
      setCategory('');
      setGoal('');
      setSupportType('');
      setTasks([{ description: '', durationMinutes: '' }]);
      setShowForm(false);
      
      fetchRoutines();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to add the routine.');
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this routine pack?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteRoutine(id);
            fetchRoutines();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete.');
          }
      }}
    ]);
  };

  const totalTime = tasks.reduce((acc, t) => acc + (Number(t.durationMinutes) || 0), 0);

  const renderItem = ({ item }) => {
    const hasTasks = item.tasks && item.tasks.length > 0;
    const completedCount = hasTasks ? item.tasks.filter(t => t.isCompleted).length : 0;
    const totalCount = hasTasks ? item.tasks.length : 0;
    const packProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const isPackDone = totalCount > 0 && completedCount === totalCount;

    return (
      <View style={[styles.card, isPackDone && styles.cardDone]}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, isPackDone && { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
              {item.title}
            </Text>
            <View style={styles.cardMeta}>
              {item.category ? <Text style={styles.metaChip}>{item.category}</Text> : null}
              {item.goal ? <Text style={styles.metaChip}>{item.goal}</Text> : null}
              {item.supportType ? <Text style={styles.metaChip}>{item.supportType}</Text> : null}
            </View>
          </View>
          <View style={styles.rightActions}>
            <View style={[styles.statusBadge, isPackDone ? styles.badgeDone : styles.badgePending]}>
              <Text style={styles.statusBadgeText}>
                {isPackDone ? '✓ Done' : `${completedCount}/${totalCount}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Mini progress bar */}
        {hasTasks && (
          <View style={styles.miniProgressBar}>
            <View style={[styles.miniProgressFill, { width: `${packProgress}%` }]} />
          </View>
        )}

        {/* Task list */}
        {hasTasks ? (
          <View style={styles.tasksList}>
            {item.tasks.map((task, idx) => (
              <View key={task._id || idx} style={styles.taskItem}>
                <View style={[styles.taskDot, task.isCompleted && styles.taskDotDone]} />
                <Text style={[styles.taskItemText, task.isCompleted && styles.taskItemDone]}>
                  {task.description}
                  {task.durationMinutes > 0 ? `  ⏱ ${task.durationMinutes}m` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noTaskText}>No nested tasks</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Routine Packs ✨</Text>
        <Text style={styles.headerSubtitle}>Manage advanced routines for your child</Text>
      </View>

      {!studentId ? (
        <View style={styles.linkContainer}>
          <Text style={styles.linkEmoji}>🔗</Text>
          <Text style={styles.linkTitle}>Link Your Child</Text>
          <Text style={styles.linkSub}>Your account isn't linked to a student yet. Enter their Student ID below.</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.idInput}
              value={route?.params?.studentId || ''}
              onChangeText={(text) => navigation.setParams({ studentId: text })}
              placeholder="Enter Student ID"
            />
          </View>
        </View>
      ) : showForm ? (
        <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>+ Create Custom Routine</Text>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6B4C30" />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>ROUTINE TITLE *</Text>
              <TextInput style={styles.inputField} placeholder="e.g. Morning Spark" value={title} onChangeText={setTitle} />
            </View>
            <View style={styles.halfWidth}>
              <CustomDropdown label="CATEGORY" value={category} options={CATEGORIES} onSelect={setCategory} placeholder="Select..." />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <CustomDropdown label="GOAL" value={goal} options={GOALS} onSelect={setGoal} placeholder="Choose Goal" />
            </View>
            <View style={styles.halfWidth}>
              <CustomDropdown label="SUPPORT TYPE" value={supportType} options={SUPPORT_TYPES} onSelect={setSupportType} placeholder="Select..." />
            </View>
          </View>

          <View style={styles.tasksSection}>
            <Text style={styles.inputLabel}>TASKS (DRAG ⠿ TO REORDER) | ⏱ {totalTime}M TOTAL</Text>
            {tasks.map((task, index) => (
              <View key={index} style={styles.taskRow}>
                <Ionicons name="apps-outline" size={20} color="#D1D5DB" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
                  placeholder="Task description..."
                  value={task.description}
                  onChangeText={(text) => updateTask(index, 'description', text)}
                />
                <TextInput
                  style={[styles.inputField, styles.durationInput]}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={task.durationMinutes}
                  onChangeText={(text) => updateTask(index, 'durationMinutes', text)}
                />
                <TouchableOpacity onPress={() => removeTask(index)} style={styles.removeTaskBtn}>
                  <Text style={styles.removeTaskText}>-</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity style={styles.addTaskBtn} onPress={addTask}>
              <Text style={styles.addTaskText}>+ Add Task</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleAddRoutine} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Routine</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.createPackBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.createPackText}>+ Create Routine Pack</Text>
            </TouchableOpacity>
          </View>

          {loading && routines.length === 0 ? (
            <ActivityIndicator size="large" color="#5EAD6E" style={{ marginTop: 40 }} />
          ) : routines.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌟</Text>
              <Text style={styles.emptyText}>No routine packs yet!</Text>
            </View>
          ) : (
            <FlatList
              data={routines}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  header: { padding: 24, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E1007' },
  headerSubtitle: { fontSize: 16, color: '#6B4C30', marginTop: 4, fontWeight: '500' },
  
  linkContainer: { padding: 24, alignItems: 'center' },
  linkEmoji: { fontSize: 40, marginBottom: 10 },
  linkTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E1007', marginBottom: 8 },
  linkSub: { textAlign: 'center', color: '#6B4C30', marginBottom: 20 },
  inputRow: { flexDirection: 'row', width: '100%' },
  idInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 16 },
  
  actionRow: { paddingHorizontal: 24, paddingBottom: 16 },
  createPackBtn: { backgroundColor: '#38b2ac', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#38b2ac', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  createPackText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  formContainer: { margin: 20, backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3A41C', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A5568' },
  closeBtn: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  halfWidth: { width: '48%' },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#B8906A', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  inputField: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#38b2ac', borderRadius: 8, padding: 12, fontSize: 14, color: '#1E1007' },
  
  dropdownWrapper: { position: 'relative' },
  dropdownBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtnText: { fontSize: 14, color: '#1E1007' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  dropdownList: { width: '80%', backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 5 },
  dropdownOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownOptionText: { fontSize: 16, color: '#1E1007' },

  tasksSection: { marginTop: 10, marginBottom: 20 },
  taskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  durationInput: { width: 60, marginLeft: 8, marginBottom: 0, textAlign: 'center' },
  removeTaskBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  removeTaskText: { color: '#EF4444', fontWeight: 'bold', fontSize: 18 },
  
  addTaskBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 10 },
  addTaskText: { color: '#4B5563', fontWeight: '600' },
  
  submitBtn: { backgroundColor: '#38b2ac', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  listContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', padding: 18, borderRadius: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#F59E0B' },
  cardDone: { borderLeftColor: '#5EAD6E', backgroundColor: '#F8FFF9' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E1007', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  metaChip: { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontWeight: '600' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeDone: { backgroundColor: '#D1FAE5' },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#374151' },
  deleteBtn: { padding: 6, backgroundColor: '#FEE2E2', borderRadius: 8 },

  miniProgressBar: { height: 5, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginVertical: 10 },
  miniProgressFill: { height: '100%', backgroundColor: '#38b2ac', borderRadius: 4 },

  tasksList: { marginTop: 4 },
  taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  taskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB', marginRight: 10 },
  taskDotDone: { backgroundColor: '#5EAD6E' },
  taskItemText: { fontSize: 14, color: '#4B5563', flex: 1 },
  taskItemDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  noTaskText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginTop: 6 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#1E1007' },
});
