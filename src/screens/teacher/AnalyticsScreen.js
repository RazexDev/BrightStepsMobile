import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  ActivityIndicator, TouchableOpacity, Dimensions, TextInput, Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getProgressReports, getGameTelemetryByChild } from '../../api/progressApi';
import { 
  getDateRange, filterReportsByDateAndStudent, 
  calculateSummaryCards, calculateDailyTrend, 
  calculateStudentActivityAnalytics, calculateGameAnalytics, 
  calculatePerformanceDistribution, formatDuration
} from '../../utils/progressAnalytics';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  barPercentage: 0.5,
  decimalPlaces: 0,
};

export default function AnalyticsScreen() {
  const { user } = React.useContext(AuthContext);
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const childName = user?.studentName || user?.name || 'Student';

  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [reportType, setReportType] = useState('Weekly'); // 'Weekly', 'Monthly', 'All'
  const [studentSearch, setStudentSearch] = useState('');

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalSearchText, setModalSearchText] = useState('');

  const uniqueStudents = useMemo(() => {
    const students = new Set(allReports.map(r => r.studentName).filter(Boolean));
    return Array.from(students).sort();
  }, [allReports]);

  const [gameTelemetry, setGameTelemetry] = useState([]);

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
      const totalTimeSec = records.reduce((s, g) => s + (Number(g.completionTime) || 0), 0);
      const totalTimeMins = Math.round(totalTimeSec / 60);
      const maxLevel = plays > 0 ? Math.max(...records.map(g => g.levelPlayed || 1)) : 0;
      return { ...def, plays, totalStars, avgStars, totalTimeMins, maxLevel };
    });
  }, [gameTelemetry, isTeacher]);

  const fetchReports = useCallback(async () => {
    try {
      setError(null);
      const data = await getProgressReports();
      setAllReports(data || []);
      
      if (!isTeacher && (user?._id || user?.id)) {
        try {
          const childId = user._id || user.id;
          const gameData = await getGameTelemetryByChild(childId);
          setGameTelemetry(Array.isArray(gameData) ? gameData.filter(g => g.gameName) : []);
        } catch (e) {
          console.log('Game telemetry not available:', e.message);
        }
      }
    } catch (err) {
      console.error('Error fetching reports for Analytics:', err);
      setError('Failed to load analytics data.');
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

  // Derived Analytics Data
  const { startDate, endDate } = getDateRange(reportType === 'All' ? 'Monthly' : reportType); 

  const filteredReports = useMemo(() => {
    const sDate = reportType === 'All' ? null : startDate;
    const eDate = reportType === 'All' ? null : endDate;
    let reports = allReports;
    if (!isTeacher) {
      const userId = user?._id || user?.id;
      reports = reports.filter(r => 
        r.studentName === childName || 
        r.studentName?.includes(childName) ||
        (userId && (r.studentId === userId || r.childId === userId))
      );
      return filterReportsByDateAndStudent(reports, sDate, eDate, '');
    }
    return filterReportsByDateAndStudent(reports, sDate, eDate, studentSearch);
  }, [allReports, reportType, startDate, endDate, studentSearch, isTeacher, childName, user]);

  const summary = useMemo(() => calculateSummaryCards(filteredReports), [filteredReports]);
  const dailyTrend = useMemo(() => calculateDailyTrend(filteredReports), [filteredReports]);
  const studentActivity = useMemo(() => calculateStudentActivityAnalytics(filteredReports), [filteredReports]);
  const gameAnalytics = useMemo(() => calculateGameAnalytics(filteredReports), [filteredReports]);
  const perfDistribution = useMemo(() => calculatePerformanceDistribution(filteredReports), [filteredReports]);

  const generateAnalyticsPDF = async () => {
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1f2937; }
            h1 { color: #3b82f6; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
            .box { background: #f8fafc; padding: 20px; border-radius: 8px; width: 30%; border: 1px solid #e2e8f0; }
            .val { font-size: 24px; font-weight: bold; color: #0f172a; }
            .lbl { font-size: 14px; color: #64748b; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>Analytics Report (${reportType})</h1>
          
          <h2>Summary</h2>
          <div class="grid">
            <div class="box"><div class="val">${summary.activeStudents}</div><div class="lbl">Active Students</div></div>
            <div class="box"><div class="val">${summary.totalReports}</div><div class="lbl">Total Reports</div></div>
            <div class="box"><div class="val">${summary.uniqueActivities}</div><div class="lbl">Unique Activities</div></div>
            <div class="box"><div class="val">${formatDuration(summary.totalGameTimeMinutes)}</div><div class="lbl">Game Time</div></div>
            <div class="box"><div class="val">${summary.gamePlays}</div><div class="lbl">Game Plays</div></div>
            <div class="box"><div class="val">${summary.totalStars}</div><div class="lbl">Stars Earned</div></div>
          </div>

          <h2>Student Activity</h2>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Reports</th>
                <th>Active Days</th>
                <th>Attend %</th>
                <th>Game Time</th>
                <th>Stars</th>
              </tr>
            </thead>
            <tbody>
              ${studentActivity.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td>${s.totalReports}</td>
                  <td>${s.activeDaysCount}</td>
                  <td>${s.attendancePct}%</td>
                  <td>${formatDuration(s.gameTimeMinutes)}</td>
                  <td>⭐ ${s.stars}</td>
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
      Alert.alert('Error', 'Could not generate Analytics PDF.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchReports}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={[styles.header, {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}]}>
          <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>📊 {isTeacher ? 'Analytics Dashboard' : 'Analytics Dashboard'}</Text>
            <Text style={styles.headerSubtitle}>{isTeacher ? 'Real-time overview of student activity, resources, and game performance.' : `Insights into ${childName}'s report activity, games, and progress trends.`}</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={generateAnalyticsPDF}>
            <Ionicons name="document-text-outline" size={16} color="#6B4E3D" />
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>
        </View>

        {/* FILTERS */}
        <View style={styles.filterCard}>
          <View style={styles.filterCardHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="filter-outline" size={16} color="#1E293B" style={{marginRight: 6}} />
              <Text style={styles.filterCardTitle}>Filters</Text>
            </View>
            <TouchableOpacity style={styles.resetPill} onPress={() => { setReportType('Weekly'); setStudentSearch(''); }}>
              <Text style={styles.resetPillText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical: 4}}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>REPORT TYPE</Text>
              <TouchableOpacity style={styles.filterInputBox} onPress={() => {
                const types = ['Weekly', 'Monthly', 'All'];
                const nextType = types[(types.indexOf(reportType) + 1) % types.length];
                setReportType(nextType);
              }}>
                <Text style={styles.filterInputText}>{reportType}</Text>
                <Ionicons name="chevron-down" size={14} color="#64748B" />
              </TouchableOpacity>
            </View>

            {isTeacher && (
              <View style={styles.filterGroup}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                  <Ionicons name="search" size={12} color="#8B5CF6" style={{marginRight: 4}} />
                  <Text style={[styles.filterLabel, {marginBottom: 0}]}>STUDENT SEARCH</Text>
                </View>
                <TouchableOpacity 
                  style={styles.filterInputBox}
                  onPress={() => {
                    setModalSearchText('');
                    setShowStudentModal(true);
                  }}
                >
                  <Text style={[styles.filterInputText, {flex: 1}]} numberOfLines={1}>
                    {studentSearch || 'All Students'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>START DATE</Text>
              <View style={styles.filterInputBoxDate}>
                <Text style={styles.filterInputText}>{startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</Text>
                <Ionicons name="calendar-outline" size={14} color="#64748B" />
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>END DATE</Text>
              <View style={styles.filterInputBoxDate}>
                <Text style={styles.filterInputText}>{endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}</Text>
                <Ionicons name="calendar-outline" size={14} color="#64748B" />
              </View>
            </View>
          </ScrollView>
        </View>

        {filteredReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="stats-chart" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No analytics data available for this filter.</Text>
          </View>
        ) : (
          <>
            {/* SUMMARY CARDS */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.activeStudents}</Text><Text style={styles.summaryLbl}>Active Students</Text></View>
              <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.totalReports}</Text><Text style={styles.summaryLbl}>Total Reports</Text></View>
              <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.uniqueActivities}</Text><Text style={styles.summaryLbl}>Unique Activities</Text></View>
              <View style={styles.summaryBox}><Text style={styles.summaryVal}>{formatDuration(summary.totalGameTimeMinutes)}</Text><Text style={styles.summaryLbl}>Game Time</Text></View>
              <View style={styles.summaryBox}><Text style={styles.summaryVal}>{summary.gamePlays}</Text><Text style={styles.summaryLbl}>Game Plays</Text></View>
              <View style={styles.summaryBox}><Text style={styles.summaryVal}>⭐ {summary.totalStars}</Text><Text style={styles.summaryLbl}>Stars Earned</Text></View>
            </View>

            {/* GAME PERFORMANCE SECTION (PARENT ONLY) */}
            {!isTeacher && (
              <View style={[styles.chartBox, { padding: 0, backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                  <Text style={{fontSize: 16}}>🎮</Text>
                  <Text style={[styles.chartTitle, {marginLeft: 6}]}>Game Performance</Text>
                  {gameTelemetry.length > 0 && (
                    <View style={{marginLeft:'auto', backgroundColor:'#6366F1', paddingHorizontal:10, paddingVertical:3, borderRadius:12}}>
                      <Text style={{color:'#FFF', fontSize:11, fontWeight:'700'}}>{gameTelemetry.length} sessions</Text>
                    </View>
                  )}
                </View>

                {GAME_DEFS.map(def => {
                  const stat = gameStats.find(g => g.name === def.name) || { plays:0, totalStars:0, avgStars:'0', totalTimeMins:0, maxLevel:0 };
                  const starStr = '⭐'.repeat(Math.round(Number(stat.avgStars)));
                  const timeStr = stat.totalTimeMins >= 60
                    ? `${Math.floor(stat.totalTimeMins/60)}h ${stat.totalTimeMins%60}m`
                    : stat.totalTimeMins > 0 ? `${stat.totalTimeMins}m` : '0m';
                  return (
                    <View key={def.name} style={[styles.prGameCard, {borderLeftColor: def.color}]}>
                      <View style={{flexDirection:'row', alignItems:'center', marginBottom: 10}}>
                        <View style={[styles.prGameEmojiBadge, {backgroundColor: def.bg}]}>
                          <Text style={{fontSize: 20}}>{def.emoji}</Text>
                        </View>
                        <View style={{marginLeft:10, flex:1}}>
                          <Text style={styles.prGameName}>{def.name}</Text>
                          <Text style={[styles.prGamePlays, {color: def.color}]}>{stat.plays} session{stat.plays !== 1 ? 's' : ''} played</Text>
                        </View>
                        <View style={[styles.prGameLevelBadge, {backgroundColor: def.bg, borderColor: def.color}]}>
                          <Text style={[styles.prGameLevelText, {color: def.color}]}>Lvl {stat.maxLevel || '—'}</Text>
                        </View>
                      </View>
                      <View style={styles.prGameStatsRow}>
                        <View style={styles.prGameStatItem}>
                          <Text style={styles.prGameStatVal}>{stat.totalStars}</Text>
                          <Text style={styles.prGameStatLabel}>⭐ Total Stars</Text>
                        </View>
                        <View style={[styles.prGameStatDivider]} />
                        <View style={styles.prGameStatItem}>
                          <Text style={styles.prGameStatVal}>{stat.avgStars}</Text>
                          <Text style={styles.prGameStatLabel}>Avg Stars/Play</Text>
                        </View>
                        <View style={[styles.prGameStatDivider]} />
                        <View style={styles.prGameStatItem}>
                          <Text style={styles.prGameStatVal}>{timeStr}</Text>
                          <Text style={styles.prGameStatLabel}>🕐 Play Time</Text>
                        </View>
                      </View>
                      {stat.plays > 0 && (
                        <View style={styles.prGameProgressBar}>
                          <View style={[styles.prGameProgressFill, {
                            width: `${Math.min(100, (stat.totalStars / (stat.plays * 3)) * 100)}%`,
                            backgroundColor: def.color
                          }]} />
                        </View>
                      )}
                    </View>
                  );
                })}

                {gameTelemetry.length === 0 && (
                  <View style={{alignItems:'center', padding: 24, backgroundColor: '#FFF', borderRadius: 16}}>
                    <Text style={{fontSize: 32, marginBottom: 8}}>🎮</Text>
                    <Text style={{fontSize: 14, fontWeight:'700', color:'#1E293B', marginBottom: 4}}>No Game Sessions Yet</Text>
                    <Text style={{fontSize: 12, color:'#64748B', textAlign:'center'}}>Stars and play time will appear here once {childName} plays the learning games.</Text>
                  </View>
                )}
              </View>
            )}

            {/* 1. STUDENT REPORT ACTIVITY CHART */}
            {dailyTrend.labels.length > 0 && (
              <View style={styles.chartBox}>
                <Text style={styles.chartTitle}>1. Student Report Activity</Text>
                <View style={{ backgroundColor: '#FFFAF0', padding: 12, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                  <Text style={styles.chartSubTitle}>Daily Report Trend</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: dailyTrend.labels,
                        datasets: dailyTrend.datasets,
                        // hide built-in legend to avoid overlap
                        legend: undefined,
                      }}
                      width={Math.max(width - 70, dailyTrend.labels.length * 55)}
                      height={220}
                      chartConfig={{
                        backgroundGradientFrom: "#FFFAF0",
                        backgroundGradientTo: "#FFFAF0",
                        color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                        labelColor: (opacity = 1) => `rgba(80,80,80,${opacity})`,
                        strokeWidth: 2,
                        decimalPlaces: 0,
                        propsForLabels: { fontSize: 10 },
                        propsForDots: { r: '4', strokeWidth: '2', stroke: '#FFF' },
                      }}
                      bezier
                      withLegend={false}
                      style={{ borderRadius: 12, marginTop: 8 }}
                    />
                  </ScrollView>
                  {/* Custom legend below chart */}
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#3498DB'}]}/><Text style={[styles.legendText, {color: '#3498DB'}]}>Active Students</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#2ECC71'}]}/><Text style={[styles.legendText, {color: '#2ECC71'}]}>Game Reports</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#E74C3C'}]}/><Text style={[styles.legendText, {color: '#E74C3C'}]}>Reports</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#F39C12'}]}/><Text style={[styles.legendText, {color: '#F39C12'}]}>Stars Earned</Text></View>
                  </View>
                </View>
              </View>
            )}

            {/* 2. STUDENT ACTIVITY TABLE */}
            {studentActivity.length > 0 && (
              <View style={styles.chartBox}>
                <Text style={styles.chartTitle}>2. Student Activity Breakdown</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{flexDirection: 'column', minWidth: width - 40, marginTop: 12}}>
                    <View style={styles.tableRowHeader}>
                      <Text style={[styles.tableCell, styles.tableHeaderCell, {width: 100}]}>Student</Text>
                      <Text style={[styles.tableCell, styles.tableHeaderCell, {width: 70}]}>Reports</Text>
                      <Text style={[styles.tableCell, styles.tableHeaderCell, {width: 80}]}>Days</Text>
                      <Text style={[styles.tableCell, styles.tableHeaderCell, {width: 80}]}>Attend %</Text>
                      <Text style={[styles.tableCell, styles.tableHeaderCell, {width: 80}]}>Games</Text>
                      <Text style={[styles.tableCell, styles.tableHeaderCell, {width: 90}]}>Game Time</Text>
                      <Text style={[styles.tableCell, styles.tableHeaderCell, {width: 60}]}>Stars</Text>
                    </View>
                    {studentActivity.map((s, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, {width: 100}]} numberOfLines={1}>{s.name}</Text>
                        <Text style={[styles.tableCell, {width: 70}]}>{s.totalReports}</Text>
                        <Text style={[styles.tableCell, {width: 80}]}>{s.activeDaysCount}</Text>
                        <Text style={[styles.tableCell, {width: 80}]}>{s.attendancePct}%</Text>
                        <Text style={[styles.tableCell, {width: 80}]}>{s.gameReports}</Text>
                        <Text style={[styles.tableCell, {width: 90}]}>{formatDuration(s.gameTimeMinutes)}</Text>
                        <Text style={[styles.tableCell, {width: 60}]}>{s.stars}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* 3. EDUCATIONAL GAMES ANALYTICS */}
            {gameAnalytics.length > 0 && (
              <View style={styles.chartBox}>
                <View style={styles.gameSectionHeader}>
                  <Text style={styles.chartTitle}>3. Educational Games <Text style={{fontWeight: '400'}}>Analytics</Text></Text>
                  <View style={styles.badgeTeal}>
                    <Text style={styles.badgeTealText}>{summary.gamePlays} Plays • {formatDuration(summary.totalGameTimeMinutes)} Play Time</Text>
                  </View>
                </View>

                {/* HORIZONTAL CARDS FOR CHARTS */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                  
                  {/* CARD 1: PIE CHART */}
                  <View style={styles.horizontalCard}>
                    <Text style={styles.hCardTitle}>Performance Distribution</Text>
                    <PieChart
                      data={perfDistribution}
                      width={280}
                      height={150}
                      chartConfig={chartConfig}
                      accessor={"count"}
                      backgroundColor={"transparent"}
                      paddingLeft={"0"}
                      center={[0, 0]}
                    />
                  </View>

                  {/* CARD 2: TIME SPENT BAR CHART */}
                  <View style={styles.horizontalCard}>
                    <Text style={styles.hCardTitle}>Time Spent per Game</Text>
                    <BarChart
                      data={{
                        labels: gameAnalytics.map(g => g.name.substring(0, 6)),
                        datasets: [{ data: gameAnalytics.map(g => g.timeMinutes) }]
                      }}
                      width={250}
                      height={180}
                      yAxisLabel=""
                      chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`}}
                      style={{ marginTop: 10 }}
                      showBarTops={false}
                    />
                  </View>

                  {/* CARD 3: PLAYS & MOVES CUSTOM CHART */}
                  <View style={styles.horizontalCard}>
                    <Text style={styles.hCardTitle}>Plays & Moves per Game</Text>
                    <ScrollView horizontal>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, paddingHorizontal: 10 }}>
                        {gameAnalytics.map((g, i) => {
                          const maxMetric = Math.max(...gameAnalytics.map(ga => Math.max(ga.plays, ga.moves))) || 1;
                          const playHeight = (g.plays / maxMetric) * 120;
                          const moveHeight = (g.moves / maxMetric) * 120;
                          return (
                            <View key={i} style={{ alignItems: 'center', marginHorizontal: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120 }}>
                                <View style={{ width: 24, height: playHeight, backgroundColor: '#EF4444', borderTopLeftRadius: 4, borderTopRightRadius: 4, marginRight: 2 }} />
                                <View style={{ width: 24, height: moveHeight, backgroundColor: '#8B5CF6', borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                              </View>
                              <Text style={{ fontSize: 10, color: '#64748B', marginTop: 8, width: 50, textAlign: 'center' }} numberOfLines={1}>{g.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                        <View style={{ width: 12, height: 12, backgroundColor: '#EF4444', marginRight: 6 }} />
                        <Text style={{ fontSize: 12, color: '#64748B' }}>Plays</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 12, height: 12, backgroundColor: '#8B5CF6', marginRight: 6 }} />
                        <Text style={{ fontSize: 12, color: '#64748B' }}>Total Moves</Text>
                      </View>
                    </View>
                  </View>

                </ScrollView>

                {/* GAME TABLE */}
                <View style={styles.gameTableContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{flexDirection: 'column', minWidth: width - 40}}>
                      <View style={[styles.tableRowHeader, { backgroundColor: '#38B2AC', paddingVertical: 10, paddingHorizontal: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]}>
                        <Text style={[styles.tableCell, {fontWeight: 'bold', color: '#FFF', width: 110}]}>GAME</Text>
                        <Text style={[styles.tableCell, {fontWeight: 'bold', color: '#FFF', width: 90}]}>TOTAL PLAYS</Text>
                        <Text style={[styles.tableCell, {fontWeight: 'bold', color: '#FFF', width: 90}]}>TOTAL MOVES</Text>
                        <Text style={[styles.tableCell, {fontWeight: 'bold', color: '#FFF', width: 120}]}>TOTAL STARS</Text>
                        <Text style={[styles.tableCell, {fontWeight: 'bold', color: '#FFF', width: 110}]}>AVG STARS / PLAY</Text>
                      </View>
                      {gameAnalytics.map((g, i) => (
                        <View key={i} style={[styles.tableRow, { paddingHorizontal: 8 }]}>
                          <Text style={[styles.tableCell, {fontWeight: '600', color: '#1E293B', width: 110}]} numberOfLines={1}>{g.name}</Text>
                          <Text style={[styles.tableCell, {width: 90}]}>{g.plays}</Text>
                          <Text style={[styles.tableCell, {width: 90}]}>{g.moves}</Text>
                          <Text style={[styles.tableCell, {width: 120, color: '#EAB308', fontWeight: 'bold'}]}>{'⭐'.repeat(Math.round(g.avgStars))} ({g.stars})</Text>
                          <Text style={[styles.tableCell, {width: 110}]}>{g.avgStars}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* STUDENT SEARCH MODAL */}
      <Modal visible={showStudentModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Student</Text>
              <TouchableOpacity onPress={() => setShowStudentModal(false)} style={{padding: 4}}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" style={{marginRight: 8}} />
              <TextInput 
                style={styles.modalSearchInput}
                placeholder="Search student name..."
                value={modalSearchText}
                onChangeText={setModalSearchText}
                autoFocus={true}
              />
              {modalSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchText('')}>
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              <TouchableOpacity 
                style={styles.modalStudentRow} 
                onPress={() => { setStudentSearch(''); setShowStudentModal(false); }}
              >
                <Text style={[styles.modalStudentName, !studentSearch && {color: '#8B5CF6', fontWeight: 'bold'}]}>All Students</Text>
                {!studentSearch && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
              </TouchableOpacity>
              
              {uniqueStudents
                .filter(s => s.toLowerCase().includes(modalSearchText.toLowerCase()))
                .map((student, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.modalStudentRow} 
                    onPress={() => { setStudentSearch(student); setShowStudentModal(false); }}
                  >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={styles.modalAvatar}>
                        <Text style={styles.modalAvatarText}>{student.charAt(0)}</Text>
                      </View>
                      <Text style={[styles.modalStudentName, studentSearch === student && {color: '#8B5CF6', fontWeight: 'bold'}]}>{student}</Text>
                    </View>
                    {studentSearch === student && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
                  </TouchableOpacity>
              ))}
              
              {uniqueStudents.filter(s => s.toLowerCase().includes(modalSearchText.toLowerCase())).length === 0 && (
                <Text style={styles.modalEmptyText}>No students found.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B', fontWeight: '500' },
  errorText: { marginTop: 12, fontSize: 16, color: '#1E293B', fontWeight: '600', marginBottom: 16 },
  retryBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  scrollArea: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#64748B' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginLeft: 10 },
  exportBtnText: { fontSize: 13, fontWeight: '700', color: '#6B4E3D', marginLeft: 4 },
  
  filterCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F8FAFC', borderBottomWidth: 4, borderBottomColor: '#38BDF8' },
  filterCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterCardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  resetPill: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  resetPillText: { fontSize: 12, fontWeight: '700', color: '#6B4E3D' },
  
  filterGroup: { marginRight: 16 },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#6B4E3D', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFAF0', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, paddingHorizontal: 12, height: 40, width: 140, justifyContent: 'space-between' },
  filterInputBoxDate: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFAF0', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, height: 40, width: 130, justifyContent: 'space-between' },
  filterInputText: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginTop: 20 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  summaryBox: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#2FB7A4' },
  summaryVal: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  summaryLbl: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '600' },
  
  chartBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#1E1007' },
  chartSubTitle: { fontSize: 14, fontWeight: '700', color: '#6B4E3D', marginBottom: 4 },
  
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: '600' },

  gameSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badgeTeal: { backgroundColor: '#E6FFFA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeTealText: { color: '#38B2AC', fontWeight: '700', fontSize: 12 },

  horizontalCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginRight: 16, borderWidth: 1, borderColor: '#F1F5F9', minWidth: 300, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  hCardTitle: { fontSize: 14, fontWeight: '700', color: '#6B4E3D', marginBottom: 12 },

  gameTableContainer: { marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },

  tableRowHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10, alignItems: 'center' },
  tableCell: { fontSize: 13, color: '#1E293B' },
  tableHeaderCell: { fontWeight: '700', color: '#64748B' },

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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxHeight: '80%', overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', margin: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  modalSearchInput: { flex: 1, fontSize: 15, color: '#1E293B', padding: 0 },
  modalList: { paddingHorizontal: 16, paddingBottom: 20 },
  modalStudentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalStudentName: { fontSize: 15, color: '#334155', fontWeight: '500' },
  modalAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalAvatarText: { color: '#6366F1', fontWeight: '700', fontSize: 14 },
  modalEmptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontSize: 14 },
});
