import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Video } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from '../../api/axiosConfig';

const TeacherResourceManager = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const handleAccessResource = async (item) => {
    if (!item.fileUrl) return;
    try {
      if (item.type === 'video' || item.type === 'image') {
        setSelectedResource(item);
        setViewerVisible(true);
      } else if (item.fileUrl.startsWith('http')) {
        await WebBrowser.openBrowserAsync(item.fileUrl);
      } else {
        Alert.alert('Invalid URL', 'This resource does not have a valid link.');
      }
    } catch (err) {
      console.error('Error opening resource:', err);
    }
  };

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState('video');
  const [fileUrl, setFileUrl] = useState('');
  const [instructionalText, setInstructionalText] = useState('');
  const [targetSkill, setTargetSkill] = useState('general');
  const [requiredLevel, setRequiredLevel] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await api.get('/resources');
      const data = response.data?.data || response.data || [];
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow ANY file
      });
      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
        // Automatically guess type based on file if user hasn't strictly set it
        const mime = result.assets[0].mimeType || '';
        if (mime.startsWith('image/')) setType('image');
        else if (mime.startsWith('video/')) setType('video');
        else if (mime === 'application/pdf') setType('pdf');
        else setType('document');
      }
    } catch (err) {
      console.error("Error picking document:", err);
    }
  };

  const handleUpload = async () => {
    if (!title || (!fileUrl && !selectedFile && type !== 'offline') || !targetSkill || !requiredLevel) {
      Alert.alert('Error', 'Please fill in Title, File/URL, Target Skill, and Required Level.');
      return;
    }
    
    try {
      setUploading(true);

      if (selectedFile && ['pdf', 'video', 'image', 'document'].includes(type)) {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", type);
        formData.append("instructionalText", instructionalText || 'Please review this resource.');
        formData.append("targetSkill", targetSkill.toLowerCase().trim());
        formData.append("requiredLevel", requiredLevel);
        if (studentName) {
          formData.append("studentName", studentName);
        }
        formData.append("offlineInstructions", '');
        
        formData.append("file", {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || "application/octet-stream"
        });

        if (editingId) {
          const token = await AsyncStorage.getItem("token");
          const updateResponse = await fetch(`${api.defaults.baseURL}/resources/${editingId}`, {
            method: 'PUT',
            headers: {
              "Accept": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: formData
          });
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(errorText || 'Update failed');
          }
        } else {
          const token = await AsyncStorage.getItem("token");
          const uploadResponse = await fetch(`${api.defaults.baseURL}/resources/upload`, {
            method: 'POST',
            headers: {
              "Accept": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: formData
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(errorText || 'Upload failed');
          }
        }
      } else {
        const payloadData = {
          title,
          type: type.toLowerCase().trim(),
          fileUrl,
          instructionalText: instructionalText || 'Please review this resource.',
          targetSkill: targetSkill.toLowerCase().trim(),
          requiredLevel: Number(requiredLevel),
          studentName: studentName || undefined,
          offlineInstructions: ''
        };
        if (editingId) {
          await api.put(`/resources/${editingId}`, payloadData);
        } else {
          await api.post('/resources', payloadData);
        }
      }

      Alert.alert('Success', editingId ? 'Resource updated successfully!' : 'Resource uploaded successfully!');
      setModalVisible(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Error saving resource:', error.response?.data || error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to upload resource.';
      Alert.alert('Error', errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setType('video');
    setFileUrl('');
    setInstructionalText('');
    setTargetSkill('general');
    setRequiredLevel('');
    setStudentName('');
    setSelectedFile(null);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setTitle(item.title || '');
    setType(item.type || 'video');
    setFileUrl(item.fileUrl || '');
    setInstructionalText(item.instructionalText || '');
    setTargetSkill(item.targetSkill || 'general');
    setRequiredLevel(item.requiredLevel?.toString() || '');
    setStudentName(item.studentName || '');
    setSelectedFile(null);
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Resource', 'Are you sure you want to permanently delete this resource?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/resources/${id}`);
            Alert.alert('Success', 'Resource deleted.');
            fetchResources();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete resource.');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const accessedByList = item.accessedBy || [];
    const wasAccessed = accessedByList.length > 0;
    return (
      <View style={styles.resourceItem}>
        <View style={styles.resourceHeader}>
          <Text style={styles.title}>{item.title}</Text>
        </View>
        <Text style={styles.type}>Type: {item.type} | Required Level: {item.requiredLevel}</Text>
        {item.studentName ? <Text style={styles.type}>Assigned to: {item.studentName}</Text> : null}
        
        {item.fileUrl && (item.type === 'image' || item.type === 'video') ? (
          <TouchableOpacity onPress={() => handleAccessResource(item)}>
            <Image 
              source={{ uri: item.type === 'video' ? item.fileUrl.replace(/\.[^/.]+$/, ".jpg") : item.fileUrl }} 
              style={{ width: 100, height: 60, borderRadius: 8, marginVertical: 8, backgroundColor: '#E5E7EB' }} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : item.fileUrl ? (
          <TouchableOpacity onPress={() => handleAccessResource(item)}>
            <Text style={[styles.url, { textDecorationLine: 'underline', marginTop: 4 }]} numberOfLines={1}>View {item.type || 'Link'}</Text>
          </TouchableOpacity>
        ) : null}
        {wasAccessed ? (
          <View style={styles.accessedContainer}>
            <Text style={styles.accessedLabel}>✅ Viewed by:</Text>
            <Text style={styles.accessedNames}>{accessedByList.join(', ')}</Text>
          </View>
        ) : (
          <Text style={styles.notAccessedLabel}>⏳ Not yet accessed by any student</Text>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
            <Ionicons name="pencil" size={14} color="#4B5563" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
            <Ionicons name="trash" size={14} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resources</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.uploadButtonText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item, index) => (item._id ? item._id.toString() : index.toString())}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No resources found.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? '✏️ Edit Resource' : '✨ Upload New Resource'}</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Resource Title</Text>
                <TextInput style={styles.input} placeholder="e.g. Learn to Read Video" placeholderTextColor="#9CA3AF" value={title} onChangeText={setTitle} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.chipContainer}>
                  {['video', 'pdf', 'image', 'document', 'link', 'offline'].map(t => (
                    <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipSelected]} onPress={() => setType(t)}>
                      <Text style={[styles.chipText, type === t && styles.chipTextSelected]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {['pdf', 'video', 'image', 'document'].includes(type) ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Upload File</Text>
                  <TouchableOpacity style={styles.uploadFileBtn} onPress={pickDocument}>
                    <Text style={styles.uploadFileBtnText}>
                      {selectedFile ? selectedFile.name : "📎 Tap to Select File"}
                    </Text>
                  </TouchableOpacity>
                  {type === 'video' && <Text style={{fontSize: 12, color: '#6B7280', marginTop: 4}}>Max video size: 50MB</Text>}
                </View>
              ) : type === 'link' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Link URL</Text>
                  <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#9CA3AF" value={fileUrl} onChangeText={setFileUrl} autoCapitalize="none" />
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instructional Text</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Add any instructions for the student..." placeholderTextColor="#9CA3AF" value={instructionalText} onChangeText={setInstructionalText} multiline={true} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Target Skill</Text>
                <View style={styles.chipContainer}>
                  {['focus', 'calming', 'communication', 'general'].map(s => (
                    <TouchableOpacity key={s} style={[styles.chip, targetSkill === s && styles.chipSelected]} onPress={() => setTargetSkill(s)}>
                      <Text style={[styles.chipText, targetSkill === s && styles.chipTextSelected]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Required Level</Text>
                <TextInput style={styles.input} placeholder="e.g. 5" placeholderTextColor="#9CA3AF" value={requiredLevel} onChangeText={setRequiredLevel} keyboardType="numeric" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign to Student (Optional)</Text>
                <TextInput style={styles.input} placeholder="Leave blank for all students" placeholderTextColor="#9CA3AF" value={studentName} onChangeText={setStudentName} />
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpload} disabled={uploading}>
                  <Text style={styles.saveButtonText}>{uploading ? (editingId ? 'Saving...' : 'Uploading...') : (editingId ? 'Save Changes' : 'Upload Resource')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* IN-APP RESOURCE VIEWER MODAL */}
      <Modal visible={viewerVisible} animationType="fade" transparent={true} onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.closeViewerBtn} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          {selectedResource && (
            <View style={styles.viewerContent}>
              {selectedResource.type === 'video' ? (
                <Video
                  source={{ uri: selectedResource.fileUrl }}
                  style={styles.viewerMedia}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay
                />
              ) : selectedResource.type === 'image' ? (
                <Image
                  source={{ uri: selectedResource.fileUrl }}
                  style={styles.viewerMedia}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  uploadButton: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  uploadButtonText: { color: '#fff', fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  resourceItem: { backgroundColor: '#ffffff', padding: 16, marginBottom: 12, borderRadius: 8, elevation: 2 },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  type: { fontSize: 14, color: '#666', marginBottom: 4 },
  url: { fontSize: 12, color: '#3B82F6', marginBottom: 8 },
  accessedContainer: { backgroundColor: '#ECFDF5', borderRadius: 6, padding: 8, marginTop: 4 },
  accessedLabel: { fontSize: 12, fontWeight: '700', color: '#059669' },
  accessedNames: { fontSize: 13, color: '#065F46', marginTop: 2 },
  notAccessedLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  chipSelected: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
  chipText: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  chipTextSelected: { color: '#1D4ED8' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  cancelButton: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, marginRight: 8 },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#4B5563' },
  saveButton: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 12, marginLeft: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  uploadFileBtn: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center' },
  uploadFileBtnText: { fontSize: 15, color: '#3B82F6', fontWeight: '600' },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeViewerBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  viewerContent: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  viewerMedia: { width: '100%', height: '100%' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginLeft: 4 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#DC2626', marginLeft: 4 },
});

export default TeacherResourceManager;
