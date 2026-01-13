import { apiClient } from './api';

/**
 * Test the connection to the backend API
 * @returns Promise<boolean> - true if connection is successful
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    const response = await fetch(
      import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000/health'
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.success === true;
    }
    return false;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
}

/**
 * Check if user is authenticated
 * @returns Promise<boolean> - true if user has valid token
 */
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const response = await apiClient.getCurrentUser();
    return response.success === true;
  } catch (error) {
    return false;
  }
}
