import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axiosConfig";

const CLOUDINARY_UPLOAD_PRESET = "your_upload_preset";
const CLOUDINARY_CLOUD_NAME = "your_cloud_name";
const { height: SCREEN_H } = Dimensions.get("window");

const CATEGORIES = [
  { id: "Morning", icon: "sunny-outline", color: "#F59E0B", bg: "#FFF7E6" },
  { id: "Health", icon: "heart-outline", color: "#10B981", bg: "#ECFDF5" },
  { id: "Study", icon: "book-outline", color: "#3B82F6", bg: "#EFF6FF" },
  { id: "Bedtime", icon: "moon-outline", color: "#8B5CF6", bg: "#F5F3FF" },
  { id: "Meals", icon: "restaurant-outline", color: "#EF4444", bg: "#FEF2F2" },
  { id: "Other", icon: "grid-outline", color: "#6B7280", bg: "#F3F4F6" },
];

export default function RoutinesScreen({ route }) {
  const { user } = useContext(AuthContext);

  const resolvedStudentId =
    route?.params?.studentId ||
    user?.studentId ||
    user?.childId ||
    user?.student?._id ||
    user?.child?._id ||
    user?._id ||
    user?.id ||
    "";

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [studentId] = useState(resolvedStudentId);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cloudUrl, setCloudUrl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [taskName, setTaskName] = useState("");
  const [category, setCategory] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  const descRef = useRef(null);

  const fetchRoutines = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/routines/student/${studentId}`);
      const data = res.data.data || res.data;
      setRoutines(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load routines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchRoutines();
  }, [studentId]);

  const resetForm = () => {
    setEditingId(null);
    setTaskName("");
    setCategory("");
    setTaskDesc("");
    setSelectedFile(null);
    setCloudUrl(null);
  };

  const uploadToCloudinary = async (file) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", {
        uri: file.uri,
        name: file.name || "upload",
        type: file.mimeType || "image/jpeg",
      });
      form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: form }
      );

      const data = await res.json();

      if (data.secure_url) {
        setCloudUrl(data.secure_url);
        return data.secure_url;
      }

      throw new Error("Cloudinary URL missing");
    } catch {
      Alert.alert("Upload Error", "Could not upload. Check your Cloudinary config.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const showFilePicker = () =>
    Alert.alert("Add Visual Support", "Choose a source", [
      {
        text: "Photo Library",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission needed", "Please allow photo access.");
            return;
          }

          const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });

          if (r.canceled) return;

          const f = {
            uri: r.assets[0].uri,
            name: r.assets[0].fileName || "image.jpg",
            mimeType: r.assets[0].mimeType || "image/jpeg",
          };

          setSelectedFile(f);
          uploadToCloudinary(f);
        },
      },
      {
        text: "Files / PDF",
        onPress: async () => {
          const r = await DocumentPicker.getDocumentAsync({
            type: ["image/*", "application/pdf"],
            copyToCacheDirectory: true,
          });

          if (r.canceled) return;

          const f = r.assets[0];
          setSelectedFile(f);
          uploadToCloudinary(f);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);

  const handleSave = async () => {
    if (!taskName.trim()) {
      Alert.alert("Validation", "Routine title is required.");
      return;
    }

    if (!category.trim()) {
      Alert.alert("Validation", "Please pick a category.");
      return;
    }

    if (!studentId) {
      Alert.alert("Missing Student", "Student account not detected. Please login again.");
      return;
    }

    const tasks = taskDesc.trim()
      ? [{ label: taskDesc.trim(), description: taskDesc.trim(), mins: 0, completed: false }]
      : [];

    setLoading(true);

    try {
      const payload = {
        studentId,
        title: taskName.trim(),
        taskName: taskName.trim(),
        category: category.trim(),
        isCompleted: false,
        tasks,
        ...(cloudUrl && { fileUrl: cloudUrl }),
        ...(selectedFile?.name && { fileName: selectedFile.name }),
        ...(selectedFile?.mimeType && { fileType: selectedFile.mimeType }),
      };

      if (editingId) await api.put(`/routines/${editingId}`, payload);
      else await api.post("/routines", payload);

      setShowModal(false);
      resetForm();
      fetchRoutines();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) =>
    Alert.alert("Delete Routine", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/routines/${id}`);
            fetchRoutines();
          } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed.");
          }
        },
      },
    ]);

  const openEdit = (item) => {
    setEditingId(item._id);
    setTaskName(item.taskName || item.title || "");
    setCategory(item.category || "");
    setTaskDesc(item.tasks?.[0]?.label || item.tasks?.[0]?.description || "");
    setSelectedFile(null);
    setCloudUrl(item.fileUrl || null);
    setShowModal(true);
  };

  const getCat = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[5];

  const renderItem = ({ item }) => {
    const m = getCat(item.category);

    return (
      <View style={s.card}>
        <View style={[s.catIcon, { backgroundColor: m.bg }]}>
          <Ionicons name={m.icon} size={20} color={m.color} />
        </View>

        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{item.taskName || item.title}</Text>

          {item.category ? (
            <Text style={[s.cardCat, { color: m.color }]}>{item.category}</Text>
          ) : null}

          {item.tasks?.[0]?.label ? (
            <Text style={s.cardDesc} numberOfLines={1}>
              {item.tasks[0].label}
            </Text>
          ) : null}

          {item.fileUrl ? (
            <View style={s.chip}>
              <Ionicons name="image-outline" size={11} color="#2E7D32" />
              <Text style={s.chipTxt}> Visual attached</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity onPress={() => openEdit(item)} style={s.actBtn}>
          <Ionicons name="pencil" size={17} color="#6B4C30" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item._id)}
          style={[s.actBtn, { backgroundColor: "#FEF2F2" }]}
        >
          <Ionicons name="trash" size={17} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Routine Manager ⭐</Text>
          <Text style={s.headerSub}>Build daily habits for your child</Text>
        </View>

        {routines.length > 0 && (
          <View style={s.cntBadge}>
            <Text style={s.cntTxt}>{routines.length}</Text>
          </View>
        )}
      </View>

      {loading && routines.length === 0 ? (
        <ActivityIndicator size="large" color="#5EAD6E" style={{ marginTop: 50 }} />
      ) : routines.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyE}>🌟</Text>
          <Text style={s.emptyT}>No routines yet!{"\n"}Tap + to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
            activeOpacity={1}
            onPress={() => {
              setShowModal(false);
              resetForm();
            }}
          />

          <View style={[s.sheet, { height: SCREEN_H * 0.88 }]}>
            <View style={s.drag} />

            <View style={s.sheetHdr}>
              <Text style={s.sheetTitle}>
                {editingId ? "✏️ Edit Routine" : "✨ New Routine Pack"}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={s.closeBtn}>
                  <Ionicons name="close" size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.formPad}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={s.lbl}>
                Routine Title <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                style={s.inp}
                placeholder="e.g. Brushing teeth"
                placeholderTextColor="#9CA3AF"
                value={taskName}
                onChangeText={setTaskName}
                returnKeyType="next"
                onSubmitEditing={() => descRef.current?.focus()}
              />

              <Text style={s.lbl}>
                Category <Text style={s.req}>*</Text>
              </Text>
              <View style={s.chips}>
                {CATEGORIES.map((c) => {
                  const on = category === c.id;

                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.ch, on && { backgroundColor: c.bg, borderColor: c.color }]}
                      onPress={() => setCategory(c.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={c.icon} size={14} color={on ? c.color : "#9CA3AF"} />
                      <Text style={[s.chTxt, on && { color: c.color, fontWeight: "800" }]}>
                        {c.id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.lbl}>Task Description</Text>
              <TextInput
                ref={descRef}
                style={s.area}
                placeholder={"e.g. Brush teeth for 2 minutes\nwith circular motions"}
                placeholderTextColor="#9CA3AF"
                value={taskDesc}
                onChangeText={setTaskDesc}
                multiline
                textAlignVertical="top"
                blurOnSubmit={false}
                returnKeyType="default"
                scrollEnabled={false}
              />

              <Text style={s.lbl}>
                Visual Support <Text style={s.opt}>(Optional)</Text>
              </Text>
              <Text style={s.hint}>
                Add a picture or PDF to help your child understand the routine.
              </Text>

              {cloudUrl && selectedFile?.mimeType?.startsWith("image") ? (
                <View style={s.prevWrap}>
                  <Image source={{ uri: cloudUrl }} style={s.prevImg} />
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => {
                      setSelectedFile(null);
                      setCloudUrl(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={26} color="#EF4444" />
                  </TouchableOpacity>

                  {uploading && (
                    <View style={s.upMask}>
                      <ActivityIndicator color="#FFF" size="large" />
                      <Text style={s.upMaskTxt}>Uploading…</Text>
                    </View>
                  )}
                </View>
              ) : cloudUrl ? (
                <View style={s.fileRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#5EAD6E" />
                  <Text style={s.fileRowTxt}>File uploaded ✓</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile(null);
                      setCloudUrl(null);
                    }}
                  >
                    <Ionicons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : selectedFile ? (
                <View style={s.fileRow}>
                  <Ionicons name="document-outline" size={20} color="#6B7280" />
                  <Text style={s.fileRowTxt} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  {uploading && <ActivityIndicator size="small" color="#5EAD6E" />}
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.upBtn, uploading && { opacity: 0.6 }]}
                onPress={showFilePicker}
                disabled={uploading}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={21} color="#2E7D32" />
                <Text style={s.upTxt}>
                  {selectedFile ? "Change File" : "Upload Image or PDF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.saveBtn, (loading || uploading) && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={loading || uploading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={s.saveTxt}>{editingId ? "Update Routine" : "Save Routine"}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FEFCF5" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#1E1007" },
  headerSub: { fontSize: 13, color: "#8B6F47", marginTop: 2 },
  cntBadge: {
    backgroundColor: "#5EAD6E",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cntTxt: { color: "#FFF", fontWeight: "900", fontSize: 16 },

  list: { padding: 22, paddingBottom: 110 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1E1007" },
  cardCat: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  cardDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 5,
    alignSelf: "flex-start",
  },
  chipTxt: { fontSize: 11, color: "#2E7D32", fontWeight: "700" },
  actBtn: {
    padding: 9,
    backgroundColor: "#FFF7E6",
    borderRadius: 10,
    marginLeft: 6,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  emptyE: { fontSize: 60, marginBottom: 12 },
  emptyT: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E1007",
    textAlign: "center",
  },

  fab: {
    position: "absolute",
    bottom: 32,
    right: 26,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#5EAD6E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5EAD6E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },

  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  drag: {
    width: 44,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 2,
  },
  sheetHdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: { fontSize: 19, fontWeight: "900", color: "#111827" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  formPad: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 50 },
  lbl: { fontSize: 14, fontWeight: "800", color: "#374151", marginBottom: 8 },
  req: { color: "#EF4444" },
  opt: { fontWeight: "400", color: "#9CA3AF", fontSize: 13 },
  inp: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
    marginBottom: 18,
  },
  area: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
    marginBottom: 18,
    minHeight: 105,
    textAlignVertical: "top",
  },
  hint: { fontSize: 13, color: "#9CA3AF", marginBottom: 12, lineHeight: 20 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  ch: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 5,
  },
  chTxt: { fontSize: 13, color: "#9CA3AF", fontWeight: "700" },

  prevWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 12, position: "relative" },
  prevImg: { width: "100%", height: 170, resizeMode: "cover" },
  removeBtn: { position: "absolute", top: 8, right: 8 },
  upMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  upMaskTxt: { color: "#FFF", fontWeight: "800", marginTop: 8 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fileRowTxt: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "700" },

  upBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
    marginBottom: 22,
  },
  upTxt: { color: "#2E7D32", fontWeight: "800", fontSize: 15 },

  saveBtn: {
    backgroundColor: "#38B2AC",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 6,
  },
  saveTxt: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelTxt: { color: "#6B4C30", fontSize: 15, fontWeight: "800" },
});