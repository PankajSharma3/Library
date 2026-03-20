import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Alert, Animated, Dimensions,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

// ─── Animated Bar ───────────────────────────────────────────────
const AnimatedBar = ({ occupancy, color }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: occupancy / 100,
      duration: 900,
      delay: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  const barWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${occupancy}%`],
  });

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
    </View>
  );
};

// ─── Stat Tile ───────────────────────────────────────────────────
const StatTile = ({ label, value, color, bg }) => (
  <View style={[styles.statTile, { backgroundColor: bg }]}>
    <Text style={[styles.statNum, { color }]}>{value}</Text>
    <Text style={[styles.statLbl, { color }]}>{label}</Text>
  </View>
);

// ─── Library Card ────────────────────────────────────────────────
const LibraryCard = ({ lib, getLibraryStats, onPress, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const stats = getLibraryStats(lib.id);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 300 + index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 300 + index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const occupancy = stats.totalSeats > 0 ? Math.round((stats.occupiedSeats / stats.totalSeats) * 100) : 0;
  const available = stats.totalSeats - stats.occupiedSeats;

  const status = occupancy > 80 ? 'Full' : occupancy > 50 ? 'Busy' : 'Open';
  const statusColor = occupancy > 80 ? '#e74c3c' : occupancy > 50 ? '#e67e22' : '#27ae60';
  const statusBg = occupancy > 80 ? '#fff0ee' : occupancy > 50 ? '#fff8f0' : '#f0fff6';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {/* Top color strip */}
        <View style={[styles.cardStrip, { backgroundColor: lib.color }]} />

        <View style={styles.cardBody}>
          {/* Header row */}
          <View style={styles.cardHeadRow}>
            <View style={[styles.iconWrap, { backgroundColor: lib.lightBg }]}>
              <Text style={styles.iconText}>{lib.icon}</Text>
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardLibName} numberOfLines={1}>{lib.name}</Text>
              <Text style={styles.cardAddress} numberOfLines={1}>📍 {lib.address}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>

          {/* Occupancy */}
          <View style={styles.occLabelRow}>
            <Text style={styles.occLabel}>SEAT OCCUPANCY</Text>
            <Text style={[styles.occPct, { color: lib.color }]}>{occupancy}%</Text>
          </View>
          <AnimatedBar occupancy={occupancy} color={lib.color} />

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatTile label="Total"     value={stats.totalSeats}    color={lib.color}   bg={lib.lightBg} />
            <StatTile label="Occupied"  value={stats.occupiedSeats} color="#e74c3c"     bg="#fff5f5" />
            <StatTile label="Available" value={available}          color="#27ae60"     bg="#f0fff6" />
            <StatTile label="Students"  value={stats.totalStudents}       color="#e67e22"     bg="#fff8f0" />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: statusColor }]} />
            <Text style={styles.liveText}>Live Tracking</Text>
          </View>
          <Text style={[styles.manageText, { color: lib.color }]}>Manage →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Summary Pill ────────────────────────────────────────────────
const SummaryPill = ({ label, value, valueColor }) => (
  <View style={styles.summaryPill}>
    <Text style={[styles.pillVal, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    <Text style={styles.pillLbl}>{label}</Text>
  </View>
);

// ─── Dashboard Screen ────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { libraries, getLibraryStats, logout, userData, updateCredentials, isLoading, refreshing, refreshData } = useApp();
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  const [newUsername, setNewUsername] = React.useState(userData?.username || '');
  const [newPassword, setNewPassword] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [isLoading]); // Re-run animation after loading completes

  // Keep local form in sync with global user state
  useEffect(() => {
    if (userData?.username) {
      setNewUsername(userData.username);
    }
  }, [userData]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleUpdateCredentials = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    setIsUpdating(true);
    try {
      await updateCredentials(newUsername.trim(), newPassword || undefined);
      Alert.alert('Success ✅', 'Credentials updated successfully');
      setNewPassword('');
    } catch (e) {
      Alert.alert('Error ❌', e.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate global stats
  const libStats = libraries.map(lib => getLibraryStats(lib.id));
  const totalStudents = libStats.reduce((a, s) => a + s.totalStudents, 0);
  const totalSeats = libStats.reduce((a, s) => a + s.totalSeats, 0);
  const totalOccupied = libStats.reduce((a, s) => a + s.occupiedSeats, 0);
  const totalFree = totalSeats - totalOccupied;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      {/* ─── Header ─── */}
      <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingLine}>Welcome back, Admin 👋</Text>
            <Text style={styles.brandName}>
              Rudraksh
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Summary pills */}
        <View style={styles.summaryRow}>
          <SummaryPill label="Libraries" value={libraries.length} />
          <SummaryPill label="Students"  value={totalStudents} />
          <SummaryPill label="Free Seats" value={totalFree}     valueColor="#2ecc71" />
          <SummaryPill label="Occupied"  value={totalOccupied}  valueColor="#e74c3c" />
        </View>
      </Animated.View>

      {/* ─── List ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshData} tintColor="#fff" />
        }
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your Libraries</Text>
          <Text style={styles.sectionCount}>{libraries.length} BRANCHES</Text>
        </View>

        {libraries.map((lib, i) => {
          return (
            <LibraryCard
              key={lib.id}
              lib={lib}
              getLibraryStats={getLibraryStats}
              index={i}
              onPress={() => navigation.navigate('LibraryDetail', { libraryId: lib.id })}
            />
          );
        })}

        {/* ─── Security Settings ─── */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Security Settings</Text>
          <Text style={styles.settingsSub}>Update your manager credentials</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>NEW USERNAME</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.formInput}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="New Username"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput
                style={styles.formInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Leave blank to keep current"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.updateBtn, isUpdating && { opacity: 0.6 }]} 
            onPress={handleUpdateCredentials}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.updateBtnText}>Update Credentials</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    backgroundColor: '#f5f3ee',
  },

  // Header
  header: {
    backgroundColor: '#0d0d0d',
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  greetingLine: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  brandDot: {
    color: '#e74c3c',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // Summary pills
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  pillVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  pillLbl: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },

  // Section head
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 22,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d0d0d',
    letterSpacing: -0.4,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
    letterSpacing: 0.8,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardStrip: {
    height: 6,
    width: '100%',
  },
  cardBody: {
    padding: 18,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  cardTitleBlock: { flex: 1 },
  cardLibName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0d0d0d',
    letterSpacing: -0.3,
  },
  cardAddress: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 3,
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // Occupancy
  occLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  occLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#aaa',
    letterSpacing: 0.8,
  },
  occPct: {
    fontSize: 15,
    fontWeight: '800',
  },
  barTrack: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 16,
  },
  barFill: {
    height: '100%',
    borderRadius: 100,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    opacity: 0.75,
  },

  // Card footer
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '500',
  },
  manageText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Settings Form
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0d0d0d',
    marginBottom: 4,
  },
  settingsSub: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#aaa',
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  formInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0d0d0d',
  },
  updateBtn: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});