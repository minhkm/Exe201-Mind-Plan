import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Save token to storage
export const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

// Get token from storage
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Remove token from storage
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Save user data to storage
export const saveUser = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

// Get user data from storage
export const getUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Check if token is valid by calling the backend
export const validateToken = async (): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) return false;

    const { apiCall, API_ENDPOINTS } = await import('@/constants/api');

    const response = await apiCall(API_ENDPOINTS.AUTH.PROFILE, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return !!response.user;
  } catch (error) {
    console.error('Token validation failed:', error);
    // If token is invalid, remove it
    await removeToken();
    return false;
  }
};

// Check if user is logged in with valid token
export const isLoggedIn = async (): Promise<boolean> => {
  const token = await getToken();
  if (!token) return false;

  return await validateToken();
};