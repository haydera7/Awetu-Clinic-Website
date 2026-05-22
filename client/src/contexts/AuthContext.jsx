import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount and refresh profile
  useEffect(() => {
    const savedUser = localStorage.getItem('healthcare-user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      
      // Refresh user data from server in background to get latest department/role
      api.get('/auth/me').then(res => {
        const updatedUser = { ...parsedUser, ...res.data };
        setUser(updatedUser);
        localStorage.setItem('healthcare-user', JSON.stringify(updatedUser));
      }).catch(err => {
        console.warn("Could not refresh user profile", err);
      });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const userData = res.data;
      
      setUser(userData);
      localStorage.setItem('healthcare-user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Authentication failed. Please check your credentials.' 
      };
    }
  };

  const googleLogin = async (credential) => {
    try {
      const res = await api.post('/auth/google', { token: credential });
      const userData = res.data;
      
      setUser(userData);
      localStorage.setItem('healthcare-user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error.response?.data?.message || error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Google authentication failed.' 
      };
    }
  };

  const patientLogin = async (pid, name) => {
    try {
      const res = await api.post('/auth/patient-login', { pid, name });
      const userData = res.data;
      
      setUser(userData);
      localStorage.setItem('healthcare-user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      console.error('Patient login error:', error.response?.data?.message || error.message);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Patient verification failed. Check ID and Name.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('healthcare-user');
    sessionStorage.removeItem('dashboard-loaded');
  };

  return (
    <AuthContext.Provider value={{ user, login, googleLogin, patientLogin, logout, isLoading: loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
