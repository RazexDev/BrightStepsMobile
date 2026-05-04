export const normalizeReport = (report) => {
  if (!report) return null;
  const studentName = report.studentName || report.name || report.childName || 'Unknown Student';
  const studentId = report.studentId || report.childId || report.studentID || '';
  const rawDate = report.date || report.createdAt || report.sessionDate;
  const date = rawDate ? new Date(rawDate) : new Date();
  
  const activity = report.activity || report.activityName || report.customActivity || report.gameName || 'Unknown Activity';
  const isGame = !!(report.gameName || ['FocusMatch', 'Focus Match', 'ShapeSort', 'Shape Sort', 'EmotionExplorer', 'Emotion Explorer'].includes(activity));
  const gameName = isGame ? (report.gameName || activity) : null;
  
  const skillArea = report.skillArea || report.skill || 'Other';
  const durationMinutes = Number(report.durationMinutes || report.duration || report.completionTime || report.gamePlayTime || report.timeSpent) || 0;
  
  const stars = Number(report.stars || report.totalStars) || 0;
  const moves = Number(report.totalMoves || report.moves) || 0;
  const score = Number(report.score || report.points) || 0;
  
  const attendance = report.attendance || report.attendanceStatus || 'Present';
  const progress = report.progressLevel || report.progress || 'N/A';
  const engagement = report.engagementLevel || report.engagement || 'N/A';
  
  return {
    ...report,
    normalized: true,
    studentName,
    studentId,
    date,
    activity,
    isGame,
    gameName,
    skillArea,
    durationMinutes,
    stars,
    moves,
    score,
    attendance,
    progress,
    engagement
  };
};

export const formatDuration = (val) => {
  if (!val) return '0 mins';
  const totalMinutes = Number(val);
  if (isNaN(totalMinutes)) return '0 mins';
  
  if (totalMinutes < 60) {
    return `${totalMinutes} mins`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} mins`;
};

export const getDateRange = (reportType) => {
  const now = new Date();
  const start = new Date();
  
  if (reportType === 'Weekly') {
    start.setDate(now.getDate() - 7);
  } else if (reportType === 'Monthly') {
    start.setDate(now.getDate() - 30);
  }
  
  start.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  
  return { startDate: start, endDate: now };
};

export const filterReportsByDateAndStudent = (reports, startDate, endDate, studentQuery) => {
  if (!reports || reports.length === 0) return [];
  
  const normalizedReports = reports.map(r => r.normalized ? r : normalizeReport(r));
  
  const filtered = normalizedReports.filter(r => {
    const inDateRange = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
    const matchesStudent = !studentQuery || 
                           r.studentName.toLowerCase().includes(studentQuery.toLowerCase()) || 
                           r.studentId.toLowerCase().includes(studentQuery.toLowerCase());
    
    return inDateRange && matchesStudent;
  });

  return filtered;
};

export const calculateSummaryCards = (reports) => {
  if (!reports || reports.length === 0) return {
    totalReports: 0, activeStudents: 0, uniqueActivities: 0, gamePlays: 0, totalGameTimeMinutes: 0, totalStars: 0
  };

  const students = new Set(reports.map(r => r.studentName));
  const uniqueActivities = new Set(reports.map(r => r.activity));
  const gameReports = reports.filter(r => r.isGame);
  
  const totalGameTime = gameReports.reduce((acc, r) => acc + r.durationMinutes, 0);
  const totalStars = reports.reduce((acc, r) => acc + r.stars, 0);

  return {
    totalReports: reports.length,
    activeStudents: students.size,
    uniqueActivities: uniqueActivities.size,
    gamePlays: gameReports.length,
    totalGameTimeMinutes: Math.round(totalGameTime),
    totalStars
  };
};

export const calculateDailyTrend = (reports) => {
  if (!reports || reports.length === 0) return { labels: [], datasets: [] };

  const trendMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendMap[d.toISOString().split('T')[0]] = { count: 0, stars: 0, games: 0, activeStudents: new Set() };
  }

  reports.forEach(r => {
    const dateStr = r.date.toISOString().split('T')[0];
    if (!trendMap[dateStr]) {
      trendMap[dateStr] = { count: 0, stars: 0, games: 0, activeStudents: new Set() };
    }
    trendMap[dateStr].count += 1;
    trendMap[dateStr].stars += r.stars;
    if (r.isGame) trendMap[dateStr].games += 1;
    if (r.studentName) trendMap[dateStr].activeStudents.add(r.studentName);
  });

  const sortedDates = Object.keys(trendMap).sort();
  
  return {
    labels: sortedDates.map(d => {
      // Show only MM-DD e.g. "04-30"
      return d.substring(5);
    }),
    legend: ['Active Students', 'Game Reports', 'Reports', 'Stars Earned'],
    datasets: [
      { data: sortedDates.map(d => trendMap[d].activeStudents.size), color: () => '#3498DB', strokeWidth: 2 },
      { data: sortedDates.map(d => trendMap[d].games), color: () => '#2ECC71', strokeWidth: 2 },
      { data: sortedDates.map(d => trendMap[d].count), color: () => '#E74C3C', strokeWidth: 2 },
      { data: sortedDates.map(d => trendMap[d].stars), color: () => '#F39C12', strokeWidth: 2 }
    ]
  };
};

export const calculatePerformanceDistribution = (reports) => {
  if (!reports || reports.length === 0) return [];
  const gameReports = reports.filter(r => r.isGame);
  
  let advanced = 0; // 3 stars
  let intermediate = 0; // 2 stars
  let beginner = 0; // 0-1 stars
  
  gameReports.forEach(r => {
    if (r.stars >= 3) advanced++;
    else if (r.stars === 2) intermediate++;
    else beginner++;
  });
  
  const data = [];
  if (advanced > 0) data.push({ name: 'Advanced (3★)', count: advanced, color: '#3B82F6', legendFontColor: '#64748B', legendFontSize: 12 });
  if (intermediate > 0) data.push({ name: 'Intermediate (2★)', count: intermediate, color: '#EF4444', legendFontColor: '#64748B', legendFontSize: 12 });
  if (beginner > 0) data.push({ name: 'Beginner', count: beginner, color: '#F59E0B', legendFontColor: '#64748B', legendFontSize: 12 });
  
  return data;
};

export const calculateStudentActivityAnalytics = (reports) => {
  if (!reports || reports.length === 0) return [];
  const studentMap = {};
  
  reports.forEach(r => {
    const name = r.studentName;
    if (!studentMap[name]) {
      studentMap[name] = {
        name,
        totalReports: 0,
        activeDays: new Set(),
        attendanceCount: 0,
        activities: new Set(),
        gameReports: 0,
        gameTime: 0,
        stars: 0
      };
    }
    
    const s = studentMap[name];
    s.totalReports += 1;
    s.activeDays.add(r.date.toISOString().split('T')[0]);
    if (r.attendance.toLowerCase() === 'present') s.attendanceCount += 1;
    s.activities.add(r.activity);
    
    if (r.isGame) {
      s.gameReports += 1;
      s.stars += r.stars;
      s.gameTime += r.durationMinutes;
    }
  });

  return Object.values(studentMap).map(s => ({
    ...s,
    activeDaysCount: s.activeDays.size,
    activitiesCount: s.activities.size,
    attendancePct: s.totalReports > 0 ? Math.round((s.attendanceCount / s.totalReports) * 100) : 0,
    gameTimeMinutes: Math.round(s.gameTime)
  }));
};

export const calculateGameAnalytics = (reports) => {
  if (!reports || reports.length === 0) return [];
  const gameReports = reports.filter(r => r.isGame);
  const gameMap = {};
  
  gameReports.forEach(r => {
    const name = r.gameName || r.activity;
    if (!gameMap[name]) {
      gameMap[name] = { name, plays: 0, moves: 0, stars: 0, time: 0 };
    }
    gameMap[name].plays += 1;
    gameMap[name].moves += r.moves;
    gameMap[name].stars += r.stars;
    gameMap[name].time += r.durationMinutes;
  });

  return Object.values(gameMap).map(g => ({
    ...g,
    avgStars: g.plays > 0 ? (g.stars / g.plays).toFixed(1) : 0,
    timeMinutes: Math.round(g.time)
  }));
};

export const calculateLeaderboard = (reports) => {
  if (!reports || reports.length === 0) return [];
  const gameReports = reports.filter(r => r.isGame && r.studentName);
  
  return gameReports.sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars;
    if (b.score !== a.score) return b.score - a.score;
    return a.durationMinutes - b.durationMinutes;
  }).slice(0, 10);
};

export const groupReportsByStudent = (reports) => {
  if (!reports || reports.length === 0) return [];
  const map = {};
  reports.forEach(r => {
    const name = r.studentName;
    if (!map[name]) map[name] = [];
    map[name].push(r);
  });
  
  return Object.keys(map).map(name => {
    const studentReports = map[name].sort((a, b) => b.date - a.date);
    const latest = studentReports[0];
    
    return {
      studentName: name,
      studentId: latest.studentId || 'N/A',
      totalReports: studentReports.length,
      latestDate: latest.date,
      latestSkill: latest.skillArea,
      latestActivity: latest.activity,
      progress: latest.progress,
      engagement: latest.engagement,
      attendance: latest.attendance,
      reports: studentReports
    };
  });
};
