import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, TextInput, Modal, FlatList, ActivityIndicator,
  useWindowDimensions, Platform, RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/dateUtils';

const StudentCard = ({ student, onDelete, onView, compact }) => (
  <TouchableOpacity 
    style={[styles.studentCard, compact && styles.studentCardCompact]} 
    onPress={onView}
    activeOpacity={0.7}
  >
    <View style={styles.studentLeft}>
      <View style={[styles.avatarCircle, compact && styles.avatarCircleCompact]}>
        <Text style={[styles.avatarText, compact && styles.avatarTextCompact]}>
          {student.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.studentInfoStrip}>
        <View style={styles.nameRow}>
          <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
          <View style={[styles.shiftTag, { backgroundColor: student.shift === 'FULL_DAY' ? '#1a237e' : '#e8eaf6' }]}>
            <Text style={[styles.shiftTagText, { color: student.shift === 'FULL_DAY' ? '#fff' : '#1a237e' }]}>
              {student.shift === 'FULL_DAY' ? 'F' : student.shift === 'MORNING' ? 'M' : 'E'}
            </Text>
          </View>
        </View>
        <Text style={styles.studentRoll} numberOfLines={1}>📅 {formatDate(student.joiningDate)}</Text>
        <Text style={styles.studentSeat} numberOfLines={1}>
          🪑 #{student.seatNumber} • {student.feeStatus === 'FULLY_PAID' ? 'Fully Paid' : `Partially Paid: ${student.paidAmount}`}
        </Text>
      </View>
    </View>
    <View style={styles.studentActions}>
      {student.daysRemaining <= 5 && (
        <View style={styles.expiryBadge}>
          <Text style={styles.expiryBadgeText}>
            {student.daysRemaining <= 0 ? 'EXP' : `${student.daysRemaining}d`}
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.deleteBtn} onPress={(e) => {
        e.stopPropagation();
        onDelete();
      }}>
        <Text style={styles.deleteBtnIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const RenewAmountModal = ({ visible, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.amountModal}>
          <Text style={styles.amountTitle}>Partial Renewal</Text>
          <Text style={styles.amountSub}>Enter amount paid for next month:</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="e.g. 500"
            autoFocus
          />
          <View style={styles.amountActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmBtn} 
              onPress={() => {
                onConfirm(Number(amount));
                setAmount('');
                onClose();
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const StudentDetailModal = ({ student, visible, onClose, navigation }) => {
  if (!student) return null;
  const fields = [
    { label: 'Name', value: student.name },
    { label: "Father's / Husband's Name", value: student.fatherName },
    { label: 'Date of Birth', value: student.dob },
    { label: 'Gender', value: student.gender },
    { label: 'Mobile No.', value: student.mobile },
    { label: 'Guardian Mobile', value: student.mobileGuardian },
    { label: 'Local Address', value: student.addressLocal },
    { label: 'Permanent Address', value: student.addressPermanent },
    { label: 'Identity Proof', value: student.identityProof },
    { label: 'Preparation For', value: student.preparationFor },
    { label: 'Coaching / Institute', value: student.coachingInstitute },
    { label: 'Joining Date', value: student.joiningDate },
    { label: 'Expiry Date', value: student.expiryDate },
    { label: 'Remarks', value: student.remarks },
    { label: 'Plan Type', value: student.slot === 'FULL_DAY' ? 'Full Day' : 'Half Day' },
    { label: 'Shift', value: student.shift },
    { label: 'Seat Number', value: `#${student.seatNumber}` },
    { label: 'Fee Status', value: student.feeStatus },
    { label: 'Paid Amount', value: student.paidAmount },
  ];

  const { updateStudent, renewStudent } = useApp();
  const [updating, setUpdating] = useState(false);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [renewalDate, setRenewalDate] = useState(new Date());
  const [pendingStatus, setPendingStatus] = useState('FULLY_PAID');

  const handleMarkAsPaid = async () => {
    setUpdating(true);
    try {
      await updateStudent(student._id, { feeStatus: 'FULLY_PAID', paidAmount: 0 });
      Alert.alert('Success', 'Fee status updated to Fully Paid');
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleRenewalStart = (status) => {
    setPendingStatus(status);
    const currentExpiry = new Date(student.expiryDate);
    const nextExpiry = new Date(currentExpiry);
    nextExpiry.setDate(currentExpiry.getDate() + 30);
    setRenewalDate(nextExpiry);
    setShowDatePicker(true);
  };

  const proceedWithRenewal = (status, date, amount = 0) => {
    Alert.alert(
      'Confirm Renewal',
      `Extend membership until ${formatDate(date.toISOString().split('T')[0])}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setUpdating(true);
            try {
              await renewStudent(student._id, { 
                feeStatus: status, 
                paidAmount: amount,
                expiryDate: date.toISOString().split('T')[0]
              });
              Alert.alert('Success ✅', 'Membership extended successfully');
              onClose();
            } catch (e) {
              Alert.alert('Error', e.message || 'Renewal failed');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailTitle}>Registration Details</Text>
              <Text style={styles.detailId}>ID: {student._id?.slice(-6).toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                style={[styles.closeBtn, { backgroundColor: '#e8eaf6' }]} 
                onPress={() => {
                  onClose();
                  navigation.navigate('AddStudent', { libraryId: student.libraryId, student });
                }}
              >
                <Text style={{ fontSize: 14 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {fields.map((f, i) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{f.label}</Text>
                <Text style={styles.detailValue}>
                  {f.label.includes('Date') ? formatDate(f.value) : (f.value || 'N/A')}
                </Text>
              </View>
            ))}
            
            {student.feeStatus === 'PARTIALLY_PAID' && (
              <TouchableOpacity 
                style={[styles.payBtn, updating && { opacity: 0.6 }]} 
                onPress={handleMarkAsPaid}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>💰 Mark as Fully Paid</Text>}
              </TouchableOpacity>
            )}

            <View style={styles.renewalSection}>
              <Text style={styles.renewalTitle}>RENEWAL OPTIONS</Text>
              <View style={styles.renewalRow}>
                <TouchableOpacity 
                  style={[styles.renewBtn, { backgroundColor: '#1a237e' }]} 
                  onPress={() => handleRenewalStart('FULLY_PAID')}
                >
                  <Text style={styles.renewBtnText}>Full Pay Renewal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.renewBtn, { backgroundColor: '#e8eaf6' }]} 
                  onPress={() => handleRenewalStart('PARTIALLY_PAID')}
                >
                  <Text style={[styles.renewBtnText, { color: '#1a237e' }]}>Partial Pay</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={renewalDate}
          mode="date"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              if (pendingStatus === 'PARTIALLY_PAID') {
                setRenewalDate(date);
                setShowAmountModal(true);
              } else {
                proceedWithRenewal('FULLY_PAID', date);
              }
            }
          }}
        />
      )}

      <RenewAmountModal 
        visible={showAmountModal} 
        onClose={() => setShowAmountModal(false)}
        onConfirm={(amt) => proceedWithRenewal('PARTIALLY_PAID', renewalDate, amt)}
      />
    </Modal>
  );
};

export default function LibraryDetailScreen({ route, navigation }) {
  const { libraryId } = route.params;
  const { libraries, students, deleteStudent, getLibraryStats, isLoading, refreshing, refreshData } = useApp();
  const { width } = useWindowDimensions();

  const numColumns = width > 900 ? 3 : width > 600 ? 2 : 1;

  const library = libraries.find(l => l.id === libraryId);
  const libStudents = students[libraryId] || [];
  const stats = getLibraryStats(libraryId);

  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  const [filter, setFilter] = useState('ALL');

  const processedStudents = libStudents.map(s => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(s.expiryDate || s.joiningDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return { ...s, daysRemaining: diff };
  });

  const filtered = processedStudents.filter(s => {
    const matchesSearch = 
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.mobile?.includes(search);
    
    if (!matchesSearch) return false;

    if (filter === 'PARTIAL') return s.feeStatus === 'PARTIALLY_PAID';
    if (filter === 'EXPIRING') return s.daysRemaining <= 5;

    return true;
  });

  const handleDelete = (student) => {
    Alert.alert(
      'Delete Session',
      `Remove ${student.name} (${student.shift})?\nThis will free the seat for this slot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteStudent(libraryId, student._id) },
      ]
    );
  };

  const SeatMap = () => {
    const zones = library?.zones || {};

    const getSeatStatus = (seat) => {
      const shifts = seat.occupancy?.map(o => o.shift) || [];
      if (shifts.includes('FULL_DAY')) return 'OCC_FULL';
      if (shifts.includes('MORNING') && shifts.includes('EVENING')) return 'OCC_HALF_BOTH';
      if (shifts.includes('MORNING')) return 'OCC_MORNING';
      if (shifts.includes('EVENING')) return 'OCC_EVENING';
      return 'FREE';
    };

    const handleSeatPress = (seatNumber) => {
      const occupants = libStudents.filter(s => s.seatNumber === seatNumber);
      if (occupants.length === 0) {
        Alert.alert(`Seat #${seatNumber}`, "This seat is currently available.");
      } else if (occupants.length === 1) {
        setSelectedStudent(occupants[0]);
      } else {
        // Show choice modal for partial occupancy
        Alert.alert(
          `Seat #${seatNumber}`,
          "Select student to view details:",
          occupants.map(s => ({
            text: `${s.name} (${s.shift})`,
            onPress: () => setSelectedStudent(s)
          })).concat([{ text: 'Cancel', style: 'cancel' }])
        );
      }
    };

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
        }
      >
        {Object.entries(zones).map(([zoneKey, zone]) => (
          <View key={zoneKey} style={styles.zoneContainer}>
            <Text style={styles.zoneTitle}>{zone.label}</Text>
            <View style={styles.seatGrid}>
              {zone.carrels.map(num => {
                const seat = library.seats.find(s => s.number === num);
                const status = seat ? getSeatStatus(seat) : 'FREE';
                
                let seatStyle = styles.seatFree;
                let textStyle = styles.seatNumFree;
                
                if (status === 'OCC_FULL' || status === 'OCC_HALF_BOTH') {
                  seatStyle = styles.seatOccupied;
                  textStyle = styles.seatNumOcc;
                } else if (status === 'OCC_MORNING' || status === 'OCC_EVENING') {
                  seatStyle = styles.seatPartial;
                  textStyle = styles.seatNumPartial;
                }

                return (
                  <TouchableOpacity 
                    key={num} 
                    style={[styles.seat, seatStyle]}
                    onPress={() => handleSeatPress(num)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.seatNum, textStyle]}>{num}</Text>
                    {status === 'OCC_MORNING' && <Text style={styles.tinyShift}>M</Text>}
                    {status === 'OCC_EVENING' && <Text style={styles.tinyShift}>E</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <View style={styles.seatLegend}>
          <View style={[styles.legendDot, { backgroundColor: '#e8f5e9' }]} />
          <Text style={styles.legendText}>Available</Text>
          <View style={[styles.legendDot, styles.seatPartial, { marginLeft: 16 }]} />
          <Text style={styles.legendText}>Partial (M/E)</Text>
          <View style={[styles.legendDot, { backgroundColor: '#ffebee', marginLeft: 16 }]} />
          <Text style={styles.legendText}>Full</Text>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{library?.name}</Text>
          <Text style={styles.headerSub}>{stats.totalStudents} registrations • {stats.totalSeats - stats.occupiedSeats} free seats</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddStudent', { libraryId })}>
          <Text style={styles.addBtnText}>+ Admit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['students', 'seats'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'students' ? '👥 Students' : '🪑 Seat Map'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'students' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or mobile..."
              placeholderTextColor="#9e9e9e"
            />
          </View>

          <View style={styles.filterBar}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PARTIAL', label: 'Unpaid' },
              { id: 'EXPIRING', label: 'Expiring (5d)' },
            ].map(f => (
              <TouchableOpacity 
                key={f.id} 
                style={[styles.filterChip, filter === f.id && styles.activeFilterChip]}
                onPress={() => setFilter(f.id)}
              >
                <Text style={[styles.filterChipText, filter === f.id && styles.activeFilterChipText]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <TouchableOpacity style={styles.addFirstBtn} onPress={() => navigation.navigate('AddStudent', { libraryId })}>
                <Text style={styles.addFirstText}>Admission Process</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item._id}
              numColumns={numColumns}
              key={numColumns}
              columnWrapperStyle={numColumns > 1 ? { gap: 12 } : null}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
              }
              renderItem={({ item }) => (
                <StudentCard
                  student={item}
                  onDelete={() => handleDelete(item)}
                  onView={() => setSelectedStudent(item)}
                  compact={numColumns > 1}
                />
              )}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            />
          )}
        </View>
      ) : (
        <SeatMap />
      )}

      <StudentDetailModal
        student={selectedStudent}
        visible={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f8' },
  header: {
    backgroundColor: '#1a237e', flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
  },
  backBtn: { padding: 6 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  addBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#1a237e', fontWeight: '700', fontSize: 13 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#1a237e' },
  tabText: { fontSize: 14, color: '#757575', fontWeight: '500' },
  activeTabText: { color: '#1a237e', fontWeight: '700' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
  searchInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, fontSize: 14, color: '#212121', backgroundColor: '#fafafa' },
  studentCard: { 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 10, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    elevation: 3,
    flex: 1,
  },
  studentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e8eaf6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#1a237e' },
  studentInfoStrip: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#212121' },
  shiftTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  shiftTagText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  studentRoll: { fontSize: 11, color: '#666', marginTop: 1 },
  studentSeat: { fontSize: 11, color: '#1a237e', fontWeight: '600', marginTop: 2 },
  studentActions: { flexDirection: 'row', gap: 8 },
  viewBtn: { backgroundColor: '#e8eaf6', padding: 10, borderRadius: 10 },
  viewBtnText: { fontSize: 16 },
  deleteBtn: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#fff1f0', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffa39e'
  },
  deleteBtnIcon: { fontSize: 13, color: '#ff4d4f' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginBottom: 16 },
  addFirstBtn: { backgroundColor: '#1a237e', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  addFirstText: { color: '#fff', fontWeight: '700' },
  zoneContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', backgroundColor: '#fff', marginBottom: 8 },
  zoneTitle: { fontSize: 13, fontWeight: '700', color: '#1a237e', marginBottom: 10 },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  seat: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, position: 'relative' },
  seatFree: { backgroundColor: '#e8f5e9', borderColor: '#81c784' },
  seatOccupied: { backgroundColor: '#ffebee', borderColor: '#ef9a9a' },
  seatPartial: { backgroundColor: '#fff3e0', borderColor: '#ffb74d' },
  seatNum: { fontSize: 13, fontWeight: '700' },
  seatNumFree: { color: '#2e7d32' },
  seatNumOcc: { color: '#c62828' },
  seatNumPartial: { color: '#e65100' },
  tinyShift: { position: 'absolute', bottom: 1, right: 3, fontSize: 8, fontWeight: '900', color: '#e65100' },
  seatLegend: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  legendDot: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#ddd' },
  legendText: { fontSize: 12, color: '#757575', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#1a237e' },
  detailId: { fontSize: 10, color: '#aaa', fontWeight: '800', letterSpacing: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: '#424242' },
  detailRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 11, color: '#9e9e9e', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#212121', fontWeight: '500' },
  payBtn: { backgroundColor: '#2e7d32', marginTop: 20, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  filterBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#fff' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f2f8', borderUnits: 1, borderColor: '#e0e0e0' },
  activeFilterChip: { backgroundColor: '#1a237e' },
  filterChipText: { fontSize: 12, color: '#757575', fontWeight: '600' },
  activeFilterChipText: { color: '#fff' },
  expiryBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, backgroundColor: '#ffebee', alignSelf: 'center' },
  expiryBadgeText: { fontSize: 8, fontWeight: '900', color: '#c62828', lineHeight: 10 },
  renewalSection: { marginTop: 24, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  renewalTitle: { fontSize: 11, fontWeight: '800', color: '#1a237e', marginBottom: 12, opacity: 0.6 },
  renewalRow: { flexDirection: 'row', gap: 10 },
  renewBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  renewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  studentCardCompact: { padding: 10 },
  avatarCircleCompact: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  avatarTextCompact: { fontSize: 16 },
  amountModal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%', alignSelf: 'center' },
  amountTitle: { fontSize: 18, fontWeight: '700', color: '#1a237e', marginBottom: 8 },
  amountSub: { fontSize: 14, color: '#666', marginBottom: 16 },
  amountInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 16, color: '#212121', marginBottom: 20 },
  amountActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  cancelBtnText: { color: '#757575', fontWeight: '600' },
  confirmBtn: { backgroundColor: '#1a237e', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
});
