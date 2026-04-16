import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>✨ BrightSteps</Text>
      <ActivityIndicator size="large" color="#E85C45" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFCF5', // Your signature paper background
  },
  logoText: {
    fontSize: 36,
    fontFamily: 'System', // We will add custom fonts later
    fontWeight: '900',
    color: '#1E1007',
  }
});