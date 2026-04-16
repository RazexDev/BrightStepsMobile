import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  Alert, Modal, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../api/axiosConfig';

const ALL_EMOJIS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🥝'];

// --- TECH LEAD ARCHITECTURE: Dynamic Level Configuration ---
const LEVEL_CONFIG = {
  1: { pairs: 2, cardWidth: '45%' }, // 4 cards total (Easy)
  2: { pairs: 3, cardWidth: '30%' }, // 6 cards total (Medium)
  3: { pairs: 4, cardWidth: '22%' }, // 8 cards total (Hard)
  4: { pairs: 6, cardWidth: '30%' }, // 12 cards total (Master)
};

export default function FocusMatchScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  
  // Game State
  const [currentLevel, setCurrentLevel] = useState(1);
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(1);
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);

  // PIN Modal State
  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // --- NEW: Fetch their real progress from the database ---
  const fetchProgress = async () => {
    try {
      const childId = user._id || user.id;
      // Fetch all progress for this student
      const response = await api.get(`/progress/${childId}`);
      const allGames = response.data;

      // Filter only "Focus Match" games
      const focusMatchGames = allGames.filter(g => g.gameName === 'Focus Match');

      if (focusMatchGames.length > 0) {
        // Find the highest level they have completed
        const maxLevelPlayed = Math.max(...focusMatchGames.map(g => g.levelPlayed || 1));
        
        // Unlock the next level (capped at Level 4)
        const nextUnlocked = Math.min(maxLevelPlayed + 1, 4);
        
        setHighestUnlockedLevel(nextUnlocked);
        setCurrentLevel(nextUnlocked); // Auto-jump to their highest level
      }
    } catch (error) {
      console.error("Could not fetch progress:", error.message);
    }
  };

  // Run this once when the screen opens!
  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user]);

  // Watch for currentLevel changes to build the correct grid
  useEffect(() => {
    startNewGame(currentLevel);
  }, [currentLevel]);

  const startNewGame = (levelToStart) => {
    const config = LEVEL_CONFIG[levelToStart];
    
    // Slice the emoji array to only include the required number of pairs
    const activeEmojis = ALL_EMOJIS.slice(0, config.pairs);
    const pairedEmojis = [...activeEmojis, ...activeEmojis];
    
    // Shuffle and initialize
    const shuffled = pairedEmojis.sort(() => Math.random() - 0.5);
    const newCards = shuffled.map((emoji, index) => ({
      id: index,
      emoji: emoji,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(newCards);
    setFlippedIndices([]);
    setMatches(0);
    setMoves(0);
  };

  const saveGameProgress = async (finalMoves) => {
    try {
      let earnedStars = 1;
      if (finalMoves <= LEVEL_CONFIG[currentLevel].pairs * 2) earnedStars = 3;
      else if (finalMoves <= LEVEL_CONFIG[currentLevel].pairs * 3) earnedStars = 2;

      const payload = {
        childId: user._id || user.id, 
        gameName: 'Focus Match',
        levelPlayed: currentLevel,
        totalMoves: finalMoves,
        stars: earnedStars, 
      };

      await api.post('/progress', payload);
      console.log(`Level ${currentLevel} saved! Stars: ${earnedStars}`);
      
      // Update local state to immediately unlock the next level in the UI
      if (currentLevel === highestUnlockedLevel && highestUnlockedLevel < 4) {
        setHighestUnlockedLevel(prev => prev + 1);
      }
      
    } catch (error) {
      if (error.response) {
        console.error("Backend Rejected Payload:", error.response.data);
      } else {
        console.error("Network/Saving Error:", error.message);
      }
    }
  };

  const handleCardPress = (index) => {
    if (cards[index].isFlipped || cards[index].isMatched || flippedIndices.length === 2) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setMoves(moves + 1);
      checkForMatch(newFlippedIndices, newCards);
    }
  };

  const checkForMatch = (indices, currentCards) => {
    const [index1, index2] = indices;

    if (currentCards[index1].emoji === currentCards[index2].emoji) {
      // MATCH FOUND
      currentCards[index1].isMatched = true;
      currentCards[index2].isMatched = true;
      setCards(currentCards);
      setFlippedIndices([]);
      setMatches(matches + 1);

      // WIN CONDITION
      if (matches + 1 === LEVEL_CONFIG[currentLevel].pairs) {
        const finalMoves = moves + 1;
        saveGameProgress(finalMoves);

        setTimeout(() => {
          Alert.alert("🎉 Level Cleared!", `Moves: ${finalMoves}`, [
            { text: "Next Level", onPress: () => {
                if (currentLevel < 4) setCurrentLevel(currentLevel + 1);
                else startNewGame(4);
            }},
            { text: "Go Back", onPress: () => navigation.goBack() }
          ]);
        }, 500);
      }
    } else {
      // NO MATCH
      setTimeout(() => {
        const resetCards = [...currentCards];
        resetCards[index1].isFlipped = false;
        resetCards[index2].isFlipped = false;
        setCards(resetCards);
        setFlippedIndices([]);
      }, 1000);
    }
  };

  // --- Parent PIN Logic ---
  const handlePinSubmit = () => {
    if (pinInput === '1234') {
      setHighestUnlockedLevel(4); // Unlock all levels!
      setPinModalVisible(false);
      setPinInput('');
      Alert.alert("Unlocked", "All levels are now unlocked for this session.");
    } else {
      Alert.alert("Incorrect PIN", "Please try again.");
      setPinInput('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Focus Match</Text>
        <TouchableOpacity onPress={() => setPinModalVisible(true)}>
          <Text style={styles.parentUnlockText}>⚙️ Unlock</Text>
        </TouchableOpacity>
      </View>

      {/* Level Selector */}
      <View style={styles.levelSelector}>
        {[1, 2, 3, 4].map(level => {
          const isUnlocked = level <= highestUnlockedLevel;
          const isActive = level === currentLevel;
          return (
            <TouchableOpacity 
              key={level}
              disabled={!isUnlocked}
              onPress={() => setCurrentLevel(level)}
              style={[
                styles.levelBtn,
                isActive && styles.levelBtnActive,
                !isUnlocked && styles.levelBtnLocked
              ]}
            >
              <Text style={[
                styles.levelBtnText,
                isActive && styles.levelBtnTextActive,
                !isUnlocked && styles.levelBtnTextLocked
              ]}>
                {isUnlocked ? `Lvl ${level}` : '🔒'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Game Board */}
      <View style={styles.board}>
        {cards.map((card, index) => (
          <TouchableOpacity 
            key={card.id} 
            style={[
              styles.card, 
              { width: LEVEL_CONFIG[currentLevel].cardWidth }, // Dynamic Width!
              (card.isFlipped || card.isMatched) ? styles.cardFaceUp : styles.cardFaceDown,
              card.isMatched && { opacity: 0.5 }
            ]}
            onPress={() => handleCardPress(index)}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEmoji}>
              {(card.isFlipped || card.isMatched) ? card.emoji : '❓'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats & Restart */}
      <View style={styles.footer}>
        <Text style={styles.movesText}>Moves: {moves}</Text>
        <TouchableOpacity onPress={() => startNewGame(currentLevel)} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>↻ Restart</Text>
        </TouchableOpacity>
      </View>

      {/* Parent PIN Modal */}
      <Modal animationType="fade" transparent={true} visible={isPinModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Parent Unlock</Text>
            <Text style={styles.modalSubtitle}>Enter PIN to unlock all levels</Text>
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
  safeArea: { flex: 1, backgroundColor: '#E1F3FB' }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 12 },
  backBtnText: { fontWeight: 'bold', color: '#2478A4' },
  title: { fontSize: 22, fontWeight: '900', color: '#1E1007' },
  parentUnlockText: { fontSize: 14, fontWeight: 'bold', color: '#44A7CE' },
  
  levelSelector: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  levelBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: '#44A7CE' },
  levelBtnActive: { backgroundColor: '#44A7CE' },
  levelBtnLocked: { backgroundColor: '#eee', borderColor: '#ccc' },
  levelBtnText: { fontWeight: 'bold', color: '#44A7CE' },
  levelBtnTextActive: { color: '#fff' },
  levelBtnTextLocked: { color: '#999' },

  board: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', padding: 10, gap: 10 },
  card: { aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
  cardFaceDown: { backgroundColor: '#44A7CE' }, 
  cardFaceUp: { backgroundColor: '#fff' }, 
  cardEmoji: { fontSize: 40 },
  
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingBottom: 40 },
  movesText: { fontSize: 18, fontWeight: 'bold', color: '#2478A4' },
  resetBtn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#fff', borderRadius: 20 },
  resetBtnText: { fontSize: 16, fontWeight: 'bold', color: '#E85C45' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(30, 16, 7, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1007', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B4C30', marginBottom: 20 },
  pinInput: { width: '60%', borderBottomWidth: 3, borderBottomColor: '#44A7CE', fontSize: 32, textAlign: 'center', letterSpacing: 10, marginBottom: 30, paddingBottom: 10 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, paddingVertical: 12, marginRight: 10, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: '#6B4C30' },
  submitBtn: { flex: 1, paddingVertical: 12, marginLeft: 10, borderRadius: 12, backgroundColor: '#44A7CE', alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});