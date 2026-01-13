import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { User, Profile, UserRole } from '@/types/pharmacy';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, mobile: string) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  verifyMobile: (mobile: string, otp: string) => Promise<{ error: Error | null }>;
  resendOTP: (mobile: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        const userData = response.data;
        // Handle MongoDB _id field
        const userId = userData.id || userData._id || '';
        setUser({
          id: userId,
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
          role: userData.role as UserRole,
        });
        setProfile({
          id: userId,
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
          role: userData.role as UserRole,
        });
        setUserRole(userData.role as UserRole);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // If unauthorized, clear tokens
      apiClient.clearTokens();
      setUser(null);
      setProfile(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if we have tokens stored
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      const response = await apiClient.login(email, password);
      console.log('Login response:', response);
      
      if (response.success && response.data) {
        const userData = response.data.user;
        console.log('Login successful, user data:', userData);
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
          role: userData.role as UserRole,
        });
        setProfile({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
          role: userData.role as UserRole,
        });
        setUserRole(userData.role as UserRole);
        return { error: null };
      } else {
        console.error('Login failed:', response.message);
        return { error: new Error(response.message || 'Login failed') };
      }
    } catch (error: any) {
      console.error('Login exception:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, mobile: string) => {
    try {
      const response = await apiClient.register({
        name: fullName,
        email,
        mobile,
        password,
        role: 'cashier', // Default role
      });
      if (response.success) {
        return { error: null, data: response.data };
      } else {
        return { error: new Error(response.message || 'Registration failed') };
      }
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const verifyMobile = async (mobile: string, otp: string) => {
    try {
      const response = await apiClient.verifyMobile({ mobile, otp });
      if (response.success) {
        return { error: null };
      } else {
        return { error: new Error(response.message || 'Verification failed') };
      }
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const resendOTP = async (mobile: string) => {
    try {
      const response = await apiClient.resendOTP(mobile);
      if (response.success) {
        return { error: null };
      } else {
        return { error: new Error(response.message || 'Failed to resend OTP') };
      }
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      setProfile(null);
      setUserRole(null);
    }
  };

  const hasRole = (role: UserRole) => {
    return userRole === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userRole,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        verifyMobile,
        resendOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
