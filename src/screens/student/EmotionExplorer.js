import { useContext, useEffect, useRef, useState } from 'react';
import {
    Alert, Animated, Modal,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';

// ================================================================
//  Scenario Data — each entry has text, emoji context, and answer
// ================================================================
const SCENARIOS_BY_LEVEL = {
    1: [
        { text: 'You got a gold star at school!', emoji: '⭐', answer: 'happy' },
        { text: 'Your pet hamster is lost.', emoji: '🐹', answer: 'sad' },
        { text: 'Your best friend gave you a hug!', emoji: '🤗', answer: 'happy' },
    ],
    2: [
        { text: 'You dropped your ice cream.', emoji: '🍦', answer: 'sad' },
        { text: 'Someone broke your favorite toy!', emoji: '🧸', answer: 'angry' },
        { text: 'You won first place in a race!', emoji: '🏆', answer: 'happy' },
        { text: 'A friend jumped out and said BOO!', emoji: '👻', answer: 'surprised' },
        { text: 'Today is your birthday party!', emoji: '🎂', answer: 'happy' },
    ],
    3: [
        { text: 'You found a lost puppy outside.', emoji: '🐶', answer: 'sad' },
        { text: 'Mom made your favorite dinner!', emoji: '🍕', answer: 'happy' },
        { text: 'Someone cut in front of you in line.', emoji: '😤', answer: 'angry' },
        { text: 'You opened an unexpected gift!', emoji: '🎁', answer: 'surprised' },
        { text: 'Your drawing was picked for display!', emoji: '🎨', answer: 'happy' },
        { text: 'A loud thunder woke you up at night.', emoji: '⛈️', answer: 'surprised' },
        { text: 'Your friend moved to another city.', emoji: '🏙️', answer: 'sad' },
    ],
    4: [
        { text: 'Someone laughed at your new haircut.', emoji: '💇', answer: 'sad' },
        { text: 'You helped a classmate and they smiled!', emoji: '😄', answer: 'happy' },
        { text: 'Your game crashed and you lost progress.', emoji: '🎮', answer: 'angry' },
        { text: 'A magician pulled a rabbit from a hat!', emoji: '🎩', answer: 'surprised' },
        { text: 'You got the last cookie from the jar!', emoji: '🍪', answer: 'happy' },
        { text: 'Your sandcastle got washed away.', emoji: '🏖️', answer: 'sad' },
        { text: 'A bird flew into your classroom!', emoji: '🐦', answer: 'surprised' },
        { text: 'Someone blamed you for something you didn\'t do.', emoji: '😠', answer: 'angry' },
        { text: 'You made a new friend at the park!', emoji: '🤝', answer: 'happy' },
        { text: 'Your teacher said "Great job!" in front of everyone.', emoji: '👏', answer: 'happy' },
    ],
};

// All emotion options
const ALL_EMOTIONS = [
    { id: 'happy', emoji: '😀', label: 'Happy' },
    { id: 'sad', emoji: '😢', label: 'Sad' },
    { id: 'angry', emoji: '😡', label: 'Angry' },
    { id: 'surprised', emoji: '😲', label: 'Surprised' },
];

// Which emotions appear per level (scaling choices)
const EMOTIONS_FOR_LEVEL = {
    1: ['happy', 'sad'],                           // 2 choices
    2: ['happy', 'sad', 'angry'],                  // 3 choices
    3: ['happy', 'sad', 'angry', 'surprised'],     // 4 choices
    4: ['happy', 'sad', 'angry', 'surprised'],     // 4 choices
};

// --- TECH LEAD ARCHITECTURE: Level Config ---
const LEVEL_CONFIG = {
    1: { rounds: 3 },
    2: { rounds: 5 },
    3: { rounds: 7 },
    4: { rounds: 10 },
};

// ================================================================
//  Main Screen
// ================================================================
export default function EmotionExplorerScreen({ navigation }) {
    const { user } = useContext(AuthContext);

    // Level & progression
    const [currentLevel, setCurrentLevel] = useState(1);
    const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(1);

    // Game state
    const [currentRound, setCurrentRound] = useState(0);
    const [scenarios, setScenarios] = useState([]);
    const [mistakes, setMistakes] = useState(0);
    const [totalTaps, setTotalTaps] = useState(0);
    const [feedback, setFeedback] = useState(null);        // null | 'correct' | 'wrong'
    const [selectedId, setSelectedId] = useState(null);     // which button was tapped
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Animated entrance for scenario card
    const cardScale = useRef(new Animated.Value(0)).current;

    // Gentle shake animation for wrong answer
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // PIN Modal
    const [isPinModalVisible, setPinModalVisible] = useState(false);
    const [pinInput, setPinInput] = useState('');

    // Derived
    const currentScenario = scenarios[currentRound] || null;
    const availableEmotions = ALL_EMOTIONS.filter(e =>
        EMOTIONS_FOR_LEVEL[currentLevel].includes(e.id),
    );
    const totalRounds = LEVEL_CONFIG[currentLevel].rounds;

    // ---- Fetch progress (same pattern as FocusMatch) ----
    const fetchProgress = async () => {
        try {
            const childId = user._id || user.id;
            const response = await api.get(`/progress/${childId}`);
            const allGames = response.data;

            const emotionGames = allGames.filter(g => g.gameName === 'Emotion Explorer');

            if (emotionGames.length > 0) {
                const maxLevelPlayed = Math.max(
                    ...emotionGames.map(g => g.levelPlayed || 1),
                );
                const nextUnlocked = Math.min(maxLevelPlayed + 1, 4);
                setHighestUnlockedLevel(nextUnlocked);
                setCurrentLevel(nextUnlocked);
            }
        } catch (error) {
            console.error('Could not fetch progress:', error.message);
        }
    };

    useEffect(() => {
        if (user) fetchProgress();
    }, [user]);

    // Start fresh game when level changes
    useEffect(() => {
        startNewGame(currentLevel);
    }, [currentLevel]);

    // ---- Animate card entrance ----
    const animateCardIn = () => {
        cardScale.setValue(0);
        Animated.spring(cardScale, {
            toValue: 1, friction: 4, tension: 50, useNativeDriver: true,
        }).start();
    };

    // ---- Gentle shake for wrong answer ----
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    // ----------------------------------------------------------
    //  Game Logic
    // ----------------------------------------------------------
    const startNewGame = (level) => {
        const pool = [...SCENARIOS_BY_LEVEL[level]];
        const shuffled = pool.sort(() => Math.random() - 0.5);
        setScenarios(shuffled);
        setCurrentRound(0);
        setMistakes(0);
        setTotalTaps(0);
        setFeedback(null);
        setSelectedId(null);
        setIsTransitioning(false);
        setTimeout(animateCardIn, 100);
    };

    const handleEmotionTap = (emotionId) => {
        if (isTransitioning || !currentScenario) return;

        const newTotalTaps = totalTaps + 1;
        setTotalTaps(newTotalTaps);
        setSelectedId(emotionId);

        if (emotionId === currentScenario.answer) {
            // ✅ Correct
            setFeedback('correct');
            setIsTransitioning(true);

            const nextRound = currentRound + 1;

            if (nextRound >= totalRounds) {
                // Level complete
                setTimeout(() => {
                    saveGameProgress(newTotalTaps, mistakes);
                }, 700);
            } else {
                setTimeout(() => {
                    setCurrentRound(nextRound);
                    setFeedback(null);
                    setSelectedId(null);
                    setIsTransitioning(false);
                    animateCardIn();
                }, 800);
            }
        } else {
            // ❌ Wrong — gentle shake, no harsh red
            setMistakes(prev => prev + 1);
            setFeedback('wrong');
            triggerShake();

            setTimeout(() => {
                setFeedback(null);
                setSelectedId(null);
            }, 700);
        }
    };

    const saveGameProgress = async (tapCount, mistakeCount) => {
        try {
            let earnedStars = 1;
            if (mistakeCount === 0) earnedStars = 3;
            else if (mistakeCount <= 2) earnedStars = 2;

            const payload = {
                childId: user._id || user.id,
                gameName: 'Emotion Explorer',
                levelPlayed: currentLevel,
                totalMoves: tapCount,
                stars: earnedStars,
            };

            await api.post('/progress', payload);
            console.log(`Level ${currentLevel} saved! Stars: ${earnedStars}`);

            if (currentLevel === highestUnlockedLevel && highestUnlockedLevel < 4) {
                setHighestUnlockedLevel(prev => prev + 1);
            }

            Alert.alert(
                '🎉 Level Cleared!',
                `Stars: ${'⭐'.repeat(earnedStars)}  •  Mistakes: ${mistakeCount}`,
                [
                    {
                        text: 'Next Level',
                        onPress: () => {
                            if (currentLevel < 4) setCurrentLevel(currentLevel + 1);
                            else startNewGame(4);
                        },
                    },
                    { text: 'Go Back', onPress: () => navigation.goBack() },
                ],
            );
        } catch (error) {
            if (error.response) {
                console.error('Backend Rejected:', error.response.data);
            } else {
                console.error('Network Error:', error.message);
            }
        }
    };

    // ---- Parent PIN Logic ----
    const handlePinSubmit = () => {
        if (pinInput === '1234') {
            setHighestUnlockedLevel(4);
            setPinModalVisible(false);
            setPinInput('');
            Alert.alert('Unlocked', 'All levels are now unlocked for this session.');
        } else {
            Alert.alert('Incorrect PIN', 'Please try again.');
            setPinInput('');
        }
    };

    // ==============================================================
    //  RENDER
    // ==============================================================
    return (
        <SafeAreaView style={styles.safeArea}>

            {/* ---------- Header ---------- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Emotion Explorer</Text>
                <TouchableOpacity onPress={() => setPinModalVisible(true)}>
                    <Text style={styles.parentUnlockText}>⚙️ Unlock</Text>
                </TouchableOpacity>
            </View>

            {/* ---------- Level Selector ---------- */}
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
                                !isUnlocked && styles.levelBtnLocked,
                            ]}
                        >
                            <Text style={[
                                styles.levelBtnText,
                                isActive && styles.levelBtnTextActive,
                                !isUnlocked && styles.levelBtnTextLocked,
                            ]}>
                                {isUnlocked ? `Lvl ${level}` : '🔒'}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ---------- Progress Dots ---------- */}
            <View style={styles.progressRow}>
                {Array.from({ length: totalRounds }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            i < currentRound && styles.progressDotDone,
                            i === currentRound && styles.progressDotCurrent,
                        ]}
                    />
                ))}
            </View>

            {/* ---------- Scenario Card ---------- */}
            {currentScenario && (
                <Animated.View style={[
                    styles.scenarioCard,
                    { transform: [{ scale: cardScale }, { translateX: shakeAnim }] },
                ]}>
                    <Text style={styles.scenarioEmoji}>{currentScenario.emoji}</Text>
                    <Text style={styles.scenarioText}>{currentScenario.text}</Text>
                    <Text style={styles.scenarioPrompt}>How would you feel?</Text>
                </Animated.View>
            )}

            {/* ---------- Feedback Badge ---------- */}
            {feedback && (
                <View style={[
                    styles.feedbackBadge,
                    feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
                ]}>
                    <Text style={styles.feedbackText}>
                        {feedback === 'correct' ? '✅  That\'s right!' : '🤔  Try another one!'}
                    </Text>
                </View>
            )}

            {/* ---------- Emotion Buttons ---------- */}
            <View style={styles.emotionsGrid}>
                {availableEmotions.map(emotion => {
                    const isSelected = selectedId === emotion.id;
                    const isCorrectAnswer = feedback === 'correct' && isSelected;
                    const isWrongAnswer = feedback === 'wrong' && isSelected;

                    return (
                        <TouchableOpacity
                            key={emotion.id}
                            onPress={() => handleEmotionTap(emotion.id)}
                            activeOpacity={0.7}
                            disabled={isTransitioning}
                            style={[
                                styles.emotionButton,
                                isCorrectAnswer && styles.emotionCorrect,
                                isWrongAnswer && styles.emotionWrong,
                            ]}
                        >
                            <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                            <Text style={[
                                styles.emotionLabel,
                                isCorrectAnswer && styles.emotionLabelCorrect,
                            ]}>
                                {emotion.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ---------- Footer ---------- */}
            <View style={styles.footer}>
                <Text style={styles.footerStats}>
                    Round {Math.min(currentRound + 1, totalRounds)}/{totalRounds}  •  ❌ {mistakes}
                </Text>
                <TouchableOpacity onPress={() => startNewGame(currentLevel)} style={styles.resetBtn}>
                    <Text style={styles.resetBtnText}>↻ Restart</Text>
                </TouchableOpacity>
            </View>

            {/* ---------- Parent PIN Modal ---------- */}
            <Modal animationType="fade" transparent visible={isPinModalVisible}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Parent Unlock</Text>
                        <Text style={styles.modalSubtitle}>Enter PIN to unlock all levels</Text>
                        <TextInput
                            style={styles.pinInput}
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                            value={pinInput}
                            onChangeText={setPinInput}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setPinModalVisible(false)}
                                style={styles.cancelBtn}
                            >
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

// ================================================================
//  Styles
// ================================================================
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FEF4CC' },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10,
    },
    backBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 12 },
    backBtnText: { fontWeight: 'bold', color: '#B45309' },
    title: { fontSize: 20, fontWeight: '900', color: '#1E1007' },
    parentUnlockText: { fontSize: 14, fontWeight: 'bold', color: '#D97706' },

    // Level Selector
    levelSelector: {
        flexDirection: 'row', justifyContent: 'center',
        gap: 10, marginBottom: 6,
    },
    levelBtn: {
        paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fff',
        borderRadius: 20, borderWidth: 2, borderColor: '#FBBF24',
    },
    levelBtnActive: { backgroundColor: '#FBBF24' },
    levelBtnLocked: { backgroundColor: '#eee', borderColor: '#ccc' },
    levelBtnText: { fontWeight: 'bold', color: '#B45309' },
    levelBtnTextActive: { color: '#fff' },
    levelBtnTextLocked: { color: '#999' },

    // Progress Dots
    progressRow: {
        flexDirection: 'row', justifyContent: 'center',
        gap: 5, marginBottom: 14,
    },
    progressDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FDE68A' },
    progressDotDone: { backgroundColor: '#F59E0B' },
    progressDotCurrent: { backgroundColor: '#FBBF24', width: 13, height: 13, borderRadius: 7 },

    // Scenario Card
    scenarioCard: {
        marginHorizontal: 24, padding: 24, borderRadius: 24,
        backgroundColor: '#fff', alignItems: 'center',
        elevation: 4, shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8,
        borderWidth: 2, borderColor: '#FDE68A',
    },
    scenarioEmoji: { fontSize: 52, marginBottom: 10 },
    scenarioText: {
        fontSize: 20, fontWeight: '700', color: '#1E1007',
        textAlign: 'center', lineHeight: 28, marginBottom: 12,
    },
    scenarioPrompt: {
        fontSize: 15, fontWeight: '600', color: '#D97706', opacity: 0.8,
    },

    // Feedback
    feedbackBadge: {
        alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24,
        borderRadius: 20, marginTop: 12,
    },
    feedbackCorrect: { backgroundColor: '#D1FAE5' },
    feedbackWrong: { backgroundColor: '#FEF3C7' },
    feedbackText: { fontSize: 15, fontWeight: 'bold', color: '#1E1007' },

    // Emotions Grid
    emotionsGrid: {
        flex: 1, flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'center', alignItems: 'center',
        gap: 14, paddingHorizontal: 24, marginTop: 18,
    },
    emotionButton: {
        width: '44%', paddingVertical: 18, borderRadius: 20,
        backgroundColor: '#fff', alignItems: 'center',
        elevation: 4, shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6,
        borderWidth: 2.5, borderColor: '#FDE68A',
    },
    emotionCorrect: {
        borderColor: '#34D399', backgroundColor: '#ECFDF5',
    },
    emotionWrong: {
        borderColor: '#FCD34D', backgroundColor: '#FFFBEB', opacity: 0.7,
    },
    emotionEmoji: { fontSize: 38, marginBottom: 6 },
    emotionLabel: { fontSize: 16, fontWeight: '800', color: '#B45309' },
    emotionLabelCorrect: { color: '#059669' },

    // Footer
    footer: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 30, paddingBottom: 24,
    },
    footerStats: { fontSize: 15, fontWeight: 'bold', color: '#B45309' },
    resetBtn: {
        paddingVertical: 12, paddingHorizontal: 22,
        backgroundColor: '#fff', borderRadius: 20,
    },
    resetBtnText: { fontSize: 16, fontWeight: 'bold', color: '#E85C45' },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(30, 16, 7, 0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalContent: {
        width: '80%', backgroundColor: '#fff',
        borderRadius: 24, padding: 24, alignItems: 'center',
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E1007', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#6B4C30', marginBottom: 20 },
    pinInput: {
        width: '60%', borderBottomWidth: 3, borderBottomColor: '#FBBF24',
        fontSize: 32, textAlign: 'center', letterSpacing: 10,
        marginBottom: 30, paddingBottom: 10,
    },
    modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    cancelBtn: {
        flex: 1, paddingVertical: 12, marginRight: 10,
        borderRadius: 12, backgroundColor: '#eee', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: '#6B4C30' },
    submitBtn: {
        flex: 1, paddingVertical: 12, marginLeft: 10,
        borderRadius: 12, backgroundColor: '#FBBF24', alignItems: 'center',
    },
    submitBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
