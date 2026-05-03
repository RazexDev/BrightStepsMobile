import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axiosConfig";

const { width: W } = Dimensions.get("window");

/* category → display data */
const CAT = {
  Morning: { emoji: "☀️", color: "#F59E0B", light: "#FFF7E6" },
  Health:  { emoji: "💚", color: "#10B981", light: "#ECFDF5" },
  Study:   { emoji: "📚", color: "#3B82F6", light: "#EFF6FF" },
  Bedtime: { emoji: "🌙", color: "#8B5CF6", light: "#F5F3FF" },
  Meals:   { emoji: "🍽️", color: "#EF4444", light: "#FEF2F2" },
  Other:   { emoji: "⭐", color: "#5EAD6E", light: "#F0FFF4" },
};

const getCat = (id) => CAT[id] || CAT.Other;

export default function StudentRoutineScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  const [routines,     setRoutines]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [error,        setError]        = useState(null);

  const studentId = user?._id || user?.id;

  /* ─── normalize ─────────────────────────────────────────────────────────── */
  const normalize = (r) => {
    const tasks =
      Array.isArray(r.tasks) && r.tasks.length > 0
        ? r.tasks
        : [{ label: r.taskName || r.title || "My task", completed: !!r.isCompleted, mins: 0 }];
    return { ...r, tasks };
  };

  /* ─── fetch ─────────────────────────────────────────────────────────────── */
  const fetchRoutines = async () => {
    if (!studentId) return;
    setLoading(true); setError(null);
    try {
      const ep  = user?.role === "student" ? "/routines/student" : `/routines/student/${studentId}`;
      const res = await api.get(ep);
      const raw = res.data.data || res.data;
      setRoutines(Array.isArray(raw) ? raw.map(normalize) : []);
    } catch {
      setError("Couldn't load tasks. Tap retry!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutines(); }, [studentId]);

  /* ─── helpers ───────────────────────────────────────────────────────────── */
  const isDone   = (t) => !!(t.completed || t.isCompleted);
  const getStats = (r) => {
    const total = r.tasks?.length || 0;
    const done  = r.tasks?.filter(isDone).length || 0;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  const allTasks    = routines.flatMap((r) => r.tasks || []);
  const totalDone   = allTasks.filter(isDone).length;
  const totalAll    = allTasks.length;
  const overallPct  = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  const motivMsg = () => {
    if (overallPct === 0)    return "Let's go! You can do it! 💪";
    if (overallPct < 50)     return "You're doing great! ⭐";
    if (overallPct < 100)    return "Almost there, superstar! 🚀";
    return "WOW! All done! Amazing! 🏆";
  };

  /* ─── toggle task ───────────────────────────────────────────────────────── */
  const toggleTask = async (routine, taskIdx, task) => {
    const key = `${routine._id}-${taskIdx}`;
    if (updatingTask === key) return;

    /* optimistic update first so UI feels instant */
    setRoutines((prev) =>
      prev.map((r) => {
        if (r._id !== routine._id) return r;
        const updatedTasks = r.tasks.map((t, i) =>
          i === taskIdx ? { ...t, completed: !isDone(t), isCompleted: !isDone(t) } : t
        );
        return { ...r, tasks: updatedTasks, isCompleted: updatedTasks.every(isDone) };
      })
    );

    setUpdatingTask(key);
    try {
      const hasRealIds = routine.tasks?.[0]?._id !== undefined;
      if (hasRealIds || routine.tasks?.length > 1) {
        await api.patch("/routines/progress", {
          routineId: routine._id, taskIndex: taskIdx, completed: !isDone(task),
        });
      } else {
        await api.put(`/routines/${routine._id}`, { isCompleted: !routine.isCompleted });
      }
    } catch {
      Alert.alert("Oops!", "Couldn't save. Refreshing…");
      fetchRoutines();
    } finally {
      setUpdatingTask(null);
    }
  };

  /* ─── render: visual helper ─────────────────────────────────────────────── */
  const renderVisual = (routine) => {
    if (!routine.fileUrl) return null;
    const isImg = !routine.fileType || routine.fileType.startsWith("image");
    return (
      <View style={s.visualBox}>
        <Text style={s.visualLbl}>👀 Look at this to help you!</Text>
        {isImg
          ? <Image source={{ uri: routine.fileUrl }} style={s.visualImg} resizeMode="cover" />
          : (
            <TouchableOpacity style={s.pdfBtn} onPress={() => Linking.openURL(routine.fileUrl)} activeOpacity={0.8}>
              <Text style={s.pdfEmoji}>📄</Text>
              <Text style={s.pdfTxt}>Open My Guide</Text>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  /* ─── render: task row (THE FIXED CHECKBOX) ─────────────────────────────── */
  const renderTask = (routine, task, idx) => {
    const done = isDone(task);
    const key  = `${routine._id}-${idx}`;
    const busy = updatingTask === key;
    const cat  = getCat(routine.category);

    return (
      <TouchableOpacity
        key={task._id || key}
        style={[s.taskRow, done && { backgroundColor: cat.light, borderColor: cat.color }]}
        onPress={() => !busy && toggleTask(routine, idx, task)}
        activeOpacity={0.75}
        disabled={busy}
        /* large hit area for small fingers */
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        {/*
          CHECKBOX FIX:
          - Explicit width + height + minWidth + minHeight prevents flex shrink
          - Do NOT put flex:1 or flex:0 on this View
          - alignSelf:"center" keeps it vertically centred
          - The parent row uses alignItems:"center" too
        */}
        <View
          style={[
            s.checkbox,
            done && { backgroundColor: cat.color, borderColor: cat.color },
          ]}
        >
          {busy
            ? <ActivityIndicator size="small" color={done ? "#FFF" : cat.color} />
            : done
              ? <Ionicons name="checkmark" size={28} color="#FFF" />
              : null}
        </View>

        {/* label */}
        <View style={s.taskTxtWrap}>
          <Text style={[s.taskTxt, done && s.taskTxtDone]} numberOfLines={2}>
            {task.label || task.description || routine.taskName || routine.title}
          </Text>
          {(task.mins || task.durationMinutes) ? (
            <Text style={s.taskMins}>⏱ {task.mins || task.durationMinutes} min</Text>
          ) : null}
        </View>

        {/* status pill */}
        <View style={[s.pill, done ? s.pillDone : s.pillTodo]}>
          <Text style={[s.pillTxt, done ? s.pillTxtDone : s.pillTxtTodo]}>
            {done ? "Done! 🎉" : "Tap!"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── render: routine card ──────────────────────────────────────────────── */
  const renderCard = ({ item }) => {
    const { total, done, pct } = getStats(item);
    const cat = getCat(item.category);

    return (
      <View style={[s.card, { borderTopColor: cat.color }]}>
        {/* card header */}
        <View style={s.cardHdr}>
          <View style={[s.catBubble, { backgroundColor: cat.light }]}>
            <Text style={s.catEmoji}>{cat.emoji}</Text>
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title || item.taskName || "My Routine"}
            </Text>
            <Text style={s.cardSub}>{item.category || "Today's task"}</Text>
          </View>
          {/* progress badge */}
          <View style={[s.pgBadge, { backgroundColor: cat.light }]}>
            <Text style={[s.pgBadgeTxt, { color: cat.color }]}>{done}/{total}</Text>
          </View>
        </View>

        {/* progress bar */}
        <View style={s.barWrap}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
        </View>
        <Text style={[s.barLabel, { color: cat.color }]}>
          {pct === 100 ? "All done! 🎉" : `${pct}% done`}
        </Text>

        {/* visual helper */}
        {renderVisual(item)}

        {/* tasks */}
        <View style={s.tasksWrap}>
          {item.tasks.map((t, i) => renderTask(item, t, i))}
        </View>
      </View>
    );
  };

  /* ─── loading ───────────────────────────────────────────────────────────── */
  if (loading && routines.length === 0) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centerBox}>
          <Text style={s.bigEmoji}>🌈</Text>
          <ActivityIndicator size="large" color="#5EAD6E" style={{ marginBottom: 16 }} />
          <Text style={s.loadTxt}>Loading your tasks…</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── main render ───────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#1E1007" />
        </TouchableOpacity>

        <View style={s.hdrCenter}>
          <Text style={s.hdrTitle}>My Routine 🚀</Text>
          <Text style={s.hdrSub}>{motivMsg()}</Text>
        </View>

        <View style={{ width: 48 }} />
      </View>

      {/* ── Empty ── */}
      {routines.length === 0 ? (
        <View style={s.centerBox}>
          <Text style={s.bigEmoji}>🌟</Text>
          <Text style={s.emptyTitle}>No tasks yet!</Text>
          <Text style={s.emptySub}>Your parent will add{"\n"}fun tasks for you soon.</Text>
        </View>
      ) : (
        <>
          {/* ── Overall progress card ── */}
          <View style={s.progCard}>
            {/* star row */}
            <View style={s.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Text key={i} style={[s.star, i < Math.ceil(overallPct / 20) && s.starLit]}>★</Text>
              ))}
            </View>

            <View style={s.progRow}>
              <Text style={s.progTitle}>Today's Progress</Text>
              <Text style={s.progCount}>
                <Text style={s.progCountBig}>{totalDone}</Text>/{totalAll}
              </Text>
            </View>

            <View style={s.mainBar}>
              <View style={[s.mainBarFill, { width: `${overallPct}%` }]} />
            </View>

            <Text style={s.progMsg}>{motivMsg()}</Text>
          </View>

          {/* ── Routine cards ── */}
          <FlatList
            data={routines}
            keyExtractor={(item) => item._id}
            renderItem={renderCard}
            contentContainerStyle={s.listPad}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* ── Error toast ── */}
      {error ? (
        <View style={s.toast}>
          <Text style={s.toastEmoji}>😬</Text>
          <Text style={s.toastTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchRoutines}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/* ─── styles ────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#FFFDF5" },

  /* header */
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 },
  backBtn:      { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  hdrCenter:    { flex: 1, alignItems: "center" },
  hdrTitle:     { fontSize: 30, fontWeight: "900", color: "#1E1007", letterSpacing: -0.5 },
  hdrSub:       { fontSize: 14, fontWeight: "700", color: "#8B6F47", marginTop: 3, textAlign: "center" },

  /* center / loading / empty */
  centerBox:    { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  bigEmoji:     { fontSize: 90, marginBottom: 16 },
  loadTxt:      { fontSize: 18, fontWeight: "800", color: "#8B6F47" },
  emptyTitle:   { fontSize: 28, fontWeight: "900", color: "#1E1007" },
  emptySub:     { fontSize: 17, color: "#8B6F47", marginTop: 10, textAlign: "center", lineHeight: 26 },

  /* overall progress card */
  progCard:     { backgroundColor: "#FFF", marginHorizontal: 18, borderRadius: 28, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, elevation: 5 },
  starsRow:     { flexDirection: "row", justifyContent: "center", marginBottom: 12, gap: 6 },
  star:         { fontSize: 28, color: "#E5E7EB" },
  starLit:      { color: "#F59E0B" },
  progRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  progTitle:    { fontSize: 20, fontWeight: "900", color: "#1E1007" },
  progCount:    { fontSize: 16, fontWeight: "700", color: "#5EAD6E" },
  progCountBig: { fontSize: 24, fontWeight: "900" },
  mainBar:      { height: 18, backgroundColor: "#F1F5F9", borderRadius: 12, overflow: "hidden" },
  mainBarFill:  { height: "100%", backgroundColor: "#5EAD6E", borderRadius: 12 },
  progMsg:      { textAlign: "center", marginTop: 12, fontSize: 16, fontWeight: "800", color: "#8B6F47" },

  /* list */
  listPad:      { paddingHorizontal: 18, paddingBottom: 100 },

  /* routine card */
  card:         { backgroundColor: "#FFF", borderRadius: 28, padding: 18, marginBottom: 20, borderTopWidth: 6, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, elevation: 5 },
  cardHdr:      { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  catBubble:    { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginRight: 12 },
  catEmoji:     { fontSize: 28 },
  cardTitle:    { fontSize: 20, fontWeight: "900", color: "#1E1007" },
  cardSub:      { fontSize: 13, fontWeight: "700", color: "#8B6F47", marginTop: 2 },
  pgBadge:      { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  pgBadgeTxt:   { fontWeight: "900", fontSize: 15 },

  /* progress bar in card */
  barWrap:      { height: 12, backgroundColor: "#F1F5F9", borderRadius: 8, overflow: "hidden", marginBottom: 6 },
  barFill:      { height: "100%", borderRadius: 8 },
  barLabel:     { fontSize: 13, fontWeight: "800", textAlign: "right", marginBottom: 14 },

  /* visual helper */
  visualBox:    { backgroundColor: "#F8FAFC", borderRadius: 20, padding: 14, marginBottom: 16 },
  visualLbl:    { fontSize: 15, fontWeight: "900", color: "#334155", marginBottom: 10 },
  visualImg:    { width: "100%", height: 180, borderRadius: 16 },
  pdfBtn:       { flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", padding: 16, borderRadius: 16, justifyContent: "center", gap: 10 },
  pdfEmoji:     { fontSize: 22 },
  pdfTxt:       { color: "#2E7D32", fontWeight: "900", fontSize: 16 },

  /* tasks */
  tasksWrap:    { gap: 12 },

  /* ── TASK ROW ─────────────────────────────────────────────────────────
     Key layout:
     • Row = flexDirection:"row", alignItems:"center"
     • Checkbox = explicit 64×64, no flex, no shrink
     • Label wrap = flex:1
     • Pill = fixed, no flex
  ──────────────────────────────────────────────────────────────────────*/
  taskRow:      {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: "#FAFAFA",
    borderWidth:     2.5,
    borderColor:     "#E5E7EB",
    borderRadius:    24,
    padding:         14,
    minHeight:       80,
  },

  /* FIXED CHECKBOX — no flex properties, explicit size only */
  checkbox:     {
    width:           64,
    height:          64,
    minWidth:        64,
    minHeight:       64,
    borderRadius:    20,
    borderWidth:     3,
    borderColor:     "#D1D5DB",
    backgroundColor: "#FFF",
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     14,
    /* prevent ANY shrinkage */
    flexShrink:      0,
    flexGrow:        0,
  },

  taskTxtWrap:  { flex: 1, marginRight: 8 },
  taskTxt:      { fontSize: 18, fontWeight: "800", color: "#1E293B", lineHeight: 26 },
  taskTxtDone:  { textDecorationLine: "line-through", color: "#94A3B8" },
  taskMins:     { fontSize: 13, color: "#64748B", marginTop: 4, fontWeight: "700" },

  /* status pill */
  pill:         { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 0 },
  pillTodo:     { backgroundColor: "#FFF7E6" },
  pillDone:     { backgroundColor: "#ECFDF5" },
  pillTxt:      { fontSize: 13, fontWeight: "900" },
  pillTxtTodo:  { color: "#D97706" },
  pillTxtDone:  { color: "#16A34A" },

  /* error toast */
  toast:        { position: "absolute", bottom: 30, left: 18, right: 18, backgroundColor: "#FFF", borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 16, elevation: 10 },
  toastEmoji:   { fontSize: 22, marginRight: 10 },
  toastTxt:     { flex: 1, fontWeight: "700", color: "#1E1007", fontSize: 14 },
  retryBtn:     { backgroundColor: "#EF4444", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  retryTxt:     { color: "#FFF", fontWeight: "900" },
});