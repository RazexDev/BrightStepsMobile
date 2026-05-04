import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createRoutine,
  updateRoutine,
  deleteRoutine,
  getRoutinesByStudentId,
} from "../../api/routineApi";
import { api } from "../../api/axiosConfig";
import { AuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function RoutineManager({ route }) {
  const { user } = useContext(AuthContext);

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tasks, setTasks] = useState([{ label: "", id: Date.now() }]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Categories — names must match backend valid list (case-sensitive)
  const categories = [
    { name: "morning",  displayName: "Morning",  icon: "sunny-outline",      color: "#FFA500" },
    { name: "Health",   displayName: "Health",   icon: "fitness-outline",    color: "#4CAF50" },
    { name: "study",    displayName: "Study",    icon: "book-outline",       color: "#2196F3" },
    { name: "bedtime",  displayName: "Bedtime",  icon: "moon-outline",       color: "#9C27B0" },
    { name: "custom",   displayName: "Meals",    icon: "restaurant-outline", color: "#FF5722" },
    { name: "Other",    displayName: "Other",    icon: "apps-outline",       color: "#607D8B" },
  ];

  // studentId from route params takes priority (teacher viewing a specific student)
  // For a parent user, we DON'T fall back to user._id because that's the parentId not studentId
  const studentId = route?.params?.studentId || user?.studentId || user?.childId || "";
  const isParentViewingOwn = !studentId && user?.role === 'parent';

  const filteredRoutines = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) return routines;

    return routines.filter((item) =>
      `${item.title || ""} ${item.taskName || ""} ${item.category || ""} ${item.fileName || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [routines, searchText]);

  // Pick image from camera or gallery
  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant photo library access to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          mimeType: asset.mimeType || "image/jpeg",
        });
        setFilePreview(asset.uri);
      }
    } catch (error) {
      Alert.alert("Error", "Could not select image.");
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera access to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          type: "image/jpeg",
          mimeType: "image/jpeg",
        });
        setFilePreview(asset.uri);
      }
    } catch (error) {
      Alert.alert("Error", "Could not take photo.");
    }
  };

  // Pick PDF or document
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
          mimeType: asset.mimeType || "application/pdf",
        });
        
        // Set preview for images
        if (asset.mimeType?.startsWith("image/")) {
          setFilePreview(asset.uri);
        } else {
          setFilePreview(null);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Could not select document.");
    }
  };

  // Show file picker options
  const showFilePickerOptions = () => {
    Alert.alert(
      "Upload Visual Support",
      "Choose how you want to add a visual file to help your child understand the routine better",
      [
        {
          text: "Take Photo 📸",
          onPress: pickImageFromCamera,
        },
        {
          text: "Choose from Gallery 🖼️",
          onPress: pickImageFromGallery,
        },
        {
          text: "Upload PDF 📄",
          onPress: pickDocument,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      let data;
      if (isParentViewingOwn) {
        // Parent viewing their own created routines — use GET /api/routines (filters by parentId on server)
        const response = await api.get('/routines');
        data = response.data;
      } else if (studentId) {
        // Viewing routines for a specific student
        data = await getRoutinesByStudentId(studentId);
      } else {
        setRoutines([]);
        return;
      }
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Fetch routines error:', error?.response?.data || error.message);
      Alert.alert("Error", "Could not load routines. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, [studentId]);

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setTasks([{ label: "", id: Date.now() }]);
    setSelectedFile(null);
    setFilePreview(null);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setTitle(item.title || item.taskName || "");
    setCategory(item.category || "");
    
    if (item.tasks && item.tasks.length > 0) {
      setTasks(item.tasks.map((t, idx) => ({ label: t.label || t.description || "", id: Date.now() + idx })));
    } else if (item.taskName) {
      setTasks([{ label: item.taskName, id: Date.now() }]);
    } else {
      setTasks([{ label: "", id: Date.now() }]);
    }

    setSelectedFile(null);
    setFilePreview(item.fileUrl || null);
    setShowForm(true);
  };

  const handleSaveRoutine = async () => {
    const finalStudentId = studentId || (isParentViewingOwn ? user._id : "");

    if (!finalStudentId) {
      Alert.alert("Missing Child", "Please select a child before saving routines.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a routine title.");
      return;
    }

    if (!category) {
      Alert.alert("Validation", "Please select a category.");
      return;
    }

    const validTasks = tasks
      .filter(t => t.label.trim())
      .map(t => ({
        label: t.label.trim(),
        description: t.label.trim(),
        mins: 0,
        completed: false,
      }));

    if (validTasks.length === 0) {
      Alert.alert("Validation", "Please add at least one task to the routine.");
      return;
    }

    setLoading(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("taskName", title.trim());
        formData.append("category", category);
        formData.append("studentId", finalStudentId);
        formData.append("isCompleted", "false");
        formData.append("tasks", JSON.stringify(validTasks));
        
        setUploadingFile(true);
        formData.append("file", {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || "application/octet-stream",
        });
        if (editingId) {
          await updateRoutine(editingId, formData, true);
        } else {
          await createRoutine(formData, true);
        }
      } else {
        const payload = {
          title: title.trim(),
          taskName: title.trim(),
          category,
          studentId: finalStudentId,
          isCompleted: false,
          tasks: validTasks
        };
        if (editingId) {
          await updateRoutine(editingId, payload, false);
        } else {
          await createRoutine(payload, false);
        }
      }

      Alert.alert("Success! 🌟", editingId ? "Routine updated successfully!" : "Routine created successfully. Your child will love the visual support!");
      resetForm();
      setShowForm(false);
      fetchRoutines();
    } catch (error) {
      console.log("=== SAVE ROUTINE ERROR ===", error);
      const errMsg = "Full Error: " + (error?.response?.data?.message || error.message || JSON.stringify(error));
      Alert.alert("Error Debug", errMsg);
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const handleDelete = (id, title) => {
    Alert.alert(
      "Delete Routine?",
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRoutine(id);
              Alert.alert("Deleted", "Routine removed successfully.");
              fetchRoutines();
            } catch (error) {
              Alert.alert("Error", "Failed to delete routine.");
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (categoryName) => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat || categories[categories.length - 1]; // Default to "Other"
  };

  const renderItem = ({ item }) => {
    const catInfo = getCategoryIcon(item.category);
    const isImage = item.fileUrl && (item.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(item.fileUrl));
    const isPdf = item.fileUrl && (item.fileType === 'application/pdf' || /\.pdf(\?|$)/i.test(item.fileUrl));

    return (
      <View style={styles.card}>
        <View style={[styles.categoryIconContainer, { backgroundColor: catInfo.color + "20" }]}>
          <Ionicons name={catInfo.icon} size={24} color={catInfo.color} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardTitle}>{item.title || item.taskName}</Text>
          <Text style={styles.cardSub}>
            <Ionicons name={catInfo.icon} size={12} color={catInfo.color} /> {item.category || "Other"}
          </Text>

          {isImage ? (
            <View style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 100 }}>
              <Image source={{ uri: item.fileUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : isPdf ? (
            <View style={styles.fileIndicator}>
              <Ionicons name="document-text" size={14} color="#EF4444" />
              <Text style={[styles.fileText, { color: '#B91C1C' }]}>PDF Attached</Text>
              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>PDF</Text>
              </View>
            </View>
          ) : item.fileName ? (
            <View style={styles.fileIndicator}>
              <Ionicons name="image-outline" size={14} color="#2E7D32" />
              <Text style={styles.fileText}>{item.fileName}</Text>
            </View>
          ) : (
            <Text style={styles.noFileText}>No visual support added</Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
          <TouchableOpacity 
            style={[styles.deleteBtn, { backgroundColor: '#E0F2FE' }]} 
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil-outline" size={20} color="#0284C7" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={() => handleDelete(item._id, item.title || item.taskName)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Routine Packs ✨</Text>
          <Text style={styles.headerSubtitle}>
            Create visual routines to help your child learn
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search routines..."
          placeholderTextColor="#9CA3AF"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Create Button */}
      <TouchableOpacity 
        style={styles.createBtn} 
        onPress={() => setShowForm(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createBtnText}>Create New Routine Pack</Text>
      </TouchableOpacity>

      {/* Routines List */}
      {loading && routines.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38b2ac" />
          <Text style={styles.loadingText}>Loading routines...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRoutines}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchText ? "No matching routines" : "No routines yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchText 
                  ? "Try searching with different keywords" 
                  : "Create your first routine pack to help your child learn daily activities"}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Routine Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowForm(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Routine Pack" : "Create Routine Pack"}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <Ionicons name="close-circle" size={28} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flexShrink: 1 }}>
              <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Routine Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Morning Brushing Routine"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Category Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.categoryChip,
                        category === cat.name && {
                          backgroundColor: cat.color + "30",
                          borderColor: cat.color,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => setCategory(cat.name)}
                    >
                      <Ionicons name={cat.icon} size={20} color={cat.color} />
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat.name && { color: cat.color, fontWeight: "700" },
                        ]}
                      >
                        {cat.displayName || cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Task Input List */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Tasks *</Text>
                  <TouchableOpacity onPress={() => setTasks([...tasks, { label: '', id: Date.now() }])}>
                    <Text style={{ color: '#38b2ac', fontWeight: 'bold', fontSize: 13 }}>+ Add Task</Text>
                  </TouchableOpacity>
                </View>
                
                {tasks.map((task, index) => (
                  <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      value={task.label}
                      onChangeText={(text) => {
                        const newTasks = [...tasks];
                        newTasks[index].label = text;
                        setTasks(newTasks);
                      }}
                      placeholder={`Task ${index + 1} (e.g. Brush teeth)`}
                      placeholderTextColor="#9CA3AF"
                    />
                    {tasks.length > 1 && (
                      <TouchableOpacity 
                        onPress={() => setTasks(tasks.filter((_, i) => i !== index))}
                        style={{ padding: 10, marginLeft: 5 }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* File Upload Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visual Support (Optional)</Text>
                <Text style={styles.inputHint}>
                  Add a picture or PDF to help your child understand the routine
                </Text>

                {filePreview ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: filePreview }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removePreviewBtn}
                      onPress={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : selectedFile ? (
                  <View style={styles.fileSelectedBox}>
                    <Ionicons name="document-outline" size={24} color="#2E7D32" />
                    <Text style={styles.fileSelectedText} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadBox} onPress={showFilePickerOptions}>
                    <Ionicons name="cloud-upload-outline" size={40} color="#38b2ac" />
                    <Text style={styles.uploadText}>Tap to upload image or PDF</Text>
                    <Text style={styles.uploadHint}>Camera • Gallery • PDF</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, (loading || !title.trim() || !category) && styles.saveBtnDisabled]}
                  onPress={handleSaveRoutine}
                  disabled={loading || !title.trim() || !category}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.saveBtnText}>
                        {uploadingFile ? "Uploading..." : (editingId ? "Save Changes" : "Create Routine")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#111827",
  },

  createBtn: {
    backgroundColor: "#38b2ac",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#38b2ac",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  fileIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  fileText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
    flex: 1,
  },
  noFileText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 4,
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    marginLeft: 8,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
  },

  emptyBox: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  formContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  uploadBox: {
    backgroundColor: "#F0FDFA",
    borderWidth: 2,
    borderColor: "#38b2ac",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
  },
  uploadText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#38b2ac",
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  previewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  removePreviewBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  fileSelectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  fileSelectedText: {
    flex: 1,
    fontSize: 14,
    color: "#166534",
    fontWeight: "600",
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38b2ac",
    flexDirection: "row",
    gap: 8,
  },
  saveBtnDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});