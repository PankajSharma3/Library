import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider, useApp } from './context/AppContext';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import LibraryDetailScreen from './screens/LibraryDetailScreen';
import AddStudentScreen from './screens/AddStudentScreen';
import LoadingScreen from './components/LoadingScreen';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { isLoggedIn, isLoading } = useApp();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="LibraryDetail" component={LibraryDetailScreen} />
            <Stack.Screen name="AddStudent" component={AddStudentScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Navigation />
      <StatusBar style="auto" />
    </AppProvider>
  );
}
