import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    Alert, Animated, Modal, PanResponder,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';

// Shape definitions
const ALL_SHAPES = [
    { id: 'circle', emoji: '🔴', label: 'Circle' },
    { id: 'square', emoji: '🟦', label: 'Square' },
    { id: 'triangle', emoji: '🔺', label: 'Triangle' },
    { id: 'star', emoji: '⭐', label: 'Star' },
    { id: 'diamond', emoji: '🔶', label: 'Diamond' },
    { id: 'green', emoji: '🟩', label: 'Green Sq' },
];

// --- TECH LEAD ARCHITECTURE: Dynamic Level Configuration ---
const LEVEL_CONFIG = {
    1: { zoneCount: 2, shapeCount: 2 },  // Easy
    2: { zoneCount: 3, shapeCount: 3 },  // Medium
    3: { zoneCount: 4, shapeCount: 4 },  // Hard
    4: { zoneCount: 4, shapeCount: 6 },  // Master (2 distractors)
};

// ================================================================
//  Draggable Shape Component (PanResponder + Animated.ValueXY)
// ================================================================
function DraggableShape({ shapeData, getDropZoneLayouts, onDrop, isPlaced }) {
    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;

    // Refs to avoid stale closures inside PanResponder
    const isPlacedRef = useRef(isPlaced);
    const onDropRef = useRef(onDrop);
    const getLayoutsRef = useRef(getDropZoneLayouts);

    useEffect(() => { isPlacedRef.current = isPlaced; }, [isPlaced]);
    useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);
    useEffect(() => { getLayoutsRef.current = getDropZoneLayouts; }, [getDropZoneLayouts]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isPlacedRef.current,
            onMoveShouldSetPanResponder: (_, gs) =>
                !isPlacedRef.current && (Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2),

            onPanResponderGrant: () => {
                Animated.spring(scale, {
                    toValue: 1.15, friction: 4, useNativeDriver: false,
                }).start();
            },

            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false },
            ),

            onPanResponderRelease: (_, gs) => {
                Animated.spring(scale, {
                    toValue: 1, friction: 4, useNativeDriver: false,
                }).start();

                const fingerX = gs.moveX;
                const fingerY = gs.moveY;
                const layouts = getLayoutsRef.current();

                // Check which drop zone the finger landed on
                let hitZoneId = null;
                for (const [id, layout] of Object.entries(layouts)) {
                    if (
                        fingerX >= layout.x &&
                        fingerX <= layout.x + layout.width &&
                        fingerY >= layout.y &&
                        fingerY <= layout.y + layout.height
                    ) {
                        hitZoneId = id;
                        break;
                    }
                }

                const springBack = () => {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        friction: 5, useNativeDriver: false,
                    }).start();
                };

                if (hitZoneId) {
                    onDropRef.current(shapeData, hitZoneId, springBack);
                } else {
                    springBack(); // dropped in empty space
                }
            },
        }),
    ).current;

    // Keep layout stable when placed — render invisible placeholder
    if (isPlaced) {
        return <View style={styles.shapePlaceholder} />;
    }

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.draggableShape,
                {
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale },
                    ],
                    zIndex: 100,
                    elevation: 10,
                },
            ]}
        >
            <Text style={styles.shapeEmoji}>{shapeData.emoji}</Text>
            <Text style={styles.shapeLabel}>{shapeData.label}</Text>
        </Animated.View>
    );
}

// ================================================================
//  Main Screen
// ================================================================
export default function ShapeSortScreen({ navigation }) {
    const { user } = useContext(AuthContext);

    // Level & progression
    const [currentLevel, setCurrentLevel] = useState(1);
    const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(1);

    // Game state
    const [dropZones, setDropZones] = useState([]);
    const [gameShapes, setGameShapes] = useState([]);
    const [placedMap, setPlacedMap] = useState({});   // { zoneId: shapeId }
    const [mistakes, setMistakes] = useState(0);
    const [totalDrags, setTotalDrags] = useState(0);
    const [gameId, setGameId] = useState(0);           // forces DraggableShape remount
    const [levelComplete, setLevelComplete] = useState(false);

    // Refs for async-safe reads inside effects / callbacks
    const mistakesRef = useRef(0);
    const totalDragsRef = useRef(0);

    useEffect(() => { mistakesRef.current = mistakes; }, [mistakes]);
    useEffect(() => { totalDragsRef.current = totalDrags; }, [totalDrags]);

    // Drop-zone measurement refs
    const dropZoneRefs = useRef({});
    const dropZoneLayouts = useRef({});

    // PIN Modal state
    const [isPinModalVisible, setPinModalVisible] = useState(false);
    const [pinInput, setPinInput] = useState('');

    // ---- Fetch progress from DB (same pattern as FocusMatch) ----
    const fetchProgress = async () => {
        try {
            const childId = user._id || user.id;
            const response = await api.get(`/progress/${childId}`);
            const allGames = response.data;

            const shapeSortGames = allGames.filter(g => g.gameName === 'Shape Sort');

            if (shapeSortGames.length > 0) {
                const maxLevelPlayed = Math.max(
                    ...shapeSortGames.map(g => g.levelPlayed || 1),
                );
                const nextUnlocked = Math.min(maxLevelPlayed + 1, 4);
                setHighestUnlockedLevel(nextUnlocked);
                setCurrentLevel(nextUnlocked);
            }
        } catch (error) {
            console.error('Could not fetch progress:', error.message);
        }
    };

    // Run once on mount
    useEffect(() => {
        if (user) fetchProgress();
    }, [user]);

    // Start fresh game when level changes
    useEffect(() => {
        startNewGame(currentLevel);
    }, [currentLevel]);

    // Measure drop zones after they mount / remount
    useEffect(() => {
        if (dropZones.length > 0) {
            setTimeout(measureDropZones, 400);
        }
    }, [dropZones, gameId]);

    // ---- Win condition ----
    useEffect(() => {
        if (
            dropZones.length > 0 &&
            !levelComplete &&
            Object.keys(placedMap).length === dropZones.length
        ) {
            setLevelComplete(true);
            setTimeout(() => {
                saveGameProgress(totalDragsRef.current, mistakesRef.current);
            }, 600);
        }
    }, [placedMap]);

    // ----------------------------------------------------------
    //  Helpers
    // ----------------------------------------------------------
    const measureDropZones = () => {
        Object.entries(dropZoneRefs.current).forEach(([id, ref]) => {
            if (ref) {
                ref.measure((x, y, width, height, pageX, pageY) => {
                    dropZoneLayouts.current[id] = {
                        x: pageX, y: pageY, width, height,
                    };
                });
            }
        });
    };

    const getDropZoneLayoutsCb = useCallback(() => dropZoneLayouts.current, []);

    const startNewGame = (level) => {
        const config = LEVEL_CONFIG[level];
        const shuffled = [...ALL_SHAPES].sort(() => Math.random() - 0.5);

        // First N become drop-zone targets
        const zoneShapes = shuffled.slice(0, config.zoneCount);

        // Draggable pool = zone shapes + optional distractors, re-shuffled
        let draggables;
        if (config.shapeCount > config.zoneCount) {
            const distractors = shuffled.slice(config.zoneCount, config.shapeCount);
            draggables = [...zoneShapes, ...distractors].sort(() => Math.random() - 0.5);
        } else {
            draggables = [...zoneShapes].sort(() => Math.random() - 0.5);
        }

        setDropZones(zoneShapes);
        setGameShapes(draggables);
        setPlacedMap({});
        setMistakes(0);
        setTotalDrags(0);
        mistakesRef.current = 0;
        totalDragsRef.current = 0;
        setLevelComplete(false);
        setGameId(prev => prev + 1);
        dropZoneRefs.current = {};
        dropZoneLayouts.current = {};
    };

    // Called by DraggableShape on drop
    const handleDrop = useCallback((shape, zoneId, springBack) => {
        setTotalDrags(prev => prev + 1);
        totalDragsRef.current += 1;

        // Zone already filled — bounce back (not a mistake)
        if (placedMap[zoneId]) {
            springBack();
            return;
        }

        if (shape.id === zoneId) {
            // ✅ Correct match — shape disappears from pool, emoji fills zone
            setPlacedMap(prev => ({ ...prev, [zoneId]: shape.id }));
        } else {
            // ❌ Wrong — count mistake and spring back
            setMistakes(prev => prev + 1);
            mistakesRef.current += 1;
            springBack();
        }
    }, [placedMap]);

    const saveGameProgress = async (dragCount, mistakeCount) => {
        try {
            let earnedStars = 1;
            if (mistakeCount === 0) earnedStars = 3;        // perfect
            else if (mistakeCount <= 2) earnedStars = 2;     // a few mistakes

            const payload = {
                childId: user._id || user.id,
                gameName: 'Shape Sort',
                levelPlayed: currentLevel,
                totalMoves: dragCount,
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

    // ---- Parent PIN Logic (identical to FocusMatch) ----
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

    const sortedCount = Object.keys(placedMap).length;

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
                <Text style={styles.title}>Shape Sort</Text>
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

            {/* ---------- Status Row ---------- */}
            <View style={styles.statusRow}>
                <Text style={styles.statusText}>✅ {sortedCount}/{dropZones.length} sorted</Text>
                <Text style={styles.statusText}>❌ {mistakes} mistake{mistakes !== 1 ? 's' : ''}</Text>
            </View>

            {/* ---------- Drop Zones (top half) ---------- */}
            <View style={styles.dropZoneContainer}>
                <Text style={styles.sectionLabel}>Drop shapes here</Text>
                <View style={styles.dropZoneRow}>
                    {dropZones.map(zone => (
                        <View
                            key={`${gameId}-zone-${zone.id}`}
                            ref={ref => { dropZoneRefs.current[zone.id] = ref; }}
                            collapsable={false}
                            style={[
                                styles.dropZone,
                                placedMap[zone.id] && styles.dropZoneFilled,
                            ]}
                        >
                            {placedMap[zone.id] ? (
                                <Text style={styles.placedEmoji}>{zone.emoji}</Text>
                            ) : (
                                <>
                                    <Text style={styles.dropZoneEmoji}>{zone.emoji}</Text>
                                    <Text style={styles.dropZoneLabel}>{zone.label}</Text>
                                </>
                            )}
                        </View>
                    ))}
                </View>
            </View>

            {/* ---------- Divider ---------- */}
            <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>⬆ Drag shapes up ⬆</Text>
                <View style={styles.dividerLine} />
            </View>

            {/* ---------- Draggable Shapes (bottom half) ---------- */}
            <View style={styles.shapesPool}>
                {gameShapes.map(shape => (
                    <DraggableShape
                        key={`${gameId}-${shape.id}`}
                        shapeData={shape}
                        getDropZoneLayouts={getDropZoneLayoutsCb}
                        onDrop={handleDrop}
                        isPlaced={Object.values(placedMap).includes(shape.id)}
                    />
                ))}
            </View>

            {/* ---------- Footer ---------- */}
            <View style={styles.footer}>
                <Text style={styles.footerDrags}>Drags: {totalDrags}</Text>
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
    safeArea: { flex: 1, backgroundColor: '#F3E8FF' },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10,
    },
    backBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 12 },
    backBtnText: { fontWeight: 'bold', color: '#7C3AED' },
    title: { fontSize: 22, fontWeight: '900', color: '#1E1007' },
    parentUnlockText: { fontSize: 14, fontWeight: 'bold', color: '#A78BFA' },

    // Level Selector
    levelSelector: {
        flexDirection: 'row', justifyContent: 'center',
        gap: 10, marginBottom: 6,
    },
    levelBtn: {
        paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fff',
        borderRadius: 20, borderWidth: 2, borderColor: '#A78BFA',
    },
    levelBtnActive: { backgroundColor: '#7C3AED' },
    levelBtnLocked: { backgroundColor: '#eee', borderColor: '#ccc' },
    levelBtnText: { fontWeight: 'bold', color: '#7C3AED' },
    levelBtnTextActive: { color: '#fff' },
    levelBtnTextLocked: { color: '#999' },

    // Status
    statusRow: {
        flexDirection: 'row', justifyContent: 'center',
        gap: 24, marginBottom: 8,
    },
    statusText: { fontSize: 14, fontWeight: '600', color: '#6D28D9' },

    // Drop Zones
    dropZoneContainer: { alignItems: 'center', paddingHorizontal: 16 },
    sectionLabel: {
        fontSize: 13, fontWeight: '700', color: '#A78BFA',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,
    },
    dropZoneRow: {
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'center', gap: 12,
    },
    dropZone: {
        width: 78, height: 78, borderRadius: 16,
        borderWidth: 2.5, borderColor: '#C4B5FD', borderStyle: 'dashed',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center', alignItems: 'center',
    },
    dropZoneFilled: {
        borderStyle: 'solid', borderColor: '#34D399', backgroundColor: '#D1FAE5',
    },
    dropZoneEmoji: { fontSize: 22, opacity: 0.35 },
    dropZoneLabel: { fontSize: 10, fontWeight: '700', color: '#A78BFA', marginTop: 2 },
    placedEmoji: { fontSize: 34 },

    // Divider
    divider: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', marginVertical: 14, paddingHorizontal: 30,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#DDD6FE' },
    dividerText: {
        fontSize: 13, fontWeight: '600', color: '#C4B5FD',
        marginHorizontal: 10,
    },

    // Shapes Pool
    shapesPool: {
        flex: 1, flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'center', alignItems: 'center',
        gap: 14, paddingHorizontal: 20,
    },
    draggableShape: {
        width: 78, height: 88, borderRadius: 16, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        elevation: 5, shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6,
        borderWidth: 2, borderColor: '#EDE9FE',
    },
    shapeEmoji: { fontSize: 34 },
    shapeLabel: { fontSize: 10, fontWeight: '700', color: '#6D28D9', marginTop: 4 },
    shapePlaceholder: { width: 78, height: 88, borderRadius: 16 },

    // Footer
    footer: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 30, paddingBottom: 24,
    },
    footerDrags: { fontSize: 15, fontWeight: 'bold', color: '#6D28D9' },
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
        width: '60%', borderBottomWidth: 3, borderBottomColor: '#7C3AED',
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
        borderRadius: 12, backgroundColor: '#7C3AED', alignItems: 'center',
    },
    submitBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
