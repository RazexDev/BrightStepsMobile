import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import { COLORS, SHADOWS, RADIUS } from '../../theme';

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
  const completionPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.statusDot, item.isCompleted ? styles.dotDone : styles.dotPending]} />
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, item.isCompleted && styles.cardTitleDone]}>
          {item.taskName || item.title}
        </Text>
        {item.category ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.statusBadge, item.isCompleted ? styles.badgeDone : styles.badgePending]}>
        <Text style={[styles.badgeText, item.isCompleted ? styles.badgeTextDone : styles.badgeTextPending]}>
          {item.isCompleted ? '✓ Done' : 'Pending'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Intro Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🔭</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Routine Observation</Text>
          <Text style={styles.bannerSub}>Search a student ID to view their routines and progress.</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter Student ID…"
            placeholderTextColor={COLORS.textMuted}
            value={studentId}
            onChangeText={setStudentId}
            onSubmitEditing={fetchStudentRoutines}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={fetchStudentRoutines} activeOpacity={0.85}>
          <Text style={styles.searchBtnText}>Load</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {hasSearched && !loading && (
        <View style={styles.summaryRow}>
          {[
            { label: 'Total', value: totalCount, color: COLORS.textDark },
            { label: 'Completed', value: completedCount, color: COLORS.secondary },
            { label: 'Rate', value: `${completionPct}%`, color: COLORS.accent },
          ].map((s) => (
            <View key={s.label} style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Progress bar */}
      {hasSearched && !loading && totalCount > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${completionPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{completionPct}% completed</Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loadingText}>Fetching routines…</Text>
        </View>
      ) : hasSearched && routines.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No routines found</Text>
          <Text style={styles.emptySub}>This student has no routines yet.</Text>
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 16, marginBottom: 16,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  bannerEmoji: { fontSize: 32, marginRight: 14 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  bannerSub: { fontSize: 13, color: COLORS.textMid, marginTop: 3 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 48, ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textDark },
  searchBtn: {
    backgroundColor: COLORS.secondary, paddingHorizontal: 20,
    justifyContent: 'center', borderRadius: RADIUS.md, marginLeft: 10,
    height: 48, ...SHADOWS.sm, shadowColor: COLORS.secondary,
  },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  summaryCard: {
    flex: 1, marginHorizontal: 4,
    backgroundColor: COLORS.bgCard, padding: 14, borderRadius: RADIUS.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  summaryValue: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  progressWrap: { paddingHorizontal: 20, marginBottom: 14 },
  progressBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 4 },
  progressLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '700', marginTop: 6, textAlign: 'right' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, padding: 16,
    borderRadius: RADIUS.md, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 14 },
  dotDone: { backgroundColor: COLORS.secondary },
  dotPending: { backgroundColor: COLORS.warning },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  cardTitleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  categoryPill: { marginTop: 5, alignSelf: 'flex-start', backgroundColor: COLORS.bgMuted, paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
  categoryText: { fontSize: 11, fontWeight: '700', color: COLORS.gold },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  badgeDone: { backgroundColor: '#D1FAE5' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextDone: { color: COLORS.secondary },
  badgeTextPending: { color: COLORS.warning },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, color: COLORS.textMid, fontSize: 15, fontWeight: '500' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 6 },
  emptySub: { fontSize: 14, color: COLORS.textMid, textAlign: 'center' },
});
