import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ResourceLibraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Resource Library Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFCF8' },
  text: { fontSize: 20, fontWeight: 'bold', color: '#1E1007' }
});
