import React from "react";
import { Provider } from "react-redux";
import store from "./store";
import { DarkTheme, DefaultTheme, NavigationContainer, ThemeProvider, useTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createStackNavigator } from "@react-navigation/stack";
// import AppNavigator from './screens/AppNavigator';

import AppNavigator from "./screens/AppNavigator";
import Welcome from "./screens/welcone";
import ProfileScreen from "./screens/profile";
import DestinationSearchScreen from "./screens/searchuser.js";
import TripCreationScreen from "./screens/create.js";
import SignUpScreen from "./screens/auth/phone-auth.js";
import VerificationCodeScreen from "./screens/auth/phone-verify.js";
import NewSignUp from "./screens/auth/newsignup.js";
import UserDetailsScreen from "./screens/other/detailspage.js";
import NotificationScreen from "./screens/notifications.js";
import SearchResultsScreen from "./screens/searchresult.js";
import * as Notifications from "expo-notifications";
import MyTripsScreen from "./screens/my-trips.js";
import ChatListScreen from "./screens/other/chat/list.js";
import ChatDetailScreen from "./screens/other/chat/chat.js";
import TripDetailScreen from "./screens/other/tripdetail.js";
import EditProfileScreen from "./screens/edituserprofile.js";
import LanguageScreen from "./screens/settings/language.js";
import { LanguageProvider } from "./context/languagecontext.js";
import DeveloperDetailsScreen from "./screens/settings/developer.js";
import Support from "./screens/settings/support.js";


const Stack = createStackNavigator();

export default function App() {
  // Handle notification when received
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, // 👈 THIS shows the notification on screen
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });


  

  return (
      <Provider store={store}>
        <NavigationContainer >
          <SafeAreaProvider>
            <Stack.Navigator>
              <Stack.Screen
                name="GetStarted"
                component={Welcome}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Verify"
                component={VerificationCodeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="signup"
                component={SignUpScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Home"
                component={AppNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Search"
                component={DestinationSearchScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Create"
                component={TripCreationScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="NewSignUp"
                component={NewSignUp}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TripUserDetails"
                component={UserDetailsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SearchResults"
                component={SearchResultsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="d"
                component={SearchResultsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MyTrips"
                component={MyTripsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ChatLists"
                component={ChatListScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ChatDetail"
                component={ChatDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TripDetails"
                component={TripDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EditUserProfile"
                component={EditProfileScreen}
                options={{ headerShown: false }}
              />
              
              <Stack.Screen name="Developer" component={DeveloperDetailsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Support" component={Support} options={{ headerShown: false }} />
           
            </Stack.Navigator>
          </SafeAreaProvider>
        </NavigationContainer>
      </Provider>
  );
}
