import { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../api/axiosConfig';
import { getImageUrl } from '../../utils/imageUtils';

export default function GameHubScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const [totalStars, setTotalStars] = useState(0);

  // PIN Gateway State
  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // --- Fetch live star count from backend ---
  const fetchTotalStars = async () => {
    try {
      const childId = user._id || user.id;
      const response = await api.get(`/progress/${childId}`);
      const allSessions = response.data;
      const sum = allSessions.reduce((acc, session) => acc + (session.stars || 0), 0);
      setTotalStars(sum);
    } catch (error) {
      console.error('Could not fetch stars:', error.message);
    }
  };

  useEffect(() => {
    if (isFocused && user) fetchTotalStars();
  }, [isFocused, user]);

  // The Tech Lead PIN Logic
  const handlePinSubmit = () => {
    // Later, this will be: await api.post('/users/verify-pin', { pin: pinInput })
    if (pinInput === '1234') {
      setPinModalVisible(false);
      setPinInput('');
      // Success! Navigate to the hidden Parent Hub
      navigation.navigate('ParentHub');
    } else {
      Alert.alert("Incorrect PIN", "Please try again.");
      setPinInput('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* --- Top Navigation --- */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={logout} style={styles.navButton}>
            <Text style={styles.navButtonText}>← Sign Out</Text>
          </TouchableOpacity>

          {/* User Profile Badge & Parent Access */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#6B4C30', marginRight: 8 }}>
                Hi, {user?.name ? user.name.split(' ')[0] : 'Student'}!
              </Text>
              {user?.profilePicUrl ? (
                <Image 
                  source={{ uri: getImageUrl(user.profilePicUrl) }} 
                  style={{ width: 35, height: 35, borderRadius: 20 }} 
                />
              ) : (
                <View style={{ width: 35, height: 35, borderRadius: 20, backgroundColor: '#3DB5A0', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={() => setPinModalVisible(true)} style={styles.parentAccessBtn}>
              <Text style={styles.parentAccessText}>⚙️ Parents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Hero Section --- */}
        <View style={styles.heroSection}>
          <Text style={styles.emojiRow}>🎮 🧩 ⭐</Text>
          <Text style={styles.heroTitle}>Hi, {user?.name || 'Student'}!</Text>
          <Text style={styles.heroSubtitle}>Let&apos;s Play!</Text>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>⭐ You have {totalStars} Stars!</Text>
          </View>
        </View>

        {/* --- Game Cards Section (Keeping it brief for the snippet) --- */}
        <View style={styles.cardsSection}>
          <Text style={styles.sectionTitle}>🎯 Choose a Game!</Text>
          {/* Your Game Cards go here exactly as they were before */}

          <View style={[styles.gameCard, { borderColor: '#E1F3FB' }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#E1F3FB' }]}><Text style={styles.iconEmoji}>🧠</Text></View>
              <View style={styles.cardInfo}>
                <Text style={styles.gameTitle}>Focus Match</Text>
                <Text style={styles.levelText}>Level 1</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: '#44A7CE' }]}
              onPress={() => navigation.navigate('FocusMatch')} // <-- THIS IS NEW
            >
              <Text style={styles.playButtonText}>▶ PLAY</Text>
            </TouchableOpacity>
          </View>

          {/* Shape Sort Game Card */}
          <View style={[styles.gameCard, { borderColor: '#F3E8FF' }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}><Text style={styles.iconEmoji}>🔺🟦</Text></View>
              <View style={styles.cardInfo}>
                <Text style={styles.gameTitle}>Shape Sort</Text>
                <Text style={styles.levelText}>Match the shapes to the correct bins!</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: '#A855F7' }]}
              onPress={() => navigation.navigate('ShapeSort')}
            >
              <Text style={styles.playButtonText}>▶ PLAY</Text>
            </TouchableOpacity>
          </View>

          {/* Emotion Explorer Game Card */}
          <View style={[styles.gameCard, { borderColor: '#FEF3C7' }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}><Text style={styles.iconEmoji}>😊🤔</Text></View>
              <View style={styles.cardInfo}>
                <Text style={styles.gameTitle}>Emotion Explorer</Text>
                <Text style={styles.levelText}>Tap the right feeling for the story!</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.playButton, { backgroundColor: '#FBBF24' }]}
              onPress={() => navigation.navigate('EmotionExplorer')}
            >
              <Text style={styles.playButtonText}>▶ PLAY</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* =========================================
          THE PIN GATEWAY MODAL 
          ========================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isPinModalVisible}
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Parent Access</Text>
            <Text style={styles.modalSubtitle}>Enter your 4-digit PIN</Text>

            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry={true}
              value={pinInput}
              onChangeText={setPinInput}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setPinModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePinSubmit} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (Keep all your previous styles exactly the same, and add these at the bottom) ...
  safeArea: { flex: 1, backgroundColor: '#FEFCF5' },
  container: { padding: 24, paddingBottom: 60 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  navButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: '#eee' },
  navButtonText: { fontSize: 16, fontWeight: 'bold', color: '#6B4C30' },

  parentAccessBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'transparent' },
  parentAccessText: { fontSize: 16, fontWeight: 'bold', color: '#B8906A', opacity: 0.7 },
  heroSection: { alignItems: 'center', marginBottom: 40 },
  emojiRow: { fontSize: 32, marginBottom: 10 },
  heroTitle: { fontSize: 36, fontWeight: 'bold', color: '#1E1007', marginBottom: 4 },
  heroSubtitle: { fontSize: 20, fontWeight: 'bold', color: '#3DB5A0', marginBottom: 20 },
  statPill: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 30, borderWidth: 2, borderColor: '#F2B53A' },
  statPillText: { fontSize: 16, fontWeight: 'bold', color: '#C8881A' },
  cardsSection: { flex: 1 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E1007', textAlign: 'center', marginBottom: 20 },
  gameCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 4, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconEmoji: { fontSize: 32 },
  cardInfo: { flex: 1 },
  gameTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1007' },
  levelText: { fontSize: 14, fontWeight: 'bold', color: '#B8906A' },
  playButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  playButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // --- MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(30, 16, 7, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1007', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B4C30', marginBottom: 20 },
  pinInput: { width: '60%', borderBottomWidth: 3, borderBottomColor: '#3DB5A0', fontSize: 32, textAlign: 'center', letterSpacing: 10, marginBottom: 30, paddingBottom: 10 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, paddingVertical: 12, marginRight: 10, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: '#6B4C30' },
  submitBtn: { flex: 1, paddingVertical: 12, marginLeft: 10, borderRadius: 12, backgroundColor: '#3DB5A0', alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});