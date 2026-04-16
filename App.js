import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    // We wrap the whole app in AuthProvider so every screen knows if the user is logged in
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}