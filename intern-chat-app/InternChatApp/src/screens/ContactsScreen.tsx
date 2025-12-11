import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { User } from '../types';
import ApiService from '../services/api';

interface Props {
  navigation: any;
  currentUser: User;
}

interface ContactItemProps {
  contact: User;
  onPress: () => void;
}

const ContactItem: React.FC<ContactItemProps> = ({ contact, onPress }) => {
  return (
    <TouchableOpacity style={styles.contactItem} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {contact.profilePhoto ? (
          <Image source={{ uri: contact.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.fullName}</Text>
        <Text style={styles.contactRole}>{contact.role}</Text>
        <Text style={styles.contactDepartment}>{contact.department}</Text>
        <Text style={styles.contactEmail}>{contact.email}</Text>
      </View>
      
      <TouchableOpacity style={styles.messageButton}>
        <Text style={styles.messageButtonText}>💬</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const ContactsScreen: React.FC<Props> = ({ navigation, currentUser }) => {
  const [contacts, setContacts] = useState<User[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadContacts = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      console.log('Loading contacts...');
      const response = await ApiService.getColleagues();
      
      if (response.error) {
        console.error('Load contacts error:', response.error);
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.colleagues) {
        console.log('Loaded contacts:', response.data.colleagues.length);
        const allContacts = response.data.colleagues;
        setContacts(allContacts);
        setFilteredContacts(allContacts);
      }
    } catch (error) {
      console.error('Load contacts error:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    
    if (!text.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(contact =>
      contact.fullName.toLowerCase().includes(text.toLowerCase()) ||
      contact.email.toLowerCase().includes(text.toLowerCase()) ||
      contact.role.toLowerCase().includes(text.toLowerCase()) ||
      contact.department.toLowerCase().includes(text.toLowerCase())
    );
    
    setFilteredContacts(filtered);
  };

  const handleContactPress = async (contact: User) => {
    try {
      console.log('Starting chat with:', contact.fullName);
      
      // Create or get existing chat
      const response = await ApiService.createChat({
        type: 'individual',
        participantId: contact._id,
      });
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data && response.data.chat) {
        // Navigate to chat
        navigation.navigate('ChatsTab', {
          screen: 'Chat',
          params: {
            chatId: response.data.chat._id,
            chatName: contact.fullName,
          },
        });
      }
    } catch (error) {
      console.error('Create chat error:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const renderContact = ({ item }: { item: User }) => (
    <ContactItem
      contact={item}
      onPress={() => handleContactPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>👥</Text>
      <Text style={styles.emptyStateTitle}>
        {searchText ? 'No contacts found' : 'No contacts yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchText 
          ? 'Try adjusting your search terms'
          : 'Your colleagues will appear here once they join the system'
        }
      </Text>
    </View>
  );

  // Group contacts by department
  const groupedContacts = filteredContacts.reduce((groups: { [key: string]: User[] }, contact) => {
    const dept = contact.department || 'Unknown Department';
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(contact);
    return groups;
  }, {});

  const sections = Object.keys(groupedContacts)
    .sort()
    .map(department => ({
      title: department,
      data: groupedContacts[department].sort((a, b) => a.fullName.localeCompare(b.fullName))
    }));

  const renderSection = ({ item: section }: { item: any }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <FlatList
        data={section.data}
        renderItem={renderContact}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
      </View>

      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.title}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadContacts(true)}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredContacts.length === 0 ? styles.emptyListContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  contactDepartment: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#8e8e93',
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ContactsScreen;