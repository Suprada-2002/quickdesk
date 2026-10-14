import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('quickdesk_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('quickdesk_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem('quickdesk_token');
      if (storedToken) {
        try {
          const freshUser = await api.auth.getMe();
          setUser(freshUser);
          localStorage.setItem('quickdesk_user', JSON.stringify(freshUser));
          getSocket(); // Initialize socket with current token
        } catch (err) {
          console.warn('Session expired, logging out:', err);
          logout();
        }
      }
      setLoading(false);
    }

    verifySession();

    // Listen for storage / auth events
    const handleAuthChange = () => {
      setToken(localStorage.getItem('quickdesk_token'));
      const storedUser = localStorage.getItem('quickdesk_user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    window.addEventListener('quickdesk_auth_change', handleAuthChange);
    return () => window.removeEventListener('quickdesk_auth_change', handleAuthChange);
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem('quickdesk_token', data.access_token);
    localStorage.setItem('quickdesk_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    getSocket();
    return data.user;
  };

  const register = async (userData) => {
    await api.auth.register(userData);
    return login(userData.email, userData.password);
  };

  const logout = () => {
    localStorage.removeItem('quickdesk_token');
    localStorage.removeItem('quickdesk_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAgent: user?.role === 'agent',
        isEmployee: user?.role === 'employee',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
