import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import RegisterScreen from '../screens/auth/Register';
import FocusMatchScreen from '../screens/student/FocusMatch';
import ShapeSortScreen from '../screens/student/ShapeSort';
import EmotionExplorerScreen from '../screens/student/EmotionExplorer';

// Import ALL screens
import LoginScreen from '../screens/auth/Login';
import SplashScreen from '../screens/auth/Splash';
import WelcomeScreen from '../screens/auth/Welcome';
import ParentDashboard from '../screens/parent/ParentDashboard';
import GameHubScreen from '../screens/student/GameHub';
import StudentDashboard from '../screens/student/StudentDashboard';
import ProfileSettingsScreen from '../screens/parent/ProfileSettingsScreen';
import TeacherDashboardTabs from './TeacherDashboardTabs';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading, logout } = useContext(AuthContext);

  // 1. Show Splash Screen while checking storage
  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          // 2. USER IS LOGGED OUT (Auth Flow)
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // 3. USER IS LOGGED IN
          <>
            {(user.role === 'student' || user.role === 'parent') && (
              <>
                <Stack.Screen name="Dashboard" component={StudentDashboard} />
                <Stack.Screen name="StudentHub" component={GameHubScreen} />
                <Stack.Screen name="FocusMatch" component={FocusMatchScreen} />
                <Stack.Screen name="ShapeSort" component={ShapeSortScreen} />
                <Stack.Screen name="EmotionExplorer" component={EmotionExplorerScreen} />
                <Stack.Screen name="ParentHub" component={ParentDashboard} />
              </>
            )}

            {user.role === 'teacher' && (
              <Stack.Screen name="DashboardMain" component={TeacherDashboardTabs} options={{ title: 'Bright Steps' }} />
            )}
            
            {/* Global Settings Pages accessible to ANY logged in user */}
            <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} options={{ title: 'Profile Setup' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}