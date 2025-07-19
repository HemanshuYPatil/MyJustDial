import React, { useEffect } from "react";
import { Provider } from "react-redux";
import store from "./store";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  ThemeProvider,
  useTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createStackNavigator } from "@react-navigation/stack";
import * as Sentry from "sentry-expo";
import AppNavigator from "./screens/AppNavigator";
import SplashScreens from "./screens/welcone";
import ProfileScreen from "./screens/profile";
import DestinationSearchScreen from "./screens/searchuser.js";
import TripCreationScreen from "./screens/create.js";
import SignUpScreen from "./screens/auth/phone-auth.js";

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
import "./lib/db/firebase.js";
import SignInScreen from "./screens/auth/phone-verify.js";

import { Linking, View } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";

import MyFavouritesScreen from "./screens/favourites.js";
import { navigationRef } from "./lib/external/navigation.js";



const Stack = createStackNavigator();

export default function App() {
  Sentry.init({
    dsn: "https://d4ea2a899f8ed6014fc1958e9a6f3ed0@o4509591516348416.ingest.us.sentry.io/4509591518052352",
    enableInExpoDevelopment: true,
    debug: false, // turn off in production
  });
  // Handle notification when received
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, // 👈 THIS shows the notification on screen
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const Drawer = createDrawerNavigator();

  function DrawerScreens() {
    return (
      <Drawer.Navigator screenOptions={{ headerShown: false }}>
        <Drawer.Screen name="Home" component={AppNavigator} />
      </Drawer.Navigator>
    );
  }

  const linking = {
    prefixes: ["https://puspendustudio.com", "https://pathshare.page.link"],
    config: {
      screens: {
        TripUserDetails: "trip/:tripId",
      },
    },
  };

  useEffect(() => {
    const handleDeepLink = async (url) => {
      const parsed = Linking.parse(url);
      if (parsed.path?.startsWith("trip/")) {
        const tripId = parsed.path.split("/")[1];
        if (tripId) {
          try {
            const docRef = doc(db, "trips", tripId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const tripData = snap.data();
              navigate("TripUserDetails", {
                userId: tripData.userId,
                pickupLocation:
                  tripData.startlocationName?.split(",")[0] || "Pickup",
                destinationLocation:
                  tripData.endlocationName?.split(",")[0] || "Drop",
                tripId: tripId,
                tripData: tripData,
              });
            }
          } catch (e) {
            console.error("Deep link fetch error:", e);
          }
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      sub.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Provider store={store}>
        <NavigationContainer linking={linking} ref={navigationRef}>

          <SafeAreaProvider>
            <Stack.Navigator>
              <Stack.Screen
                name="GetStarted"
                component={SplashScreens}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Home"
                component={AppNavigator}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="login"
                component={SignInScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="signup"
                component={SignUpScreen}
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
                name="Fav"
                component={MyFavouritesScreen}
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
                name="My-Trips"
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
                name="Detailsasaasasasasasas"
                component={TripDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EditUserProfile"
                component={EditProfileScreen}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="Developer"
                component={DeveloperDetailsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Support"
                component={Support}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </SafeAreaProvider>
        </NavigationContainer>
      </Provider>
    </View>
  );
}
