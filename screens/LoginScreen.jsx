import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  StatusBar, useWindowDimensions,
} from 'react-native';
import { useApp } from '../context/AppContext';

const COLORS = {
  bg: '#F5F5F0',
  surface: '#FFFFFF',
  border: '#E4E4DF',
  borderStrong: '#C9C9C2',
  textPrimary: '#111110',
  textSecondary: '#6F6F6B',
  textMuted: '#A8A8A3',
  inputBg: '#FAFAF8',
  errorBg: '#FFF1F2',
  errorBorder: '#FECDD3',
  errorText: '#9F1239',
  btnBg: '#111110',
  btnText: '#FFFFFF',
};

export default function LoginScreen() {
  const { login } = useApp();
  const { width } = useWindowDimensions();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const isWide = width > 500;
  const cardWidth = isWide ? 420 : width - 40;

  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      setError('Please enter both User ID and Password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(userId.trim(), password);
      if (!result.success) setError(result.error);
    } catch (e) {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.wrapper, { width: cardWidth }]}>

          {/* Brand Header */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Text style={styles.logoGlyph}>📔</Text>
            </View>
            <Text style={styles.brandName}>RUDRAKSH</Text>
            <Text style={styles.brandSub}>LIBRARY MANAGEMENT</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>
            <Text style={styles.cardDesc}>Enter your manager credentials to continue</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* User ID */}
            <View style={styles.field}>
              <Text style={styles.label}>User ID</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'uid' && styles.inputFocused,
                ]}
                value={userId}
                onChangeText={setUserId}
                placeholder="Enter manager ID"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                onFocus={() => setFocusedField('uid')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedField === 'pwd' && styles.inputFocused,
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('pwd')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.75}
            >
              {loading
                ? <ActivityIndicator color={COLORS.btnText} size="small" />
                : <Text style={styles.btnLabel}>Sign in</Text>
              }
            </TouchableOpacity>

            {/* Security note */}
            <Text style={styles.secNote}>🔒  Secured terminal access only</Text>
          </View>

          <Text style={styles.footer}>v2.2.0 · Library Management System</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: COLORS.bg,
  },
  wrapper: {
    alignSelf: 'center',
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoGlyph: { fontSize: 22 },
  brandName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 5,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2.5,
    marginTop: 3,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },

  // Error
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.errorText,
    fontWeight: '500',
  },

  // Fields
  field: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputFocused: {
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },

  // Password
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 46,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 16 },

  // Button
  btn: {
    backgroundColor: COLORS.btnBg,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.55 },
  btnLabel: {
    color: COLORS.btnText,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Bottom
  secNote: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 20,
  },
});