import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/dateUtils';

const FormField = ({ label, required, children }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    {children}
  </View>
);

const Input = ({ value, onChangeText, placeholder, keyboardType, multiline }) => (
  <TextInput
    style={[styles.input, multiline && styles.inputMultiline]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder || ''}
    placeholderTextColor="#bdbdbd"
    keyboardType={keyboardType || 'default'}
    multiline={multiline}
  />
);

const OptionGroup = ({ label, options, current, onSelect }) => (
  <View style={styles.optionContainer}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={styles.optionRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.optionBtn, current === opt.value && styles.optionBtnActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.optionText, current === opt.value && styles.optionTextActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const DatePickerField = ({ label, value, onChange, required }) => {
  const [show, setShow] = useState(false);
  const dateValue = value ? new Date(value) : new Date();

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label} {required && <Text style={styles.required}>*</Text>}</Text>
      <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShow(true)}>
        <Text style={styles.datePickerText}>{value ? formatDate(value) : 'Select Date'}</Text>
        <Text style={{ fontSize: 18 }}>📅</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) {
              onChange(selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}
    </View>
  );
};

const SeatPickerModal = ({ visible, onClose, onSelect, library, selectedShift }) => {
  const seats = library?.seats || [];
  
  const isAvailable = (seat, targetShift) => {
    const occupied = seat.occupancy?.map(o => o.shift) || [];
    if (targetShift === 'FULL_DAY') return occupied.length === 0;
    if (targetShift === 'MORNING') return !occupied.includes('FULL_DAY') && !occupied.includes('MORNING');
    if (targetShift === 'EVENING') return !occupied.includes('FULL_DAY') && !occupied.includes('EVENING');
    return false;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.seatModal}>
          <View style={styles.seatModalHeader}>
            <Text style={styles.seatModalTitle}>Select a Seat ({selectedShift})</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(library?.zones || {}).map(([zoneKey, zone]) => (
              <View key={zoneKey} style={styles.zonePicker}>
                <Text style={styles.zonePickerTitle}>{zone.label}</Text>
                <View style={styles.seatGrid}>
                  {zone.carrels.map(num => {
                    const seat = seats.find(s => s.number === num);
                    const avail = seat && isAvailable(seat, selectedShift);
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[styles.seatBtn, avail ? styles.seatBtnFree : styles.seatBtnOcc]}
                        onPress={() => {
                          if (avail) {
                            onSelect(num.toString());
                            onClose();
                          }
                        }}
                        disabled={!avail}
                      >
                        <Text style={[styles.seatBtnText, avail ? styles.seatBtnTextFree : styles.seatBtnTextOcc]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function AddStudentScreen({ route, navigation }) {
  const { libraryId } = route.params;
  const { libraries, addStudent } = useApp();
  const library = libraries.find(l => l.id === libraryId);

  const [form, setForm] = useState({
    name: '',
    fatherName: '',
    dob: '',
    gender: 'Male',
    mobile: '',
    addressLocal: '',
    addressPermanent: '',
    identityProof: '',
    preparationFor: '',
    coachingInstitute: '',
    slot: 'FULL_DAY', 
    shift: 'FULL_DAY',
    joiningDate: new Date().toISOString().split('T')[0],
    feeStatus: 'FULLY_PAID', 
    paidAmount: '',
    seatNumber: '',
  });
  const [seatModalVisible, setSeatModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm(f => {
    const newForm = { ...f, [key]: val };
    if (key === 'slot') {
      newForm.shift = val === 'FULL_DAY' ? 'FULL_DAY' : 'MORNING';
      newForm.seatNumber = ''; 
    }
    if (key === 'shift') {
      newForm.seatNumber = ''; 
    }
    return newForm;
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.mobile.trim() || !form.seatNumber) {
      Alert.alert('Required Fields', 'Please fill name, mobile and select a seat');
      return;
    }

    setSaving(true);
    try {
      // Sanitize payload: convert numbers and handle empty strings
      const payload = {
        ...form,
        seatNumber: Number(form.seatNumber),
        paidAmount: form.paidAmount ? Number(form.paidAmount) : 0,
        dob: form.dob || undefined, // Avoid Mongoose casting error with empty string
      };

      await addStudent(libraryId, payload);
      Alert.alert('Success ✅', 'Student registered successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Registration Error', e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registration Form</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionDivider}>STUDENT PERSONAL DETAILS</Text>
          <FormField label="Full Name" required>
            <Input value={form.name} onChangeText={v => update('name', v)} placeholder="Enter full name" />
          </FormField>
          <FormField label="Father's / Husband's Name">
            <Input value={form.fatherName} onChangeText={v => update('fatherName', v)} placeholder="Enter father's / husband's name" />
          </FormField>
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <DatePickerField label="Date of Birth" value={form.dob} onChange={v => update('dob', v)} />
            </View>
            <View style={{ flex: 1 }}>
              <OptionGroup 
                label="Gender" 
                options={[{label:'Male', value:'Male'}, {label:'Female', value:'Female'}]}
                current={form.gender} onSelect={v => update('gender', v)}
              />
            </View>
          </View>

          <FormField label="Mobile No." required>
            <Input value={form.mobile} onChangeText={v => update('mobile', v)} placeholder="10-digit mobile" keyboardType="phone-pad" />
          </FormField>

          <FormField label="Local Address">
            <Input value={form.addressLocal} onChangeText={v => update('addressLocal', v)} placeholder="Current local address" multiline />
          </FormField>
          <FormField label="Permanent Address">
            <Input value={form.addressPermanent} onChangeText={v => update('addressPermanent', v)} placeholder="Permanent home address" multiline />
          </FormField>

          <FormField label="Identity Proof">
            <Input value={form.identityProof} onChangeText={v => update('identityProof', v)} placeholder="Aadhar / PAN / ID" />
          </FormField>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <FormField label="Preparation For">
                <Input value={form.preparationFor} onChangeText={v => update('preparationFor', v)} placeholder="e.g. UPSC" />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Coaching / Institute">
                <Input value={form.coachingInstitute} onChangeText={v => update('coachingInstitute', v)} placeholder="Enter name" />
              </FormField>
            </View>
          </View>

          <Text style={styles.sectionDivider}>SLOT & SEAT BOOKING</Text>
          <DatePickerField label="Joining Date" value={form.joiningDate} onChange={v => update('joiningDate', v)} required />
          
          <OptionGroup 
            label="Plan Duration" 
            options={[{label:'Full Day', value:'FULL_DAY'}, {label:'Half Day', value:'HALF_DAY'}]}
            current={form.slot} onSelect={v => update('slot', v)}
          />

          {form.slot === 'HALF_DAY' && (
            <OptionGroup 
              label="Select Shift" 
              options={[{label:'Morning (6am-2pm)', value:'MORNING'}, {label:'Evening (2pm-10:30pm)', value:'EVENING'}]}
              current={form.shift} onSelect={v => update('shift', v)}
            />
          )}

          <FormField label="Seat Number" required>
            <TouchableOpacity
              style={[styles.seatPicker, form.seatNumber && styles.seatPickerSelected]}
              onPress={() => setSeatModalVisible(true)}
            >
              <Text style={form.seatNumber ? styles.seatPickerSelectedText : styles.seatPickerText}>
                {form.seatNumber ? `🪑 Seat #${form.seatNumber} (${form.shift})` : '🪑 Tap to select seat'}
              </Text>
            </TouchableOpacity>
          </FormField>

          <Text style={styles.sectionDivider}>FEES & PAYMENT</Text>
          <OptionGroup 
            label="Fee Status" 
            options={[{label:'Fully Paid', value:'FULLY_PAID'}, {label:'Partially Paid', value:'PARTIALLY_PAID'}]}
            current={form.feeStatus} onSelect={v => update('feeStatus', v)}
          />

          {form.feeStatus === 'PARTIALLY_PAID' && (
            <FormField label="Amount Paid" required>
              <Input value={form.paidAmount} onChangeText={v => update('paidAmount', v)} placeholder="Enter amount" keyboardType="numeric" />
            </FormField>
          )}

          <View style={styles.termsCard}>
            <Text style={styles.termsTitle}>नियम व शर्तें / Terms & Conditions</Text>
            <Text style={styles.termItem}>1. प्रतिदिन पहचान पत्र लाना अनिवार्य है।</Text>
            <Text style={styles.termItem}>2. लाईबेरी में अनावश्यक वार्तालाप न करें।</Text>
            <Text style={styles.termItem}>3. मोबाईल फोन साईलेंट मोड पर रखें एवं आवश्यक होने पर लाइब्रेरी से बाहर जाकर बात करें।</Text>
            <Text style={styles.termItem}>4. महीने के अन्तिम रविवार को लाईबेरी का अवकाश रहेगा।</Text>
            <Text style={styles.termItem}>5. अनुशासनहीनता करने पर प्रवेश निरस्त कर दिया जायेगा।</Text>
            <Text style={styles.termItem}>6. जमा फीस वापस नहीं लौटाई जायेगी।</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>✅ Confirm Registration</Text>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      <SeatPickerModal
        visible={seatModalVisible}
        onClose={() => setSeatModalVisible(false)}
        onSelect={v => update('seatNumber', v)}
        library={library}
        selectedShift={form.shift}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f8' },
  header: { backgroundColor: '#1a237e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
  backBtn: { padding: 8 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  formCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 20, elevation: 4 },
  sectionDivider: { fontSize: 11, fontWeight: '800', color: '#1a237e', letterSpacing: 1, marginBottom: 16, marginTop: 12, opacity: 0.6 },
  fieldContainer: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 8, textTransform: 'uppercase' },
  required: { color: '#f44336' },
  input: { borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fafafa', color: '#333' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  optionContainer: { marginBottom: 18 },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#eee', alignItems: 'center', backgroundColor: '#fafafa' },
  optionBtnActive: { borderColor: '#1a237e', backgroundColor: '#e8eaf6' },
  optionText: { fontSize: 13, color: '#888', fontWeight: '600' },
  optionTextActive: { color: '#1a237e', fontWeight: '700' },
  datePickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 14, backgroundColor: '#fafafa' },
  datePickerText: { fontSize: 15, color: '#333' },
  seatPicker: { borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 16, backgroundColor: '#fafafa' },
  seatPickerText: { color: '#888', fontSize: 15 },
  seatPickerSelectedText: { color: '#1a237e', fontSize: 15, fontWeight: '700' },
  seatPickerSelected: { borderColor: '#1a237e', backgroundColor: '#e8eaf6' },
  termsCard: { marginTop: 20, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#1a237e' },
  termsTitle: { fontSize: 14, fontWeight: '800', color: '#1a237e', marginBottom: 10 },
  termItem: { fontSize: 11, color: '#616161', marginBottom: 4, lineHeight: 16 },
  saveBtn: { backgroundColor: '#1a237e', marginHorizontal: 16, borderRadius: 18, padding: 18, alignItems: 'center', elevation: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  seatModal: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '85%' },
  seatModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  seatModalTitle: { fontSize: 20, fontWeight: '700', color: '#1a237e' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18 },
  zonePicker: { marginBottom: 20 },
  zonePickerTitle: { fontSize: 12, fontWeight: '800', color: '#777', marginBottom: 12, backgroundColor: '#f8f9fb', padding: 8, borderRadius: 8 },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  seatBtnFree: { backgroundColor: '#e8f5e9', borderColor: '#81c784' },
  seatBtnOcc: { backgroundColor: '#f5f5f5', borderColor: '#ddd' },
  seatBtnText: { fontSize: 15, fontWeight: '700' },
  seatBtnTextFree: { color: '#2e7d32' },
  seatBtnTextOcc: { color: '#ccc' },
});
