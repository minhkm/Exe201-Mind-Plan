import { router } from 'expo-router';
import { removeToken } from './tokenStorage';

export const logout = async (): Promise<void> => {
  try {
    await removeToken();
    router.replace('/auth/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};