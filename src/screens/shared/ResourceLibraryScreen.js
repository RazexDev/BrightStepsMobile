import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Video } from 'expo-av';
import { api } from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../../theme';

const TYPE_CONFIG = {
  video:    { icon: 'play-circle',      color: '#E85C45', bg: '#FFF1EE', label: 'Video'    },
  pdf:      { icon: 'document-text',   color: '#5EAD6E', bg: '#F0FDF4', label: 'PDF'      },
  image:    { icon: 'image',           color: '#44A7CE', bg: '#EFF9FF', label: 'Image'    },
  document: { icon: 'document',        color: '#C8881A', bg: '#FFFBEB', label: 'Document' },
  link:     { icon: 'link',            color: '#9CA3AF', bg: '#F9FAFB', label: 'Link'     },
};

export default function ResourceLibraryScreen() {
  const { user } = useContext(AuthContext);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      let currentLevel = 25;
      if (user?.role === 'student' || user?.role === 'parent') {
        const studentNameQuery = user?.name ? `?studentName=${encodeURIComponent(user.name)}` : '';
        const progressRes = await api.get(`/progress${studentNameQuery}`);
        const totalActivities = progressRes.data?.length || 0;
        currentLevel = Math.min(25, Math.floor(totalActivities / 5));
      }
      const queryParams = user?.name && user.role !== 'teacher' ? `?studentName=${encodeURIComponent(user.name)}` : '';
      const response = await api.get(`/resources${queryParams}`);
      let data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        if (user?.role === 'student' || user?.role === 'parent') {
          data = data.filter(r => (r.requiredLevel || 0) <= currentLevel);
        }
        setResources(data);
      } else {
        setResources([]);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessResource = async (item) => {
    let handled = false;
    if (item.fileUrl) {
      try {
        if (item.type === 'video' || item.type === 'image') {
          setSelectedResource(item);
          setViewerVisible(true);
          handled = true;
        } else if (item.fileUrl.startsWith('http')) {
          await WebBrowser.openBrowserAsync(item.fileUrl);
          handled = true;
        } else {
          Alert.alert('Invalid URL', 'This resource does not have a valid link.');
          return;
        }
      } catch (err) {
        console.error('Error opening resource:', err);
      }
    }
    if (handled && user?.name) {
      try {
        await api.put(`/resources/${item._id}/access`, { studentName: user.name });
        fetchResources();
      } catch (err) {
        console.error('Error marking accessed:', err);
      }
    }
  };

  const getTypeConfig = (type) => TYPE_CONFIG[type?.toLowerCase()] || TYPE_CONFIG.link;

  const renderItem = ({ item }) => {
    const tc = getTypeConfig(item.type);
    const accessed = item.accessedBy?.includes(user?.name);
    return (
      <View style={styles.card}>
        {/* Type badge + icon */}
        <View style={styles.cardTop}>
          <View style={[styles.typeIcon, { backgroundColor: tc.bg }]}>
            <Ionicons name={tc.icon} size={22} color={tc.color} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: tc.bg }]}>
                <Text style={[styles.tagText, { color: tc.color }]}>{tc.label}</Text>
              </View>
              {item.requiredLevel !== undefined && (
                <View style={[styles.tag, { backgroundColor: COLORS.bgMuted }]}>
                  <Text style={[styles.tagText, { color: COLORS.gold }]}>Lvl {item.requiredLevel}</Text>
                </View>
              )}
              {item.targetSkill && (
                <View style={[styles.tag, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.tagText, { color: COLORS.secondary }]}>{item.targetSkill}</Text>
                </View>
              )}
            </View>
          </View>
          {accessed && (
            <View style={styles.viewedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />
            </View>
          )}
        </View>

        {item.instructionalText ? (
          <Text style={styles.instructions} numberOfLines={2}>{item.instructionalText}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.accessBtn, { backgroundColor: tc.color }]}
          onPress={() => handleAccessResource(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.accessBtnText}>Open Resource</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>📚</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Resource Library</Text>
          <Text style={styles.bannerSub}>
            {user?.role === 'teacher' ? 'All learning materials' : 'Learning materials unlocked for your level'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchResources}>
          <Ionicons name="refresh" size={18} color={COLORS.textMid} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loadingText}>Loading resources…</Text>
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📖</Text>
              <Text style={styles.emptyTitle}>No resources yet</Text>
              <Text style={styles.emptySub}>Resources will appear here once your teacher uploads them.</Text>
            </View>
          }
        />
      )}

      {/* In-app viewer modal */}
      <Modal visible={viewerVisible} animationType="fade" transparent={true} onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.closeViewerBtn} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close-circle" size={42} color="#fff" />
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
                <Image source={{ uri: selectedResource.fileUrl }} style={styles.viewerMedia} resizeMode="contain" />
              ) : null}
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14, marginBottom: 12,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  bannerEmoji: { fontSize: 30, marginRight: 12 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  bannerSub: { fontSize: 13, color: COLORS.textMid, marginTop: 2 },
  refreshBtn: { padding: 8, backgroundColor: COLORS.bgMain, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  list: { padding: 16, paddingBottom: 50 },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  typeIcon: { width: 46, height: 46, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
  tagText: { fontSize: 11, fontWeight: '700' },
  viewedBadge: { marginLeft: 6 },
  instructions: { fontSize: 13, color: COLORS.textMid, marginBottom: 14, lineHeight: 20 },
  accessBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, borderRadius: RADIUS.md,
  },
  accessBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  loadingText: { marginTop: 12, fontSize: 15, color: COLORS.textMid, fontWeight: '500' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 6 },
  emptySub: { fontSize: 14, color: COLORS.textMid, textAlign: 'center', lineHeight: 22 },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  closeViewerBtn: { position: 'absolute', top: 52, right: 22, zIndex: 10 },
  viewerContent: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  viewerMedia: { width: '100%', height: '100%' },
});
