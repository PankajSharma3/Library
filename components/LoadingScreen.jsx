import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />
      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text style={styles.logoGlyph}>📔</Text>
        </View>
        <Text style={styles.brandName}>RUDRAKSH</Text>
        <Text style={styles.brandSub}>LIBRARY MANAGEMENT</Text>
        
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#111110" />
          <Text style={styles.loadingText}>Synchronizing data...</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoGlyph: {
    fontSize: 28,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111110',
    letterSpacing: 6,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A8A8A3',
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  loaderContainer: {
    marginTop: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#6F6F6B',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default LoadingScreen;
