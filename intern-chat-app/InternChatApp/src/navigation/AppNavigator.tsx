import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text } from 'react-native';

import { AuthState, User } from '../types';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

interface Props {
  authState: AuthState;
  currentUser: User | null;
  onLogin: (user: User, token: string) => void;
  onLogout: () => void;
}

// Auth Stack for login/register
const AuthStack = ({ onLogin }: { onLogin: (user: User, token: string) => void }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        options={{ title: 'Sign In' }}
      >
        {(props) => <LoginScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
      <Stack.Screen 
        name="Register" 
        options={{ title: 'Create Account' }}
      >
        {(props) => <RegisterScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Chat Stack for chat-related screens
const ChatStack = ({ currentUser }: { currentUser: User }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ChatList"
        options={{
          title: 'Chats',
          headerLargeTitle: true,
        }}
      >
        {(props) => <ChatListScreen {...props} currentUser={currentUser} />}
      </Stack.Screen>
      <Stack.Screen
        name="Chat"
        options={({ route }) => ({
          title: route.params?.chatName || 'Chat',
          headerBackTitleVisible: false,
        })}
      >
        {(props) => <ChatScreen {...props} currentUser={currentUser} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Contacts Stack
const ContactsStack = ({ currentUser }: { currentUser: User }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ContactsList"
        options={{
          title: 'Contacts',
          headerLargeTitle: true,
        }}
      >
        {(props) => <ContactsScreen {...props} currentUser={currentUser} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Profile Stack
const ProfileStack = ({ 
  currentUser, 
  onLogout 
}: { 
  currentUser: User; 
  onLogout: () => void; 
}) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ProfileSettings"
        options={{
          title: 'Profile',
          headerLargeTitle: true,
        }}
      >
        {(props) => <ProfileScreen {...props} currentUser={currentUser} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = ({ 
  currentUser, 
  onLogout 
}: { 
  currentUser: User; 
  onLogout: () => void; 
}) => {
  const getTabBarIcon = (routeName: string, focused: boolean) => {
    let icon = '';
    switch (routeName) {
      case 'ChatsTab':
        icon = focused ? '💬' : '💭';
        break;
      case 'ContactsTab':
        icon = focused ? '👥' : '👤';
        break;
      case 'ProfileTab':
        icon = focused ? '⚙️' : '⚙';
        break;
      default:
        icon = '●';
    }
    return icon;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icon = getTabBarIcon(route.name, focused);
          return <Text style={{ fontSize: 24 }}>{icon}</Text>;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E1E5E9',
          height: Platform.OS === 'ios' ? 90 : 60,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 30 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="ChatsTab"
        options={{ title: 'Chats' }}
      >
        {() => <ChatStack currentUser={currentUser} />}
      </Tab.Screen>
      
      <Tab.Screen
        name="ContactsTab"
        options={{ title: 'Contacts' }}
      >
        {() => <ContactsStack currentUser={currentUser} />}
      </Tab.Screen>
      
      <Tab.Screen
        name="ProfileTab"
        options={{ title: 'Profile' }}
      >
        {() => <ProfileStack currentUser={currentUser} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC<Props> = ({
  authState,
  currentUser,
  onLogin,
  onLogout,
}) => {
  return (
    <NavigationContainer>
      {authState.isAuthenticated && currentUser ? (
        <MainTabs currentUser={currentUser} onLogout={onLogout} />
      ) : (
        <AuthStack onLogin={onLogin} />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;