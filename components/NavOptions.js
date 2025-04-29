import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const App = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.time}>9:41</Text>
        <View style={styles.headerRight}>
          <Text style={styles.userName}>Desirae Levin</Text>
        </View>
      </View>
      
      {/* Main Content */}
      <ScrollView style={styles.content}>
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hi Emery.</Text>
          <Text style={styles.question}>Where do you will go?</Text>
        </View>
        
        {/* Location Selection */}
        <View style={styles.locationContainer}>
          <View style={styles.locationOption}>
            <MaterialIcons name="check-box-outline-blank" size={24} color="black" />
            <Text style={styles.locationText}>Pick up location</Text>
          </View>
          <View style={styles.locationOption}>
            <MaterialIcons name="check-box" size={24} color="black" />
            <Text style={styles.locationText}>Drop-off location</Text>
          </View>
        </View>
        
        {/* Find Drivers Button */}
        <TouchableOpacity style={styles.findDriversButton}>
          <Text style={styles.findDriversText}>Find drivers</Text>
        </TouchableOpacity>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* AV Road Section */}
        <View style={styles.avRoadContainer}>
          <Text style={styles.avRoadTitle}>A V Road</Text>
          <Text style={styles.driverName}>Kyushan Rajendra</Text>
          <Text style={styles.marketText}>Market</Text>
        </View>
        
        {/* Discount Section */}
        <View style={styles.discountContainer}>
          <Text style={styles.discountText}>Discount Saferrips activated for $10</Text>
          <Text style={styles.voucherText}>Up to $5 vouchers for pickup delays.</Text>
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* Services */}
        <View style={styles.servicesContainer}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesRow}>
            <Text style={styles.serviceItem}>Ride</Text>
            <Text style={styles.serviceItem}>Food</Text>
            <Text style={styles.serviceItem}>Grocery</Text>
            <Text style={styles.serviceItem}>Reserve</Text>
          </View>
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <Text style={styles.bottomNavText}>752x&vertical-center</Text>
          <View style={styles.bottomDivider} />
          <Text style={styles.bottomNavText}>Coupons</Text>
          <Text style={styles.bottomNavText}>History</Text>
          <Text style={styles.bottomNavText}>Settings</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#f8f8f8',
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  greetingContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  question: {
    fontSize: 18,
    color: '#555',
  },
  locationContainer: {
    marginBottom: 24,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    marginLeft: 8,
  },
  findDriversButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  findDriversText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  avRoadContainer: {
    marginBottom: 16,
  },
  avRoadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 16,
    marginBottom: 4,
  },
  marketText: {
    fontSize: 14,
    color: '#555',
  },
  discountContainer: {
    marginBottom: 16,
  },
  discountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  voucherText: {
    fontSize: 14,
    color: '#555',
  },
  servicesContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceItem: {
    fontSize: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  bottomDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
  },
  bottomNavText: {
    fontSize: 14,
    color: '#555',
  },
});

export default App;