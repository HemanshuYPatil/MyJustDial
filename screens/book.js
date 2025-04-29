import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const bookingTabs = [
  { id: 'upcoming', name: 'Upcoming' },
  { id: 'active', name: 'Active' },
  { id: 'completed', name: 'Completed' },
  { id: 'cancelled', name: 'Cancelled' },
];

const upcomingBookings = [
  {
    id: '1',
    origin: 'Akash Petrol Pump',
    destination: 'Nimani',
    date: 'Apr 12, 2025',
    time: '2:30 PM',
    price: 65.00,
    driver: 'Gaurav Kumar',
    car: 'Splender',
    status: 'confirmed',
    image: require('../assets/icon.png'),
  },
  {
    id: '2',
    origin: 'Akash Petrol Pump',
    destination: 'Nimani',
    date: 'Apr 15, 2025',
    time: '10:15 AM',
    price: 45.00,
    driver: 'Virat Kholi',
    car: 'Bus',
    status: 'scheduled',
    image: require('../assets/icon.png'),
  },
];

export default function BookingScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');

  const renderBookingItem = ({ item }) => (
    <TouchableOpacity style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={16} color="#1E3A8A" />
          <Text style={styles.dateText}>{item.date} · {item.time}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          item.status === 'confirmed' ? styles.confirmedBadge : styles.scheduledBadge
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'confirmed' ? 'Confirmed' : 'Scheduled'}
          </Text>
        </View>
      </View>
      
      <View style={styles.routeContainer}>
        <View style={styles.routeMarkers}>
          <View style={styles.originMarker} />
          <View style={styles.routeDash} />
          <View style={styles.destinationMarker} />
        </View>
        <View style={styles.routeDetails}>
          <View style={styles.locationContainer}>
            <Text style={styles.locationLabel}>Origin</Text>
            <Text style={styles.locationName}>{item.origin}</Text>
          </View>
          <View style={styles.locationContainer}>
            <Text style={styles.locationLabel}>Destination</Text>
            <Text style={styles.locationName}>{item.destination}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.separator} />
      
      <View style={styles.driverInfoContainer}>
        <Image source={item.image} style={styles.driverImage} />
        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>{item.driver}</Text>
          <Text style={styles.carDetails}>{item.car}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {bookingTabs.map((tab) => (
            <TouchableOpacity 
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text 
                style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Booking List */}
      <FlatList
        data={upcomingBookings}
        renderItem={renderBookingItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.bookingList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => {
          if (activeTab !== 'upcoming') {
            return (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="car-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>No {activeTab} bookings found</Text>
                <TouchableOpacity style={styles.bookNowButton}>
                  <Text style={styles.bookNowText}>Book a Ride</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return null;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginBottom:40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabScroll: {
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#1E3A8A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  bookingList: {
    padding: 20,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  confirmedBadge: {
    backgroundColor: '#DCFCE7',
  },
  scheduledBadge: {
    backgroundColor: '#EEF2FF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#047857',
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  routeMarkers: {
    width: 24,
    alignItems: 'center',
  },
  originMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  routeDash: {
    width: 1,
    height: 30,
    backgroundColor: '#CBD5E1',
    marginVertical: 5,
  },
  destinationMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  routeDetails: {
    flex: 1,
    marginLeft: 10,
  },
  locationContainer: {
    marginBottom: 10,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  locationName: {
    fontSize: 14,
    color: '#0F172A',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  driverInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  driverImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  driverDetails: {
    flex: 1,
    marginLeft: 10,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  carDetails: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceContainer: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    height: 46,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 20,
  },
  bookNowButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  bookNowText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
