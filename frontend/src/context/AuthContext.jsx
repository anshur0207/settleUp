import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('settleup_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    setUser(userData.user || userData);
    if (userData.token) {
      localStorage.setItem('settleup_token', userData.token);
    }
    localStorage.setItem('settleup_user', JSON.stringify(userData.user || userData));
    navigate('/dashboard');
  };

  const updateUser = (updates) => {
    const nextUser = { ...user, ...updates };
    localStorage.setItem('settleup_user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    }
    setUser(null);
    localStorage.removeItem('settleup_user');
    localStorage.removeItem('settleup_token');
    navigate('/login');
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      // Clear local state if backend says cookie is invalid/expired
      localStorage.removeItem('settleup_user');
      localStorage.removeItem('settleup_token');
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const value = { user, login, updateUser, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
