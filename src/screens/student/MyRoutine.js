import { Ionicons } from '@expo/vector-icons';
import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRoutinesByStudentId, toggleTaskStatus } from '../../api/routineApi';
import { AuthContext } from '../../context/AuthContext';

// Individual task row with its own checkbox
const TaskRow = ({ task, routineId, onTaskToggled }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [toggling, setToggling] = useState(false);

  const handlePress = async () => {
    if (toggling) return;
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 30 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    setToggling(true);
    try {
      await toggleTaskStatus(routineId, task._id);
      onTaskToggled(task._id);
    } catch (e) {
      Alert.alert('Oops!', 'Could not update task.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity style={styles.taskRow} onPress={handlePress} activeOpacity={0.7}>
        <View style={[styles.taskCheckbox, task.isCompleted && styles.taskCheckboxDone]}>
          {task.isCompleted && <Ionicons name="checkmark-sharp" size={14} color="#FFF" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.taskText, task.isCompleted && styles.taskTextDone]}>
            {task.description}
          </Text>
          {task.durationMinutes > 0 && (
            <Text style={styles.taskDuration}>⏱ {task.durationMinutes} min</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Routine Pack card — shows tasks inline with per-pack progress
const RoutinePackCard = ({ item, onTaskToggled }) => {
  const hasTasks = item.tasks && item.tasks.length > 0;
  const completedCount = hasTasks ? item.tasks.filter(t => t.isCompleted).length : 0;
  const totalCount = hasTasks ? item.tasks.length : 0;
  const packProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isPackDone = totalCount > 0 && completedCount === totalCount;

  return (
    <View style={[styles.card, isPackDone && styles.cardCompleted]}>
      {/* Pack Header */}
      <View style={styles.packHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, isPackDone && styles.cardTitleCompleted]}>
            {item.title}
          </Text>
          {item.category ? (
            <Text style={styles.cardSubtitle}>{item.category} Pack</Text>
          ) : null}
        </View>
        <View style={styles.packBadge}>
          <Text style={styles.packBadgeText}>{completedCount}/{totalCount}</Text>
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
        <View style={styles.tasksContainer}>
          {item.tasks.map((task) => (
            <TaskRow key={task._id} task={task} routineId={item._id} onTaskToggled={onTaskToggled} />
          ))}
        </View>
      ) : (
        <Text style={styles.noTasksText}>No tasks in this pack</Text>
      )}
    </View>
  );
};

export default function MyRoutine({ navigation }) {
  const { user } = useContext(AuthContext);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);

  const studentId = user?._id || user?.id;

  const fetchRoutines = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await getRoutinesByStudentId(studentId);
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Error', "Couldn't load your routines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, [studentId]);

  // Optimistically toggle a single task within a pack
  const handleTaskToggled = (routineId, taskId) => {
    setRoutines(prev => prev.map(r => {
      if (r._id !== routineId) return r;
      const updatedTasks = r.tasks.map(t =>
        t._id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      );
      return { ...r, tasks: updatedTasks };
    }));
  };

  // Progress: count individual tasks across all packs
  const allTasks = routines.flatMap(r => r.tasks || []);
  const completedTasks = allTasks.filter(t => t.isCompleted);
  const progressPercentage = allTasks.length > 0
    ? (completedTasks.length / allTasks.length) * 100 : 0;

  let motivationalText = "Ready to start your day!";
  if (allTasks.length > 0) {
    if (progressPercentage === 100) motivationalText = "Amazing job! All tasks completed! 🎉";
    else if (progressPercentage >= 75) motivationalText = "Almost there, keep it up! 🌟";
    else if (progressPercentage >= 50) motivationalText = "Halfway done, you're doing great! 🔥";
    else if (progressPercentage > 0) motivationalText = "Off to a good start! 🚀";
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E1007" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Routine 🚀</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {loading && routines.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5EAD6E" />
        </View>
      ) : routines.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🌈</Text>
          <Text style={styles.emptyTitle}>No routines yet!</Text>
          <Text style={styles.emptySubtitle}>Your teacher will add routines for you soon.</Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Today's Progress</Text>
              <Text style={styles.progressText}>
                {completedTasks.length} of {allTasks.length} tasks
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.motivationalText}>{motivationalText}</Text>
          </View>

          <FlatList
            data={routines}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <RoutinePackCard
                item={item}
                onTaskToggled={(taskId) => handleTaskToggled(item._id, taskId)}
              />
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEF9F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1E1007' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyEmoji: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1007', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#8B6F47', textAlign: 'center' },

  listWrapper: { flex: 1 },
  progressContainer: { marginHorizontal: 20, marginBottom: 24, backgroundColor: '#FFF', borderRadius: 24, padding: 20, shadowColor: '#5EAD6E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  progressTitle: { fontSize: 18, fontWeight: '800', color: '#1E1007' },
  progressText: { fontSize: 15, fontWeight: '700', color: '#5EAD6E' },
  progressBar: { height: 12, backgroundColor: '#E8E3D8', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#5EAD6E', borderRadius: 10 },
  motivationalText: { marginTop: 12, fontSize: 14, fontWeight: '600', color: '#8B6F47', textAlign: 'center' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },

  // Pack card
  card: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, borderLeftWidth: 6, borderLeftColor: '#F59E0B' },
  cardCompleted: { borderLeftColor: '#5EAD6E', backgroundColor: '#F8FFF9' },
  packHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E1007' },
  cardTitleCompleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  cardSubtitle: { fontSize: 12, color: '#8B6F47', marginTop: 2, fontWeight: '600' },
  packBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  packBadgeText: { fontSize: 13, fontWeight: 'bold', color: '#3B82F6' },

  miniProgressBar: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  miniProgressFill: { height: '100%', backgroundColor: '#38b2ac', borderRadius: 4 },

  // Individual task rows
  tasksContainer: { gap: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 },
  taskCheckbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 1, backgroundColor: '#FFF' },
  taskCheckboxDone: { backgroundColor: '#5EAD6E', borderColor: '#5EAD6E' },
  taskText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  taskTextDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  taskDuration: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  noTasksText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', paddingTop: 8 },
});
