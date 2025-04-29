import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, AntDesign, FontAwesome5, Feather } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';

import HomeScreen from './HomeScreen';
import BookingsScreen from './book';
import ProfileScreen from './profile';
import DestinationSearchScreen from './searchuser';
import TripCreationScreen from './create';
import MyTripsScreen from './my-trips';
import ChatListScreen from './other/chat/list';

const fonts = {
  regular: 'Regular',
  medium: 'Medium',
  bold: 'Bold',
};




const Tab = createBottomTabNavigator();

const CustomTabBarButton = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.plusButtonContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.plusButton}>
        <AntDesign name="plus" size={24} color="white" />
      </View>
    </TouchableOpacity>
  );
};

const AppNavigator = () => {
  const [fontsLoaded] = useFonts({
    Regular: require('../assets/fonts/regular.ttf'),
    Medium: require('../assets/fonts/medium.ttf'),
    Bold: require('../assets/fonts/bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const color = focused ? 'black' : '#aaa';
          if (route.name === 'Home') {
            return <Ionicons name="home" size={24} color={color} />;
          } else if (route.name === 'Services') {
            return <Ionicons name="grid" size={24} color={color} />;
          } else if (route.name === 'My-Trips') {
            return <FontAwesome5 name="history" size={22} color={color} />;
          } else if (route.name === 'Account') {
            return <Feather name="user" size={24} color={color} />;
          }
          else if (route.name === 'Chat') {
            return <Ionicons name="chatbubble-ellipses" size={24} color={color} />;
          }
          return null;
        },
        tabBarLabel: ({ focused }) => {
          const color = focused ? 'black' : '#aaa';
          let label = '';

          if (route.name === 'Home') label = 'Home';
          else if (route.name === 'Services') label = 'Services';
          else if (route.name === 'Activity') label = 'Activity';
          else if (route.name === 'Account') label = 'Account';
          else if (route.name === 'Chat') label = 'Chat';
          else if (route.name === 'My-Trips') label = 'My Trips';
          else return null;

          return (
            <Text style={{
              color,
              fontSize: 12,
              marginTop: 3,
              fontFamily: fonts.medium
            }}>
              {label}
            </Text>
          );
        },
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          height: 65,
          paddingBottom: 5,
          paddingTop: 5,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          padding: 10
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen } />
      {/* <Tab.Screen name="Services" component={BookingsScreen} /> */}
      <Tab.Screen name="Chat" component={ChatListScreen} />

      <Tab.Screen 
        name="Create" 
        component={TripCreationScreen} 
        options={{
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen name="My-Trips" component={MyTripsScreen} />

      {/* <Tab.Screen name="Activity" component={BookingsScreen} /> */}
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  plusButtonContainer: {
    position: 'relative',
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    top: -15,
  },
  plusButton: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default AppNavigator;
