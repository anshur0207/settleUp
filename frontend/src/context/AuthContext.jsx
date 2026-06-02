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

  const login = ({ user: authUser }) => {
    localStorage.setItem('settleup_user', JSON.stringify(authUser));
    setUser(authUser);
  };

  const updateUser = (updates) => {
    const nextUser = { ...user, ...updates };
    localStorage.setItem('settleup_user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      await api.post('auth/logout');
    } catch (err) {
      console.error('Logout API failed:', err);
    }
    localStorage.removeItem('settleup_user');
    setUser(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      // Clear local state if backend says cookie is invalid/expired
      localStorage.removeItem('settleup_user');
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
