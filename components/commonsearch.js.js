import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar,
  TextInput,
  FlatList,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Recent search history items
const recentSearches = [
  { id: '1', term: 'design consultant' },
  { id: '2', term: 'motion design' },
  { id: '3', term: 'product designer' },
];

export default function CommonSearchScreen() {
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const handleFocus = () => {
    setShowCancel(true);
  };

  const handleBlur = () => {
    if (searchTerm === '') {
      setShowCancel(false);
    }
  };

  const handleCancel = () => {
    setSearchTerm('');
    setShowCancel(false);
  };

  const renderSearchItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.searchHistoryItem}
      onPress={() => setSearchTerm(item.term)}
    >
      <Ionicons name="time-outline" size={20} color="#64748B" />
      <Text style={styles.searchHistoryText}>{item.term}</Text>
      <TouchableOpacity style={styles.clearButton}>
        <Ionicons name="close" size={18} color="#64748B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#64748B" />
            <TextInput 
              placeholder="Describe what you're looking for..."
              style={styles.searchInput}
              placeholderTextColor="#64748B"
              value={searchTerm}
              onChangeText={setSearchTerm}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoFocus
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>

      <View style={styles.recentSearchesContainer}>
        <FlatList
          data={recentSearches}
          renderItem={renderSearchItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#0F172A',
  },
  cancelButton: {
    marginLeft: 10,
    paddingHorizontal: 5,
  },
  cancelText: {
    color: '#0F172A',
    fontSize: 16,
  },
  recentSearchesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchHistoryText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  clearButton: {
    padding: 5,
  },
});