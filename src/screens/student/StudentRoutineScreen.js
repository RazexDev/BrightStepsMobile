import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Animated, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

export default function StudentRoutineScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // For students, their user ID is their student ID.
  const studentId = user?._id || user?.id;

  const fetchRoutines = async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      // Use the specific student endpoint if logged in as a student
      const endpoint = user?.role === 'student' ? '/routines/student' : `/routines/student/${studentId}`;
      const response = await api.get(endpoint);
      const data = response.data.data || response.data;
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Fetch routines error:', error.message);
      if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
        setError('Server took too long to respond. Please check if backend is running.');
      } else {
        setError("Couldn't connect to the server. Please check your backend or network.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, [studentId]);

  useEffect(() => {
    if (showSuccessToast) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSuccessToast(false));
    }
  }, [showSuccessToast]);

  const handleToggleCompletion = async (item) => {
    try {
      await api.put(`/routines/${item._id}`, {
        isCompleted: !item.isCompleted,
      });
      fetchRoutines();
      if (!item.isCompleted) {
        setShowSuccessToast(true);
        Alert.alert('Awesome! 🎉', 'One step closer to a great day!');
      }
    } catch (error) {
      console.log('Toggle completion error:', error.message);
      Alert.alert('Oops!', 'Failed to update your task.');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, item.isCompleted && styles.cardCompleted]}
      activeOpacity={0.7}
      onPress={() => handleToggleCompletion(item)}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={[styles.checkbox, item.isCompleted && styles.checkboxCompleted]}>
            {item.isCompleted && <Ionicons name="checkmark-sharp" size={24} color="#FFF" />}
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, item.isCompleted && styles.cardTitleCompleted]}>
              {item.taskName}
            </Text>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {item.isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Done! ✨</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E1007" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Routine ⭐</Text>
          <Text style={styles.headerSubtitle}>Let's complete one step at a time!</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading State */}
      {loading && routines.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5EAD6E" />
          <Text style={styles.loadingText}>Loading your routines...</Text>
        </View>
      ) : routines.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌈</Text>
            <Text style={styles.emptyTitle}>No routines yet today!</Text>
            <Text style={styles.emptySubtitle}>
              Your parent can add happy tasks for your day 🌈
            </Text>
          </View>
        </View>
      ) : (
        /* Routine List */
        <View style={styles.listWrapper}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {routines.filter(r => r.isCompleted).length} of {routines.length} completed
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(routines.filter(r => r.isCompleted).length / routines.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
          <FlatList
            data={routines}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Error Toast */}
      {error && (
        <View style={styles.errorToast}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRoutines}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <Animated.View style={[styles.successToast, { opacity: fadeAnim }]}>
          <Text style={styles.successText}>Great job! Routine updated 🎉</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FEF9F0' 
  },
  
  // Header Styles
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#FFF', 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#1E1007',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8B6F47',
    fontWeight: '500',
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B6F47',
    fontWeight: '600',
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#5EAD6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    width: '100%',
    maxWidth: 340,
  },
  emptyEmoji: { 
    fontSize: 80, 
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E1007',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8B6F47',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5EAD6E',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    shadowColor: '#5EAD6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  // List Wrapper & Progress
  listWrapper: {
    flex: 1,
  },
  progressContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1007',
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E8E3D8',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5EAD6E',
    borderRadius: 10,
  },

  // List Container
  listContainer: { 
    paddingHorizontal: 20, 
    paddingBottom: 100,
  },

  // Card Styles
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 3, 
    borderLeftWidth: 5, 
    borderLeftColor: '#F59E0B',
    overflow: 'hidden',
  },
  cardCompleted: { 
    borderLeftColor: '#5EAD6E', 
    opacity: 0.85,
    backgroundColor: '#F8FFF9',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    borderWidth: 3, 
    borderColor: '#D1D5DB', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 16,
  },
  checkboxCompleted: { 
    backgroundColor: '#5EAD6E', 
    borderColor: '#5EAD6E' 
  },
  cardInfo: { 
    flex: 1,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1E1007',
    marginBottom: 6,
  },
  cardTitleCompleted: { 
    textDecorationLine: 'line-through', 
    color: '#9CA3AF' 
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: { 
    fontSize: 13, 
    color: '#92400E',
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '700',
  },

  // Floating Action Button
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 30, 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#5EAD6E', 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#5EAD6E', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12, 
    elevation: 8 
  },

  // Error Toast
  errorToast: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#1E1007',
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Success Toast
  successToast: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#5EAD6E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#5EAD6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '85%', 
    backgroundColor: '#FFF', 
    borderRadius: 28, 
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1E1007', 
    marginBottom: 20,
    textAlign: 'center',
  },
  input: { 
    backgroundColor: '#F3F4F6', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16, 
    fontSize: 16,
    color: '#1E1007',
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10 
  },
  cancelBtn: { 
    flex: 1,
    paddingVertical: 14, 
    borderRadius: 16, 
    marginRight: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: { 
    color: '#6B4C30', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  saveBtn: { 
    flex: 1,
    backgroundColor: '#5EAD6E', 
    paddingVertical: 14, 
    borderRadius: 16,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 16 
  }
});