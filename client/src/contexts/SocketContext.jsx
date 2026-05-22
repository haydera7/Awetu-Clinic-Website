import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const { user } = useAuth();

  const hasWelcomed = React.useRef(false);

  const showToast = (message, type = 'info', onConfirm = null) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, onConfirm }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data.map(n => ({
          id: n._id,
          text: n.message,
          time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: n.type || 'info',
          unread: !n.isRead
        })));
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    if (user) {
      fetchNotifications();
      const newSocket = io('http://localhost:3000');
      setSocket(newSocket);

      if (!hasWelcomed.current) {
        showToast(`Welcome back, ${user.name}! System is ready.`, 'info');
        hasWelcomed.current = true;
      }

      // Register Online Status
      newSocket.emit('register-online', {
        userId: user._id || user.id,
        name: user.name,
        role: user.role
      });

      // Join rooms
      // EVERYONE joins their personal user room to receive private alerts
      newSocket.emit('join-user-room', user._id || user.id);

      // Staff also join role-based rooms
      if (user.role !== 'Patient') {
        newSocket.emit('join-role-room', user.role);
        if (user.department && user.department !== 'General') {
          newSocket.emit('join-role-room', user.department);
        }
      }

      // Listen for notifications
      newSocket.on('notification', (data) => {
        setNotifications(prev => [
          {
            id: data.id,
            text: data.message,
            time: new Date(data.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: data.type || 'info',
            unread: true
          },
          ...prev
        ]);
        
        // Show toast for real-time notifications
        showToast(data.message, data.type || 'info');
      });

      // Listen for online users
      newSocket.on('online-users', (users) => {
        setOnlineUsers(users);
      });

      return () => newSocket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [user]);

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      showToast('Failed to clear notifications', 'error');
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (message, type = 'info') => {
    setNotifications(prev => [
      {
        id: Date.now(),
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type,
        unread: true
      },
      ...prev
    ]);
    showToast(message, type);
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, onlineUsers, toasts, showToast, removeToast, markAllAsRead, clearNotifications, addNotification }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
