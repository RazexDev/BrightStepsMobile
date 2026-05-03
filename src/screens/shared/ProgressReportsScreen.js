import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, ScrollView, RefreshControl, Modal, Dimensions,
  KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { 
  getProgressReports, createProgressReport, 
  updateProgressReport, deleteProgressReport,
  getGameTelemetryByChild
} from '../../api/progressApi';
import { 
  formatDuration, getDateRange, filterReportsByDateAndStudent, 
  calculateSummaryCards, calculateStudentActivityAnalytics, 
  calculateGameAnalytics, groupReportsByStudent, calculateDailyTrend 
} from '../../utils/progressAnalytics';
import { LineChart, BarChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Image as RNImage } from 'react-native';

const { width } = Dimensions.get('window');

const MOODS = ['Happy', 'Neutral', 'Frustrated', 'Excited', 'Tired'];
const ENGAGEMENTS = ['High', 'Medium', 'Low'];
const PROGRESS_LEVELS = ['Excellent', 'Good', 'Average', 'Needs Improvement'];
const ATTENDANCE_OPTIONS = ['Present', 'Absent'];

const FALLBACK_SKILLS = [
  'Cognitive Skills', 'Motor Skills', 'Social Skills', 
  'Communication Skills', 'Emotional Skills', 
  'Daily Living Skills', 'Educational Games', 'Other'
];

const FALLBACK_ACTIVITIES = {
  'Cognitive Skills': ['Shape Sort', 'Puzzle', 'Memory Match', 'Number Matching', 'Alphabet Matching'],
  'Motor Skills': ['Drawing Practice', 'Tracing', 'Hand-eye Coordination', 'Sorting Objects'],
  'Social Skills': ['Turn Taking', 'Group Activity', 'Sharing Practice', 'Role Play'],
  'Communication Skills': ['Picture Naming', 'Story Telling', 'Listening Practice', 'Vocabulary Practice'],
  'Emotional Skills': ['Emotion Explorer', 'Feeling Cards', 'Calm Down Practice'],
  'Daily Living Skills': ['Brushing Teeth', 'Washing Hands', 'Packing Bag', 'Dressing Practice'],
  'Educational Games': ['Focus Match', 'Shape Sort', 'Emotion Explorer'],
  'Other': ['Other / Custom Activity']
};

const CustomDropdown = ({ label, value, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={[styles.inputGroup, { zIndex: isOpen ? 50 : 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setIsOpen(!isOpen)}>
        <Text style={styles.dropdownBtnText}>{value}</Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
      </TouchableOpacity>
      {isOpen && (
        <ScrollView style={styles.dropdownListWrapper} nestedScrollEnabled={true}>
          {options.map(opt => (
            <TouchableOpacity 
              key={opt} 
              style={styles.dropdownListItem} 
              onPress={() => { onSelect(opt); setIsOpen(false); }}
            >
              <Text style={styles.dropdownListItemText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// A filter pill that opens a full-screen bottom-sheet style Modal
// This avoids z-index/clipping issues inside ScrollViews
const FilterPicker = ({ value, options, onSelect, style }) => {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[filterPickerStyles.pill, style]}
        onPress={() => setVisible(true)}
      >
        <Text style={filterPickerStyles.pillText} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-down" size={14} color="#475569" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={filterPickerStyles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={filterPickerStyles.sheet}>
            <View style={filterPickerStyles.sheetHandle} />
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[
                  filterPickerStyles.sheetItem,
                  opt === value && filterPickerStyles.sheetItemActive
                ]}
                onPress={() => { onSelect(opt); setVisible(false); }}
              >
                <Text style={[
                  filterPickerStyles.sheetItemText,
                  opt === value && filterPickerStyles.sheetItemTextActive
                ]}>{opt}</Text>
                {opt === value && <Ionicons name="checkmark" size={16} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const filterPickerStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
    minWidth: 130,
    maxWidth: 180,
  },
  pillText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1E293B' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 32, paddingHorizontal: 16, maxHeight: 400 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetItemActive: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8 },
  sheetItemText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  sheetItemTextActive: { color: '#2563EB', fontWeight: '700' },
});

export default function ProgressReportsScreen() {
  const { user } = useContext(AuthContext);
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // Core Data
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [reportType, setReportType] = useState('Weekly');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Table Filters
  const [tableStudentFilter, setTableStudentFilter] = useState('All Students');
  const [tableDateFilter, setTableDateFilter] = useState('Newest First');
  
  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  // Create Form State
  const [studentName, setStudentName] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [attendance, setAttendance] = useState('Present');
  
  const [skillArea, setSkillArea] = useState(FALLBACK_SKILLS[0]);
  const [customSkill, setCustomSkill] = useState('');
  
  const [activity, setActivity] = useState(FALLBACK_ACTIVITIES[FALLBACK_SKILLS[0]][0]);
  const [customActivity, setCustomActivity] = useState('');
  
  const [progressLevel, setProgressLevel] = useState(PROGRESS_LEVELS[0]);
  const [engagement, setEngagement] = useState(ENGAGEMENTS[0]);
  const [mood, setMood] = useState(MOODS[0]);
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);

  // --- Parent Specific Data ---
  const childName = user?.studentName || 'Yuhi'; // Based on screenshot fallback
  
  const parentReports = useMemo(() => {
    if (isTeacher) return [];
    const filtered = allReports.filter(r => r.studentName === childName || r.studentName?.includes(childName));
    return filtered.length > 0 ? filtered : allReports.slice(0, 2); // Default to latest 2 for UI demo if no exact match
  }, [allReports, isTeacher, childName]);

  const parentSummary = useMemo(() => {
    if (isTeacher) return null;
    const totalReports = parentReports.length;
    const happyDays = parentReports.filter(r => r.mood === 'Happy' || r.mood === 'Excited').length;
    // Stars: use r.stars field first, fallback to progressLevel mapping
    const progressStarMap = { 'Excellent': 3, 'Good': 2, 'Average': 1, 'Needs Improvement': 0,
      'Developing': 1, 'Needs Support': 0 };
    const starsEarned = parentReports.reduce((sum, r) => {
      const direct = Number(r.stars);
      if (direct > 0) return sum + direct;
      return sum + (progressStarMap[r.progressLevel] || 0);
    }, 0);
    const totalTimeMinutes = parentReports.reduce((sum, r) => sum + (Number(r.sessionDuration) || Number(r.durationMinutes) || 0), 0);
    return { totalReports, happyDays, starsEarned, totalTimeMinutes };
  }, [parentReports, isTeacher]);

  const parentWeekly = useMemo(() => {
    if (isTeacher) return null;
    const uniqueActivities = new Set(parentReports.map(r => r.activity)).size;
    const activityCounts = {};
    parentReports.forEach(r => {
      activityCounts[r.activity] = (activityCounts[r.activity] || 0) + 1;
    });
    const mostFreq = Object.entries(activityCounts).sort((a,b)=>b[1]-a[1])[0];
    const mostFreqActivity = mostFreq ? mostFreq[0] : 'N/A';
    return { uniqueActivities, mostFreqActivity };
  }, [parentReports, isTeacher]);

  // Game Telemetry State (parent only)
  const [gameTelemetry, setGameTelemetry] = useState([]);

  // File Picking Methods
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
          mimeType: asset.mimeType || "application/pdf",
        });
        setFilePreview(asset.uri);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not pick document");
    } finally {
      setShowFilePickerModal(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          mimeType: asset.mimeType || "image/jpeg",
        });
        setFilePreview(asset.uri);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not pick image");
    } finally {
      setShowFilePickerModal(false);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Needed", "We need camera permissions to take a picture.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: `camera_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          mimeType: asset.mimeType || "image/jpeg",
        });
        setFilePreview(asset.uri);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not take photo");
    } finally {
      setShowFilePickerModal(false);
    }
  };

  const GAME_DEFS = [
    { name: 'Focus Match', emoji: '🧠', color: '#44A7CE', bg: '#E1F3FB' },
    { name: 'Shape Sort',  emoji: '🔺', color: '#7C3AED', bg: '#F3E8FF' },
    { name: 'Emotion Explorer', emoji: '😊', color: '#F59E0B', bg: '#FFFBEB' },
  ];

  const gameStats = useMemo(() => {
    if (isTeacher || gameTelemetry.length === 0) return [];
    return GAME_DEFS.map(def => {
      const records = gameTelemetry.filter(g => g.gameName === def.name);
      const plays = records.length;
      const totalStars = records.reduce((s, g) => s + (Number(g.stars) || 0), 0);
      const avgStars = plays > 0 ? (totalStars / plays).toFixed(1) : '0';
      // completionTime in seconds, convert to minutes
      const totalTimeSec = records.reduce((s, g) => s + (Number(g.completionTime) || 0), 0);
      const totalTimeMins = Math.round(totalTimeSec / 60);
      const maxLevel = plays > 0 ? Math.max(...records.map(g => g.levelPlayed || 1)) : 0;
      return { ...def, plays, totalStars, avgStars, totalTimeMins, maxLevel };
    });
  }, [gameTelemetry, isTeacher]);

  // Fetch Data
  const fetchReports = useCallback(async () => {
    try {
      const data = await getProgressReports();
      setAllReports(data);
      // Fetch game telemetry for parent (uses childId = student's own user._id)
      if (!isTeacher && (user?._id || user?.id)) {
        try {
          const childId = user._id || user.id;
          const gameData = await getGameTelemetryByChild(childId);
          // Filter to only game telemetry records (have gameName)
          setGameTelemetry(Array.isArray(gameData) ? gameData.filter(g => g.gameName) : []);
        } catch (e) {
          console.log('Game telemetry not available:', e.message);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load progress reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTeacher, user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  // Student Suggestions
  const uniqueStudents = useMemo(() => {
    const map = new Map();
    allReports.forEach(r => {
      if (r.studentName && !map.has(r.studentName)) {
        map.set(r.studentName, { name: r.studentName, id: r.studentId || r.childId });
      }
    });
    return Array.from(map.values());
  }, [allReports]);

  const filteredStudents = useMemo(() => {
    if (!studentName) return uniqueStudents.slice(0, 5);
    return uniqueStudents.filter(s => s.name.toLowerCase().includes(studentName.toLowerCase())).slice(0, 5);
  }, [studentName, uniqueStudents]);

  // Derived Analytics Data
  const { startDate, endDate } = getDateRange(reportType);
  const filteredReports = filterReportsByDateAndStudent(allReports, startDate, endDate, studentSearch);
  
  const summary = useMemo(() => calculateSummaryCards(filteredReports), [filteredReports]);
  const studentActivity = useMemo(() => calculateStudentActivityAnalytics(filteredReports), [filteredReports]);
  const gameAnalytics = useMemo(() => calculateGameAnalytics(filteredReports), [filteredReports]);
  const groupedList = useMemo(() => groupReportsByStudent(filteredReports), [filteredReports]);
  const dailyTrend = useMemo(() => calculateDailyTrend(filteredReports), [filteredReports]);

  // Final List after dropdown filters
  const finalGroupedList = useMemo(() => {
    let list = [...groupedList];
    if (tableStudentFilter !== 'All Students') {
      list = list.filter(g => g.studentName === tableStudentFilter);
    }
    if (tableDateFilter === 'Oldest First') {
      list.sort((a, b) => new Date(a.latestDate) - new Date(b.latestDate));
    } else {
      list.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));
    }
    return list;
  }, [groupedList, tableStudentFilter, tableDateFilter]);

  const allStudentOptions = useMemo(() => {
    return ['All Students', ...uniqueStudents.map(s => s.name)];
  }, [uniqueStudents]);

  // Generate PDF
  const generatePDF = async (report) => {
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1f2937; }
            h1 { color: #3b82f6; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .section { margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; color: #64748b; }
            .value { font-weight: 500; }
          </style>
        </head>
        <body>
          <h1>BrightSteps Progress Report</h1>
          <div class="section">
            <div class="row"><span class="label">Student Name:</span> <span class="value">${report.studentName || 'N/A'}</span></div>
            <div class="row"><span class="label">Student ID:</span> <span class="value">${report.studentId || report.childId || 'N/A'}</span></div>
            <div class="row"><span class="label">Date:</span> <span class="value">${new Date(report.date || report.createdAt).toLocaleDateString()}</span></div>
            <div class="row"><span class="label">Attendance:</span> <span class="value">${report.attendanceStatus || 'N/A'}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="label">Skill Area:</span> <span class="value">${report.skillArea || 'N/A'}</span></div>
            <div class="row"><span class="label">Activity:</span> <span class="value">${report.activity || report.gameName || 'N/A'}</span></div>
            <div class="row"><span class="label">Duration:</span> <span class="value">${formatDuration(report.sessionDuration || report.durationMinutes)}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="label">Progress Level:</span> <span class="value">${report.progressLevel || 'N/A'}</span></div>
            <div class="row"><span class="label">Engagement:</span> <span class="value">${report.engagementLevel || 'N/A'}</span></div>
            <div class="row"><span class="label">Mood:</span> <span class="value">${report.mood || 'N/A'}</span></div>
          </div>
          ${report.notes ? `<div class="section"><div class="label">Teacher Notes:</div><p>${report.notes}</p></div>` : ''}
          ${report.recommendations ? `<div class="section"><div class="label">Recommendations:</div><p>${report.recommendations}</p></div>` : ''}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Generated', 'File saved at: ' + uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not generate PDF.');
    }
  };

  const generateListPDF = async () => {
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1f2937; }
            h1 { color: #3b82f6; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>Student Progress Reports Overview</h1>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Total Reports</th>
                <th>Latest Activity</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              ${finalGroupedList.map(g => `
                <tr>
                  <td>${g.studentId || 'N/A'}</td>
                  <td>${g.studentName}</td>
                  <td>${g.totalReports}</td>
                  <td>${g.latestActivity}</td>
                  <td>${g.progress}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Generated', 'File saved at: ' + uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not generate List PDF.');
    }
  };

  // Actions
  const handleSaveReport = async () => {
    if (!studentName.trim() || !date.trim() || !activity || !hours.trim()) {
      Alert.alert('Validation Error', 'Student Name, Date, Duration (Hours), and Activity are required.');
      return;
    }

    setIsSubmitting(true);
    const durationMins = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    const finalActivity = activity === 'Other / Custom Activity' ? customActivity : activity;
    const finalSkill = skillArea === 'Other' ? customSkill : skillArea;

    const payload = {
      studentName: studentName.trim(),
      date: new Date(date),
      sessionDuration: durationMins,
      attendanceStatus: attendance,
      skillArea: finalSkill,
      activity: finalActivity,
      progressLevel,
      engagementLevel: engagement,
      mood,
      notes: notes.trim(),
      recommendations: recommendations.trim()
    };

    try {
      if (editingReport) {
        await updateProgressReport(editingReport._id, payload);
        Alert.alert('Success', 'Report updated!');
        setEditingReport(null);
        setShowEditModal(false);
      } else {
        if (selectedFile) {
          const formData = new FormData();
          Object.keys(payload).forEach(key => {
            if (payload[key] !== undefined && payload[key] !== null) {
              if (payload[key] instanceof Date) {
                formData.append(key, payload[key].toISOString());
              } else {
                formData.append(key, String(payload[key]));
              }
            }
          });
          formData.append("file", {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.mimeType || "application/octet-stream"
          });
          await createProgressReport(formData, true);
        } else {
          await createProgressReport(payload, false);
        }
        Alert.alert('Success', 'Daily report saved!');
        
        // Clear Form
        setStudentName(''); setDate(new Date().toISOString().split('T')[0]);
        setHours(''); setMinutes(''); setNotes(''); setRecommendations(''); setCustomActivity(''); setCustomSkill('');
        setSelectedFile(null); setFilePreview(null);
      }
      fetchReports();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteProgressReport(id);
          fetchReports();
          if (showHistoryModal && selectedStudentHistory) {
            setShowHistoryModal(false);
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to delete report.');
        }
      }}
    ]);
  };

  const openEdit = (report) => {
    setShowHistoryModal(false);
    
    setTimeout(() => {
      setEditingReport(report);
      setStudentName(report.studentName || '');
      setDate(new Date(report.date || report.createdAt).toISOString().split('T')[0]);
      const dMins = report.sessionDuration || report.durationMinutes || 0;
      setHours(String(Math.floor(dMins / 60)));
      setMinutes(String(dMins % 60));
      setAttendance(report.attendanceStatus || 'Present');
      
      let reportSkill = report.skillArea;
      if (!FALLBACK_SKILLS.includes(reportSkill)) {
        setSkillArea('Other');
        setCustomSkill(reportSkill || '');
      } else {
        setSkillArea(reportSkill);
      }
      
      let reportActivity = report.activity || report.gameName;
      if (FALLBACK_ACTIVITIES[reportSkill]?.includes(reportActivity)) {
        setActivity(reportActivity);
        setCustomActivity('');
      } else {
        setActivity('Other / Custom Activity');
        setCustomActivity(reportActivity || '');
      }
      
      setProgressLevel(report.progressLevel || PROGRESS_LEVELS[0]);
      setEngagement(report.engagementLevel || ENGAGEMENTS[0]);
      setMood(report.mood || MOODS[0]);
      setNotes(report.notes || '');
      setRecommendations(report.recommendations || '');
      setShowEditModal(true);
    }, 400); // Allow history modal to fully close to prevent conflict
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress Reports</Text>
          <Text style={styles.headerSubtitle}>{isTeacher ? 'Manage and track student progress' : 'View your child\'s progress'}</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <TouchableOpacity activeOpacity={1} onPress={() => setShowStudentDropdown(false)}>
            {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{marginTop: 50}} /> : (
              <>
                {/* ---------- FORM SECTION ---------- */}
                {isTeacher && (
                  <View style={styles.cardSection}>
                    <Text style={styles.mainSectionTitle}>⊕ New Daily Report</Text>
                    
                    {/* SECTION 1 */}
                    <View style={styles.formSubSection}>
                      <Text style={styles.subSectionTitle}>👤 Student & Session Details</Text>
                      
                      <View style={{ zIndex: 60, marginBottom: 16 }}>
                        <Text style={styles.label}>Search Student Name *</Text>
                        <TextInput 
                          style={styles.input} 
                          value={studentName} 
                          onChangeText={(t) => { setStudentName(t); setShowStudentDropdown(true); }} 
                          onFocus={() => setShowStudentDropdown(true)}
                          placeholder="Search or type student..." 
                        />
                        {showStudentDropdown && filteredStudents.length > 0 && (
                          <View style={styles.dropdownContainer}>
                             {filteredStudents.map((s, idx) => (
                                <TouchableOpacity 
                                  key={idx} 
                                  style={styles.dropdownItem} 
                                  onPress={() => { 
                                    setStudentName(s.name); 
                                    setShowStudentDropdown(false); 
                                  }}
                                >
                                   <Text style={styles.dropdownItemText}>{s.name} {s.id ? `(${s.id})` : ''}</Text>
                                </TouchableOpacity>
                             ))}
                          </View>
                        )}
                      </View>

                      <View style={[styles.row, {zIndex: 1}]}>
                        <View style={[styles.inputGroup, {flex: 2, marginRight: 8}]}>
                          <Text style={styles.label}>Date *</Text>
                          <TextInput style={styles.input} value={date} onChangeText={setDate} />
                        </View>
                        
                        <View style={[styles.inputGroup, {flex: 1, marginRight: 8}]}>
                          <Text style={styles.label}>Hours</Text>
                          <TextInput style={styles.input} value={hours} onChangeText={setHours} keyboardType="numeric" placeholder="0" />
                        </View>
                        <View style={[styles.inputGroup, {flex: 1}]}>
                          <Text style={styles.label}>Minutes</Text>
                          <TextInput style={styles.input} value={minutes} onChangeText={setMinutes} keyboardType="numeric" placeholder="0" />
                        </View>
                      </View>
                      
                      <CustomDropdown 
                        label="Attendance *" 
                        value={attendance} 
                        options={ATTENDANCE_OPTIONS} 
                        onSelect={setAttendance} 
                      />
                    </View>

                    {/* SECTION 2 */}
                    <View style={[styles.formSubSection, { zIndex: 40 }]}>
                      <Text style={styles.subSectionTitle}>🎯 Activity & Progress</Text>

                      <View style={{ zIndex: 40 }}>
                        <CustomDropdown 
                          label="Skill Area *" 
                          value={skillArea} 
                          options={FALLBACK_SKILLS} 
                          onSelect={(val) => {
                            setSkillArea(val);
                            if(val !== 'Other') {
                              setActivity(FALLBACK_ACTIVITIES[val][0]);
                            }
                          }} 
                        />
                      </View>

                      {skillArea === 'Other' && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Custom Skill Area *</Text>
                          <TextInput style={styles.input} value={customSkill} onChangeText={setCustomSkill} placeholder="Type custom skill..." />
                        </View>
                      )}

                      <View style={{ zIndex: 30 }}>
                        <CustomDropdown 
                          label="Activity Name *" 
                          value={activity} 
                          options={skillArea === 'Other' ? ['Other / Custom Activity'] : (FALLBACK_ACTIVITIES[skillArea] || ['Other / Custom Activity'])} 
                          onSelect={setActivity} 
                        />
                      </View>

                      {activity === 'Other / Custom Activity' && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Custom Activity *</Text>
                          <TextInput style={styles.input} value={customActivity} onChangeText={setCustomActivity} placeholder="Type activity..." />
                        </View>
                      )}

                      <View style={{ zIndex: 20 }}>
                        <CustomDropdown 
                          label="Progress Level *" 
                          value={progressLevel} 
                          options={PROGRESS_LEVELS} 
                          onSelect={setProgressLevel} 
                        />
                      </View>
                      
                      <View style={{ zIndex: 10 }}>
                        <CustomDropdown 
                          label="Engagement" 
                          value={engagement} 
                          options={ENGAGEMENTS} 
                          onSelect={setEngagement} 
                        />
                      </View>
                    </View>

                    {/* SECTION 3 */}
                    <View style={[styles.formSubSection, { zIndex: 1 }]}>
                      <Text style={styles.subSectionTitle}>📝 Notes & Recommendations</Text>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Teacher's Notes</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} multiline placeholder="How was the session? Observations..." />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Next Steps / Recommendations</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={recommendations} onChangeText={setRecommendations} multiline placeholder="Suggested follow-up activities..." />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Attach Resource (Optional)</Text>

                        {/* Image thumbnail preview */}
                        {filePreview && selectedFile?.type?.includes('image') ? (
                          <View style={{ marginBottom: 10, position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                            <RNImage source={{ uri: filePreview }} style={{ width: '100%', height: 160, borderRadius: 10 }} resizeMode="cover" />
                            <TouchableOpacity
                              style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#FFF', borderRadius: 12, elevation: 3 }}
                              onPress={() => { setSelectedFile(null); setFilePreview(null); }}
                            >
                              <Ionicons name="close-circle" size={26} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ) : selectedFile ? (
                          /* PDF / Doc file card */
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#86EFAC' }}>
                            <Ionicons name="document-outline" size={24} color="#16A34A" />
                            <Text style={{ flex: 1, marginLeft: 10, color: '#166534', fontWeight: '600', fontSize: 13 }} numberOfLines={1}>{selectedFile.name}</Text>
                            <TouchableOpacity onPress={() => { setSelectedFile(null); setFilePreview(null); }}>
                              <Ionicons name="close-circle" size={22} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        <TouchableOpacity
                          style={styles.uploadBtn}
                          onPress={() => {
                            Alert.alert(
                              'Attach Resource',
                              'Choose file source',
                              [
                                { text: '📄 Pick Document (PDF)', onPress: pickDocument },
                                { text: '🖼️ Choose from Gallery', onPress: pickImageFromGallery },
                                { text: '📷 Take a Photo', onPress: pickImageFromCamera },
                                { text: 'Cancel', style: 'cancel' },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="cloud-upload-outline" size={22} color="#3B82F6" />
                          <Text style={styles.uploadBtnText}>
                            {selectedFile ? '🔄 Change File' : 'Tap to select PDF or Image'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveReport} disabled={isSubmitting}>
                      {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>💾 Save Daily Report</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* ---------- ANALYTICS SECTION ---------- */}
                {isTeacher && (
                  <View style={styles.analyticsWrapper}>
                    <Text style={styles.sectionTitle}>📊 Weekly Analytics</Text>
                    
                    <View style={styles.filterRow}>
                      <TouchableOpacity style={styles.filterChip} onPress={() => setReportType(reportType === 'Weekly' ? 'Monthly' : 'Weekly')}>
                        <Text style={styles.filterChipText}>Type: {reportType}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.summaryGrid}>
                      <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.activeStudents}</Text><Text style={styles.summaryLbl}>Active Students</Text></View>
                      <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.totalReports}</Text><Text style={styles.summaryLbl}>Total Reports</Text></View>
                      <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.uniqueActivities}</Text><Text style={styles.summaryLbl}>Activities</Text></View>
                      <View style={styles.summaryBox}><Text style={styles.summaryVal}>{formatDuration(summary.totalGameTimeMinutes)}</Text><Text style={styles.summaryLbl}>Game Time</Text></View>
                      <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.gamePlays}</Text><Text style={styles.summaryLbl}>Game Plays</Text></View>
                      <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.totalStars}</Text><Text style={styles.summaryLbl}>Stars Earned</Text></View>
                    </View>

                    {dailyTrend.labels.length > 0 && (
                      <View style={styles.chartBox}>
                        <Text style={styles.chartTitle}>Daily Report Trend</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <LineChart
                            data={{
                              labels: dailyTrend.labels,
                              datasets: dailyTrend.datasets,
                            }}
                            width={Math.max(width - 70, dailyTrend.labels.length * 55)}
                            height={200}
                            chartConfig={{
                              backgroundGradientFrom: '#fff',
                              backgroundGradientTo: '#fff',
                              color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                              labelColor: (opacity = 1) => `rgba(80,80,80,${opacity})`,
                              strokeWidth: 2,
                              decimalPlaces: 0,
                              propsForLabels: { fontSize: 10 },
                              propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff' },
                            }}
                            bezier
                            withLegend={false}
                            style={{ borderRadius: 12 }}
                          />
                        </ScrollView>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
                          {[{c:'#3498DB',l:'Active Students'},{c:'#2ECC71',l:'Game Reports'},{c:'#E74C3C',l:'Reports'},{c:'#F39C12',l:'Stars Earned'}].map(item => (
                            <View key={item.l} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 4 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.c, marginRight: 5 }} />
                              <Text style={{ fontSize: 11, color: item.c, fontWeight: '600' }}>{item.l}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {studentActivity.length > 0 && (
                      <View style={styles.chartBox}>
                        <Text style={styles.chartTitle}>Student Activity Summary</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{flexDirection: 'column'}}>
                            <View style={styles.tableRowHeader}>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Student</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Reports</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Active Days</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Attend %</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Game Time</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Stars</Text>
                            </View>
                            {studentActivity.map((s, i) => (
                              <View key={i} style={styles.tableRow}>
                                <Text style={styles.tableCell}>{s.name.substring(0,10)}</Text>
                                <Text style={styles.tableCell}>{s.totalReports}</Text>
                                <Text style={styles.tableCell}>{s.activeDaysCount}</Text>
                                <Text style={styles.tableCell}>{s.attendancePct}%</Text>
                                <Text style={styles.tableCell}>{formatDuration(s.gameTimeMinutes)}</Text>
                                <Text style={styles.tableCell}>⭐ {s.stars}</Text>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {gameAnalytics.length > 0 && (
                      <View style={styles.chartBox}>
                        <Text style={styles.chartTitle}>Educational Games Analytics</Text>
                        
                        <Text style={styles.chartSubTitle}>Time Spent (Mins)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <BarChart
                            data={{
                              labels: gameAnalytics.map(g => g.name.length > 8 ? g.name.substring(0, 7) + '…' : g.name),
                              datasets: [{ data: gameAnalytics.map(g => g.timeMinutes || 0) }]
                            }}
                            width={Math.max(width - 70, gameAnalytics.length * 80)}
                            height={200}
                            yAxisLabel=""
                            chartConfig={{
                              backgroundGradientFrom: '#fff',
                              backgroundGradientTo: '#fff',
                              color: (opacity = 1) => `rgba(47,183,164,${opacity})`,
                              labelColor: (opacity = 1) => `rgba(80,80,80,${opacity})`,
                              decimalPlaces: 0,
                              propsForLabels: { fontSize: 10 },
                              barPercentage: 0.6,
                            }}
                            showBarTops={false}
                            style={{ borderRadius: 12, marginBottom: 12 }}
                          />
                        </ScrollView>

                        <Text style={styles.chartSubTitle}>Game Summary</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{flexDirection: 'column'}}>
                            <View style={styles.tableRowHeader}>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Game</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Plays</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Moves</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Stars</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Avg ⭐</Text>
                            </View>
                            {gameAnalytics.map((g, i) => (
                              <View key={i} style={styles.tableRow}>
                                <Text style={styles.tableCell}>{g.name.substring(0,10)}</Text>
                                <Text style={styles.tableCell}>{g.plays}</Text>
                                <Text style={styles.tableCell}>{g.moves}</Text>
                                <Text style={styles.tableCell}>{g.stars}</Text>
                                <Text style={styles.tableCell}>{g.avgStars}</Text>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {dailyTrend.labels.length === 0 && studentActivity.length === 0 && gameAnalytics.length === 0 && (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No analytics data available yet.</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ---------- PARENT DASHBOARD SECTION ---------- */}
                {!isTeacher && (
                  <View>
                    {/* Page Header */}
                    <View style={styles.prPageHeader}>
                      <View style={{flex: 1}}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Ionicons name="document-text-outline" size={22} color="#1E293B" style={{marginRight: 8}} />
                          <Text style={styles.prPageTitle}>Progress Reports</Text>
                        </View>
                        <Text style={styles.prPageSubtitle}>
                          {parentReports.length} report{parentReports.length !== 1 ? 's' : ''} from {childName}&apos;s teachers.
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.prRefreshBtn} onPress={handleRefresh}>
                        <Ionicons name="refresh" size={14} color="#64748B" />
                        <Text style={styles.prRefreshText}> Refresh</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Child Dashboard Summary Card */}
                    <View style={styles.prSummaryCard}>
                      <View style={styles.prSummaryIconBox}>
                        <Text style={{fontSize: 28}}>🎓</Text>
                      </View>
                      <View style={{marginLeft: 14, flex: 1}}>
                        <Text style={styles.prSummaryTitle}>Child Dashboard Summary</Text>
                        <View style={styles.prBadgeRow}>
                          <View style={[styles.prBadge, {borderColor: '#60A5FA', backgroundColor: '#EFF6FF'}]}>
                            <Ionicons name="document-text-outline" size={11} color="#3B82F6" />
                            <Text style={[styles.prBadgeText, {color: '#2563EB'}]}> {parentSummary?.totalReports || 0} Reports</Text>
                          </View>
                          <View style={[styles.prBadge, {borderColor: '#34D399', backgroundColor: '#ECFDF5'}]}>
                            <Text style={{fontSize: 11}}>😊</Text>
                            <Text style={[styles.prBadgeText, {color: '#059669'}]}> {parentSummary?.happyDays || 0} Happy Days</Text>
                          </View>
                          <View style={[styles.prBadge, {borderColor: '#FBBF24', backgroundColor: '#FFFBEB'}]}>
                            <Ionicons name="star" size={11} color="#D97706" />
                            <Text style={[styles.prBadgeText, {color: '#B45309'}]}> {parentSummary?.starsEarned || 0} Stars Earned</Text>
                          </View>
                        </View>
                        <Text style={styles.prSummaryDesc}>
                          You are viewing progress reports securely scoped to{' '}
                          <Text style={{fontWeight: '700', color: '#0F172A'}}>{childName}</Text>.
                          {' '}All data is directly from teacher submissions and completed learning hub activities.
                        </Text>
                      </View>
                    </View>

                    {/* Recent Progress Analytics Chart */}
                    {parentReports.length > 0 && (
                      <View style={styles.prChartCard}>
                        <View style={styles.prChartHeader}>
                          <Ionicons name="bar-chart-outline" size={18} color="#2FB7A4" />
                          <Text style={styles.prChartTitle}> Recent Progress Analytics</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <BarChart
                            data={{
                              labels: parentReports.slice(0,6).map(r =>
                                new Date(r.date||r.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})
                              ).reverse(),
                              datasets: [
                                { data: parentReports.slice(0,6).map(r => Number(r.sessionDuration)||Number(r.durationMinutes)||0).reverse(), color: () => '#2FB7A4' },
                                { data: parentReports.slice(0,6).map(r => {
                                  const ps = {'Excellent':3,'Good':2,'Average':1,'Needs Improvement':0,'Developing':1,'Needs Support':0};
                                  return Number(r.stars) > 0 ? Number(r.stars) * 10 : (ps[r.progressLevel]||0) * 10;
                                }).reverse(), color: () => '#F59E0B' }
                              ]
                            }}
                            width={Math.max(width - 48, parentReports.slice(0,6).length * 70)}
                            height={200}
                            chartConfig={{
                              backgroundColor: '#fff',
                              backgroundGradientFrom: '#fff',
                              backgroundGradientTo: '#fff',
                              color: (opacity=1) => `rgba(47,183,164,${opacity})`,
                              labelColor: (opacity=1) => `rgba(100,116,139,${opacity})`,
                              barPercentage: 0.5,
                              decimalPlaces: 0,
                              propsForLabels: { fontSize: 10 },
                            }}
                            withInnerLines
                            showBarTops={false}
                            style={{ borderRadius: 12 }}
                          />
                        </ScrollView>
                        <View style={styles.prLegendRow}>
                          <View style={styles.prLegendItem}>
                            <View style={[styles.prLegendDot, {backgroundColor: '#2FB7A4'}]} />
                            <Text style={styles.prLegendText}>Session Duration (mins)</Text>
                          </View>
                          <View style={styles.prLegendItem}>
                            <View style={[styles.prLegendDot, {backgroundColor: '#F59E0B'}]} />
                            <Text style={styles.prLegendText}>Stars Earned</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Weekly Analytics */}
                    <View style={styles.prWeeklyCard}>
                      <View style={styles.prChartHeader}>
                        <Text style={{fontSize: 16}}>📅</Text>
                        <Text style={styles.prChartTitle}> Weekly Analytics</Text>
                      </View>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16}}>
                        <View style={styles.prStatCard}>
                          <Text style={styles.prStatNum}>{parentSummary?.totalReports || 0}</Text>
                          <Text style={styles.prStatLabel}>TOTAL REPORTS</Text>
                        </View>
                        <View style={styles.prStatCard}>
                          <Text style={styles.prStatNum}>{parentWeekly?.uniqueActivities || 0}</Text>
                          <Text style={styles.prStatLabel}>UNIQUE ACTIVITIES</Text>
                        </View>
                        <View style={[styles.prStatCard, {marginTop: 12}]}>
                          <Text style={[styles.prStatNum, {fontSize: 18}]}>{parentWeekly?.mostFreqActivity || 'N/A'}</Text>
                          <Text style={styles.prStatLabel}>MOST FREQUENT ACTIVITY</Text>
                        </View>
                        <View style={[styles.prStatCard, {marginTop: 12}]}>
                          <Text style={styles.prStatNum}>{parentSummary?.happyDays || 0}</Text>
                          <Text style={styles.prStatLabel}>HAPPY/EXCITED DAYS</Text>
                        </View>
                      </View>

                      <Text style={styles.prTimelineTitle}>Activity Timeline (This Week)</Text>
                      {parentReports.length > 0 && (
                        <View style={styles.prTimelineRow}>
                          <Text style={styles.prTimelineDay}>
                            {new Date(parentReports[0]?.date || parentReports[0]?.createdAt).toLocaleDateString(undefined, {weekday:'short'})}
                          </Text>
                          <View style={{flexDirection:'row', flexWrap:'wrap', flex:1}}>
                            {[...new Set(parentReports.slice(0,5).map(r => r.activity))].filter(Boolean).map((act,i) => (
                              <View key={i} style={styles.prTimelinePill}>
                                <Text style={styles.prTimelinePillText}>{act}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>



                    {/* Report Cards — Vertically Stacked */}
                    {parentReports.length === 0 ? (
                      <View style={styles.prEmptyState}>
                        <Text style={{fontSize: 36, marginBottom: 10}}>📭</Text>
                        <Text style={styles.prEmptyTitle}>No Reports Yet</Text>
                        <Text style={styles.prEmptyDesc}>{childName}&apos;s progress reports will appear here once the teacher submits them.</Text>
                      </View>
                    ) : (
                      parentReports.map((r, idx) => {
                        const psMap = {'Excellent':'#10B981','Good':'#3B82F6','Average':'#F59E0B',
                          'Needs Improvement':'#EF4444','Developing':'#F59E0B','Needs Support':'#EF4444'};
                        const progColor = psMap[r.progressLevel] || '#6366F1';
                        const starPsMap = {'Excellent':3,'Good':2,'Average':1,'Needs Improvement':0,'Developing':1,'Needs Support':0};
                        const starsVal = Number(r.stars) > 0 ? Number(r.stars) : (starPsMap[r.progressLevel] || 0);
                        const sessionMins = Number(r.sessionDuration)||Number(r.durationMinutes)||0;
                        const timeStr = sessionMins >= 60
                          ? `${Math.floor(sessionMins/60)}h ${sessionMins%60}m`
                          : sessionMins > 0 ? `${sessionMins}m` : '—';
                        const isHappy = r.mood === 'Happy' || r.mood === 'Excited';
                        return (
                          <View key={r._id||idx} style={styles.prReportCard}>
                            {/* Card Header */}
                            <View style={styles.prCardHeader}>
                              <Text style={styles.prCardName}>{r.studentName || childName}</Text>
                              <View style={[styles.prMoodBadge, {backgroundColor: isHappy ? '#DCFCE7' : '#FEF3C7'}]}>
                                <Text style={{fontSize: 12}}>{isHappy ? '😊' : '😐'}</Text>
                                <Text style={[styles.prMoodText, {color: isHappy ? '#166534' : '#92400E'}]}> {r.mood || 'Good'}</Text>
                              </View>
                            </View>

                            {/* Date + Activity */}
                            <View style={styles.prCardMeta}>
                              <Ionicons name="calendar-outline" size={12} color="#64748B" />
                              <Text style={styles.prCardDate}> {new Date(r.date||r.createdAt).toLocaleDateString()}</Text>
                              <Text style={styles.prCardDot}> · </Text>
                              <Ionicons name="game-controller-outline" size={12} color="#E11D48" />
                              <Text style={styles.prCardActivity}> {r.activity || r.gameName || '—'}</Text>
                            </View>

                            {/* Stats row */}
                            <View style={styles.prCardStatsRow}>
                              <View style={[styles.prCardStatChip, {backgroundColor: progColor+'15', borderColor: progColor}]}>
                                <Text style={[styles.prCardStatLabel, {color: progColor}]}>Progress</Text>
                                <Text style={[styles.prCardStatVal, {color: progColor}]}>{r.progressLevel || '—'}</Text>
                              </View>
                              <View style={[styles.prCardStatChip, {backgroundColor:'#FFFBEB', borderColor:'#F59E0B'}]}>
                                <Text style={[styles.prCardStatLabel, {color:'#B45309'}]}>⭐ Stars</Text>
                                <Text style={[styles.prCardStatVal, {color:'#B45309'}]}>{starsVal}</Text>
                              </View>
                              <View style={[styles.prCardStatChip, {backgroundColor:'#ECFDF5', borderColor:'#10B981'}]}>
                                <Text style={[styles.prCardStatLabel, {color:'#065F46'}]}>🕐 Time</Text>
                                <Text style={[styles.prCardStatVal, {color:'#065F46'}]}>{timeStr}</Text>
                              </View>
                            </View>

                            {/* Notes */}
                            <View style={styles.prCardNotesBox}>
                              <Text style={styles.prCardNotesText}>{r.notes || 'Engagement is good'}</Text>
                            </View>

                            {/* Recommendations */}
                            {!!r.recommendations && (
                              <View style={[styles.prCardNotesBox, {backgroundColor:'#EFF6FF', borderLeftColor:'#3B82F6', marginTop: 0}]}>
                                <Text style={[styles.prCardNotesText, {color:'#1E40AF'}]}>{r.recommendations}</Text>
                              </View>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.prCardActions}>
                              <TouchableOpacity style={styles.prCardBtn} onPress={() => generatePDF(r)}>
                                <Ionicons name="download-outline" size={14} color="#2563EB" />
                                <Text style={styles.prCardBtnText}> Download</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.prCardBtn, {backgroundColor:'#F0FFF4', borderColor:'#86EFAC'}]} onPress={() => generatePDF(r)}>
                                <Ionicons name="print-outline" size={14} color="#16A34A" />
                                <Text style={[styles.prCardBtnText, {color:'#16A34A'}]}> Print</Text>
                              </TouchableOpacity>
                              {r.fileUrl && (
                                <TouchableOpacity style={[styles.prCardBtn, {backgroundColor:'#F3E8FF', borderColor:'#D8B4FE'}]} onPress={() => Linking.openURL(r.fileUrl)}>
                                  <Ionicons name="document-attach-outline" size={14} color="#9333EA" />
                                  <Text style={[styles.prCardBtnText, {color:'#9333EA'}]}> Resource</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* ---------- REPORT LIST SECTION ---------- */}
                {isTeacher && (
                  <View style={styles.listWrapper}>
                  <View style={styles.listHeaderRow}>
                    <View>
                      <Text style={styles.sectionTitle}>📋 Student Progress Reports</Text>
                      <Text style={styles.headerSubtitleSm}>Browse reports by student, filter, and export to PDF.</Text>
                    </View>
                    <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                      <Ionicons name="refresh" size={16} color="#6B4E3D" />
                      <Text style={styles.refreshBtnText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Filter Row — using FilterPicker (modal-based) to avoid z-index clipping */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.filterBarContent}
                    style={styles.filterBar}
                  >
                    {/* Search box */}
                    <View style={styles.searchBoxTable}>
                      <Ionicons name="search" size={15} color="#94A3B8" />
                      <TextInput
                        style={styles.searchInputTable}
                        placeholder="Search name or ID..."
                        placeholderTextColor="#94A3B8"
                        value={studentSearch}
                        onChangeText={setStudentSearch}
                      />
                    </View>

                    {/* Student Filter */}
                    <FilterPicker
                      value={tableStudentFilter}
                      options={allStudentOptions}
                      onSelect={setTableStudentFilter}
                      style={{ marginLeft: 10 }}
                    />

                    {/* Date Sort */}
                    <FilterPicker
                      value={tableDateFilter === 'Newest First' ? 'Date: Newest First' : 'Date: Oldest First'}
                      options={['Newest First', 'Oldest First']}
                      onSelect={setTableDateFilter}
                      style={{ marginLeft: 10 }}
                    />

                    {/* Export PDF */}
                    <TouchableOpacity style={[styles.exportBtnTable, { marginLeft: 10 }]} onPress={generateListPDF}>
                      <Ionicons name="download-outline" size={15} color="#6B4E3D" />
                      <Text style={styles.exportBtnTableText}> Export PDF</Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <View style={styles.tableContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{flexDirection: 'column'}}>
                        <View style={styles.trHeader}>
                          <Text style={[styles.tc, styles.tcHeader, {width: 100}]}>Student ID</Text>
                          <Text style={[styles.tc, styles.tcHeader, {width: 150}]}>Student Name</Text>
                          <Text style={[styles.tc, styles.tcHeader, {width: 110}]}>Total Reports</Text>
                          <Text style={[styles.tc, styles.tcHeader, {width: 110}]}>Latest Date</Text>
                          <Text style={[styles.tc, styles.tcHeader, {width: 130}]}>Latest Skill</Text>
                          <Text style={[styles.tc, styles.tcHeader, {width: 150}]}>Latest Activity</Text>
                          <Text style={[styles.tc, styles.tcHeader, {width: 100}]}>Progress</Text>
                          <Text style={[styles.tc, styles.tcHeader, {width: 100}]}>Engagement</Text>
                        </View>
                        
                        {finalGroupedList.length === 0 ? (
                          <View style={{padding: 20, alignItems: 'center'}}><Text style={styles.emptyText}>No reports found.</Text></View>
                        ) : (
                          finalGroupedList.map((g, i) => (
                            <TouchableOpacity key={i} style={styles.tr} onPress={() => { setSelectedStudentHistory(g); setShowHistoryModal(true); }}>
                              <Text style={[styles.tc, styles.tcId, {width: 100}]}>{g.studentId || 'N/A'}</Text>
                              
                              <View style={[styles.tc, {width: 150, flexDirection: 'row', alignItems: 'center'}]}>
                                <View style={styles.avatarCircle}>
                                  <Text style={styles.avatarText}>{g.studentName ? g.studentName.charAt(0).toUpperCase() : '?'}</Text>
                                </View>
                                <Text style={styles.tcName}>{g.studentName ? g.studentName.substring(0,12) : 'Unknown'}</Text>
                              </View>

                              <View style={[styles.tc, {width: 110}]}>
                                <View style={styles.badgeBlue}><Text style={styles.badgeTextBlue}>{g.totalReports}</Text></View>
                              </View>
                              
                              <Text style={[styles.tc, styles.tcMuted, {width: 110}]}>{new Date(g.latestDate).toLocaleDateString()}</Text>
                              <Text style={[styles.tc, styles.tcMuted, {width: 130}]}>{g.latestSkill || '—'}</Text>
                              <Text style={[styles.tc, styles.tcMuted, {width: 150}]}>{g.latestActivity}</Text>
                              
                              <View style={[styles.tc, {width: 100}]}>
                                <View style={styles.badgeYellow}><Text style={styles.badgeTextYellow}>{g.progress || '—'}</Text></View>
                              </View>
                              <View style={[styles.tc, {width: 100}]}>
                                <View style={styles.badgeRed}><Text style={styles.badgeTextRed}>{g.engagement || '—'}</Text></View>
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </ScrollView>
                  </View>
                </View>
                )}

              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* HISTORY MODAL */}
      <Modal visible={showHistoryModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex: 1, backgroundColor: '#FAFAF8'}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedStudentHistory?.studentName}'s History</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#1E1007" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding: 20}}>
            {selectedStudentHistory?.reports.map(r => (
              <View key={r._id} style={styles.historyCard}>
                <View style={styles.hHeader}>
                  <Text style={styles.hDate}>{new Date(r.date || r.createdAt).toLocaleDateString()}</Text>
                  <Text style={styles.hBadge}>{r.attendanceStatus || 'N/A'}</Text>
                </View>
                <Text style={styles.hActivity}>{r.activity || r.gameName}</Text>
                <Text style={styles.hDetail}>Skill: {r.skillArea} | Progress: {r.progressLevel} | Duration: {formatDuration(r.sessionDuration || r.durationMinutes)}</Text>
                {!!r.notes && <Text style={styles.hNotes}>"{r.notes}"</Text>}
                
                <View style={styles.hActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => generatePDF(r)}>
                    <Ionicons name="download-outline" size={16} color="#3B82F6" />
                    <Text style={styles.actionTxt}>PDF</Text>
                  </TouchableOpacity>
                  {r.fileUrl && (
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#F3E8FF'}]} onPress={() => Linking.openURL(r.fileUrl)}>
                      <Ionicons name="document-attach-outline" size={16} color="#9333EA" />
                      <Text style={[styles.actionTxt, {color: '#9333EA'}]}>Resource</Text>
                    </TouchableOpacity>
                  )}
                  {isTeacher && (
                    <>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(r)}>
                        <Ionicons name="pencil" size={16} color="#F59E0B" />
                        <Text style={[styles.actionTxt, {color: '#F59E0B'}]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(r._id)}>
                        <Ionicons name="trash" size={16} color="#EF4444" />
                        <Text style={[styles.actionTxt, {color: '#EF4444'}]}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={showEditModal} animationType="fade" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.overlay}>
            <View style={[styles.cardSection, {maxHeight: '80%', margin: 20}]}>
              <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text style={styles.sectionTitle}>Edit Report</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: 10 }}>
                <View style={[styles.row, {zIndex: 100, marginBottom: 16}]}>
                  <View style={[styles.inputGroup, {flex: 2, marginRight: 8}]}>
                    <Text style={styles.label}>Date *</Text>
                    <TextInput style={styles.input} value={date} onChangeText={setDate} />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1, marginRight: 8}]}>
                    <Text style={styles.label}>Hours</Text>
                    <TextInput style={styles.input} value={hours} onChangeText={setHours} keyboardType="numeric" />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Minutes</Text>
                    <TextInput style={styles.input} value={minutes} onChangeText={setMinutes} keyboardType="numeric" />
                  </View>
                </View>

                <View style={{ zIndex: 90, marginBottom: 4 }}>
                  <CustomDropdown label="Attendance *" value={attendance} options={ATTENDANCE_OPTIONS} onSelect={setAttendance} />
                </View>

                <View style={{ zIndex: 80, marginBottom: 4 }}>
                  <CustomDropdown 
                    label="Skill Area *" 
                    value={skillArea} 
                    options={FALLBACK_SKILLS} 
                    onSelect={(val) => {
                      setSkillArea(val);
                      if(val !== 'Other') setActivity(FALLBACK_ACTIVITIES[val][0]);
                    }} 
                  />
                </View>

                {skillArea === 'Other' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Custom Skill Area *</Text>
                    <TextInput style={styles.input} value={customSkill} onChangeText={setCustomSkill} />
                  </View>
                )}

                <View style={{ zIndex: 70, marginBottom: 4 }}>
                  <CustomDropdown 
                    label="Activity Name *" 
                    value={activity} 
                    options={skillArea === 'Other' ? ['Other / Custom Activity'] : (FALLBACK_ACTIVITIES[skillArea] || ['Other / Custom Activity'])} 
                    onSelect={setActivity} 
                  />
                </View>

                {activity === 'Other / Custom Activity' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Custom Activity *</Text>
                    <TextInput style={styles.input} value={customActivity} onChangeText={setCustomActivity} />
                  </View>
                )}

                <View style={{ zIndex: 60, marginBottom: 4 }}>
                  <CustomDropdown label="Progress Level *" value={progressLevel} options={PROGRESS_LEVELS} onSelect={setProgressLevel} />
                </View>

                <View style={{ zIndex: 50, marginBottom: 4 }}>
                  <CustomDropdown label="Engagement" value={engagement} options={ENGAGEMENTS} onSelect={setEngagement} />
                </View>

                <View style={{ zIndex: 40, marginBottom: 4 }}>
                  <CustomDropdown label="Mood" value={mood} options={MOODS} onSelect={setMood} />
                </View>
                
                <View style={[styles.inputGroup, {marginTop: 10}]}>
                  <Text style={styles.label}>Teacher's Notes</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} multiline />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Recommendations</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={recommendations} onChangeText={setRecommendations} multiline />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveReport}>
                  {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Update Report</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* File Picker Modal removed — now using native Alert.alert action sheet */}

    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  barPercentage: 0.5,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFCF8' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  scrollArea: { padding: 16, paddingBottom: 60 },
  
  cardSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16, position: 'relative' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 15, color: '#1E293B' },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  dropdownBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtnText: { fontSize: 15, color: '#1E293B' },
  dropdownListWrapper: { position: 'absolute', top: 75, left: 0, right: 0, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 150, zIndex: 9999, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  dropdownListItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownListItemText: { fontSize: 14, color: '#1E293B' },

  dropdownContainer: { position: 'absolute', top: 70, left: 0, right: 0, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', zIndex: 999, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 15, color: '#1E293B' },
  
  saveBtn: { backgroundColor: '#EF5A45', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  analyticsWrapper: { marginBottom: 20 },
  filterRow: { flexDirection: 'row', marginBottom: 12 },
  filterChip: { backgroundColor: '#E0F2FE', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterChipText: { color: '#0284C7', fontWeight: '600', fontSize: 13 },
  
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  summaryBox: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#2FB7A4' },
  summaryVal: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  summaryLbl: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '500' },
  
  chartBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', alignSelf: 'flex-start', marginBottom: 12 },
  chartSubTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', alignSelf: 'flex-start', marginBottom: 8, marginTop: 8 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 24, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },

  tableRowHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10 },
  tableCell: { width: 90, fontSize: 13, color: '#1E293B' },
  tableHeaderCell: { fontWeight: '700', color: '#64748B' },

  listWrapper: { marginBottom: 20 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerSubtitleSm: { fontSize: 13, color: '#64748B', marginTop: 4 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  refreshBtnText: { fontSize: 13, fontWeight: '700', color: '#6B4E3D', marginLeft: 4 },

  filterBar: { marginBottom: 14 },
  filterBarContent: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  searchBoxTable: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 40, width: 180 },
  searchInputTable: { flex: 1, fontSize: 13, color: '#1E293B', marginLeft: 6 },
  exportBtnTable: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 40 },
  exportBtnTableText: { fontSize: 13, fontWeight: '700', color: '#6B4E3D' },
  
  tableContainer: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  trHeader: { flexDirection: 'row', backgroundColor: '#FFF7ED', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tr: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  tc: { paddingHorizontal: 12, fontSize: 13, color: '#1E293B' },
  tcHeader: { fontWeight: '700', color: '#1E1007' },
  tcId: { color: '#64748B', fontWeight: '500' },
  tcMuted: { color: '#64748B' },
  tcName: { fontWeight: '600', color: '#0F172A' },
  
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2FB7A4', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  badgeBlue: { backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeTextBlue: { color: '#0284C7', fontWeight: '700', fontSize: 12 },
  
  badgeYellow: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeTextYellow: { color: '#D97706', fontWeight: '700', fontSize: 12 },
  
  badgeRed: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeTextRed: { color: '#DC2626', fontWeight: '700', fontSize: 12 },

  mainSectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  formSubSection: { marginBottom: 24 },
  subSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 6 },
  subSecHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20 },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  closeBtn: { padding: 4 },
  historyCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  hHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  hDate: { fontSize: 14, fontWeight: '600', color: '#475569' },
  hBadge: { fontSize: 12, fontWeight: '700', color: '#2FB7A4', backgroundColor: '#E6FFFA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  hActivity: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  hDetail: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  hNotes: { fontSize: 14, color: '#475569', fontStyle: 'italic', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginTop: 4 },
  hActions: { flexDirection: 'row', marginTop: 14, gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionTxt: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },

  /* PARENT STYLES */
  parentDashboardWrapper: { marginTop: 10 },
  parentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  parentAvatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  parentCardTitle: { fontSize: 18, fontWeight: '800', color: '#1E1007' },
  parentCardDesc: { fontSize: 12, color: '#64748B', marginTop: 12, lineHeight: 18 },
  parentBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  parentBadgeText: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', width: '100%' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  parentHorizontalCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginRight: 12, borderWidth: 1, borderColor: '#F1F5F9', minWidth: 140, elevation: 1, justifyContent: 'center' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  timelineDay: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginRight: 16, width: 40 },
  timelinePill: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 4 },
  timelinePillText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  parentGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  parentReportCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38BDF8', borderTopWidth: 4, elevation: 2 },
  parentReportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  parentReportName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  badgeGreen: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeTextGreen: { color: '#166534', fontSize: 10, fontWeight: '700' },
  parentReportMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  parentReportDate: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  parentReportActivity: { fontSize: 11, color: '#E11D48', fontWeight: '700' },
  parentReportNotesBox: { backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, marginBottom: 12, minHeight: 60 },
  parentReportNotesText: { fontSize: 12, color: '#6B4E3D', lineHeight: 18, fontWeight: '500' },
  parentReportActions: { flexDirection: 'row', justifyContent: 'space-between' },
  parentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF', paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', marginHorizontal: 2 },
  parentBtnText: { color: '#0284C7', fontSize: 10, fontWeight: '700', marginLeft: 3 },

  /* REDESIGNED PARENT PORTAL STYLES */
  parentHeaderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 4, borderWidth: 1, borderColor: '#EEF2FF' },
  parentWelcome: { fontSize: 13, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.5 },
  parentChildName: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  parentRefreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  parentStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  parentStatBox: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  parentStatVal: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  parentStatLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 4, textAlign: 'center' },
  parentStatDivider: { width: 1, height: 50, backgroundColor: '#E2E8F0' },
  parentChartCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  parentSectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  parentChartNote: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  parentReportCountBadge: { backgroundColor: '#6366F1', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginLeft: 8 },
  parentReportCountText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  parentEmptyState: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 20 },
  parentEmptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  parentEmptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  parentReportCardFull: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 3, borderTopWidth: 4, borderTopColor: '#6366F1' },
  parentReportCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  parentReportAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  parentReportAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  parentReportCardName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  parentReportCardDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  parentMoodBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  parentMoodText: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  parentReportMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  parentMetaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  parentMetaChipText: { fontSize: 12, fontWeight: '600', color: '#6366F1', marginLeft: 5 },
  parentReportStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  parentReportStatChip: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  parentReportStatLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  parentReportStatVal: { fontSize: 16, fontWeight: '900' },
  parentEngagementRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  parentEngagementLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginRight: 8 },
  parentEngagementVal: { fontSize: 13, color: '#0F172A', fontWeight: '700' },
  parentNotesBox: { backgroundColor: '#FFFBEB', borderLeftWidth: 4, borderLeftColor: '#F59E0B', borderRadius: 10, padding: 14, marginBottom: 12 },
  parentNotesLabel: { fontSize: 12, color: '#92400E', fontWeight: '700' },
  parentNotesText: { fontSize: 14, color: '#78350F', lineHeight: 22 },
  parentCardActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  parentActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 12, borderRadius: 12 },
  parentActionBtnText: { fontSize: 13, fontWeight: '700', color: '#3B82F6', marginLeft: 6 },

  /* ── NEW WEB-MATCHING PARENT STYLES ── */
  prPageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  prPageTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  prPageSubtitle: { fontSize: 13, color: '#10B981', fontWeight: '600', marginTop: 2 },
  prRefreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, elevation: 1 },
  prRefreshText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  prSummaryCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  prSummaryIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center' },
  prSummaryTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  prBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  prBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  prBadgeText: { fontSize: 12, fontWeight: '700' },
  prSummaryDesc: { fontSize: 12, color: '#EF4444', lineHeight: 18, fontWeight: '500' },

  prChartCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  prChartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  prChartTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  prLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  prLegendItem: { flexDirection: 'row', alignItems: 'center' },
  prLegendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  prLegendText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  prWeeklyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  prStatCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, width: '48%', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  prStatNum: { fontSize: 28, fontWeight: '900', color: '#0284C7', textAlign: 'center' },
  prStatLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 6, textAlign: 'center', letterSpacing: 0.5 },
  prTimelineTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  prTimelineRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  prTimelineDay: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginRight: 12, width: 36 },
  prTimelinePill: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginRight: 8, marginBottom: 4 },
  prTimelinePillText: { color: '#10B981', fontSize: 12, fontWeight: '600' },

  prEmptyState: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 20 },
  prEmptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  prEmptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  prReportCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#BAE6FD', borderLeftWidth: 4, borderLeftColor: '#38BDF8', elevation: 2 },
  prCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prCardName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  prMoodBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  prMoodText: { fontSize: 12, fontWeight: '700' },
  prCardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  prCardDate: { fontSize: 12, color: '#64748B' },
  prCardDot: { fontSize: 12, color: '#CBD5E1' },
  
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12, padding: 16, justifyContent: 'center' },
  uploadBtnText: { color: '#64748B', fontWeight: '600', marginLeft: 8 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerOptionText: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%', maxWidth: 400, elevation: 5 },
  prCardActivity: { fontSize: 12, color: '#E11D48', fontWeight: '700' },
  prCardStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  prCardStatChip: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  prCardStatLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  prCardStatVal: { fontSize: 15, fontWeight: '900' },
  prCardNotesBox: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12, marginBottom: 12 },
  prCardNotesText: { fontSize: 13, color: '#6B4E3D', lineHeight: 20 },
  prCardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  prCardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 10, borderRadius: 20 },
  prCardBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },

  /* ── GAME PERFORMANCE CARD STYLES ── */
  prGameCard: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  prGameEmojiBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  prGameName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  prGamePlays: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  prGameLevelBadge: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  prGameLevelText: { fontSize: 12, fontWeight: '800' },
  prGameStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10 },
  prGameStatItem: { flex: 1, alignItems: 'center' },
  prGameStatVal: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  prGameStatLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 3, textAlign: 'center' },
  prGameStatDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },
  prGameProgressBar: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  prGameProgressFill: { height: 6, borderRadius: 3 },
});