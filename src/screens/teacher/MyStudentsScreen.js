import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';

export default function MyStudentsScreen() {
  const [studentId, setStudentId] = useState('');
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchStudentRoutines = async () => {
    if (!studentId.trim()) {
      Alert.alert('Notice', 'Please enter a student ID first.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await api.get(`/routines/student/${studentId}`);
      const data = response.data.data || response.data;
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not load routines or student not found.');
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = routines.filter(r => r.isCompleted).length;
  const totalCount = routines.length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.statusIndicator, item.isCompleted ? styles.statusCompleted : styles.statusPending]} />
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, item.isCompleted && styles.cardTitleCompleted]}>
          {item.taskName}
        </Text>
        {item.category ? <Text style={styles.cardCategory}>{item.category}</Text> : null}
      </View>
      <View style={styles.statusBadge}>
        <Text style={[styles.statusText, item.isCompleted ? styles.statusTextCompleted : styles.statusTextPending]}>
          {item.isCompleted ? 'Completed' : 'Pending'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Routine Observation</Text>
        <Text style={styles.headerSubtitle}>This view helps teachers observe routine patterns for reports.</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter Student ID"
          value={studentId}
          onChangeText={setStudentId}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={fetchStudentRoutines}>
          <Text style={styles.searchBtnText}>Load</Text>
        </TouchableOpacity>
      </View>

      {hasSearched && !loading && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{totalCount}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={[styles.summaryValue, { color: '#5EAD6E' }]}>{completedCount}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Rate</Text>
            <Text style={styles.summaryValue}>{completionPercentage}%</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 30 }} />
      ) : hasSearched && routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No routines found for this student.</Text>
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 6 },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 },
  searchBtn: { backgroundColor: '#3182CE', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 8, marginLeft: 10 },
  searchBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  summaryBox: { flex: 1, backgroundColor: '#FFF', marginHorizontal: 4, padding: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  summaryLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' },
  summaryValue: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 5 },
  listContainer: { padding: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  statusCompleted: { backgroundColor: '#5EAD6E' },
  statusPending: { backgroundColor: '#F59E0B' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  cardTitleCompleted: { color: '#94A3B8' },
  cardCategory: { fontSize: 13, color: '#64748B', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F1F5F9' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  statusTextCompleted: { color: '#5EAD6E' },
  statusTextPending: { color: '#F59E0B' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748B', fontSize: 16 }
});
