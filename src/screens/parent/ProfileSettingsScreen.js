import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/axiosConfig';
import { getImageUrl } from '../../utils/imageUtils';

const ProfileSettingsScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [profilePicUri, setProfilePicUri] = useState(user?.profilePicUrl || null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePicUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('name', name);

      if (password) {
        formData.append('password', password);
      }

      if (profilePicUri && !profilePicUri.startsWith('http')) {
        formData.append('profilePic', {
          uri: profilePicUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        });
      }

      const userId = user._id || user.id;
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`http://10.54.71.107:5001/api/users/profile/${userId}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      if (updateUser) {
        const updatedUserData = data.user || data;
        await updateUser(updatedUserData);
      }

      Alert.alert('Success', 'Profile updated!');
      setPassword('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Confirm Delete', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const userId = user._id || user.id;
            await api.delete(`/users/profile/${userId}`);
            Alert.alert('Success', 'Account deleted.');
            logout();
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to delete account.');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          {profilePicUri ? (
            <Image source={{ uri: getImageUrl(profilePicUri) }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Leave blank to keep current"
            secureTextEntry
          />
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 40,
    color: '#718096',
    fontWeight: 'bold',
  },
  changePhotoButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  changePhotoText: {
    color: '#3182CE',
    fontSize: 16,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#2D3748',
  },
  actionSection: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#3182CE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E53E3E',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#E53E3E',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileSettingsScreen;
