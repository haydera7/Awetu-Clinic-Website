import { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, CheckCheck, Trash2, BellOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useData } from '../../contexts/DataContext';
import './Notifications.css';

export default function DashboardNavbar({ onMenuToggle }) {
  const { user } = useAuth();
  const { notifications, markAllAsRead, clearNotifications } = useSocket();
  const { isSyncing, isOffline, pendingSyncCount, handleSync } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="dashboard-navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <Menu size={20} />
        </button>
        <div className="search-bar">
          <Search size={18} color="var(--color-gray-500)" />

          <input type="text" className="search-input" placeholder="Search patients, doctors..." />
        </div>
      </div>

      <div className="navbar-right">
        {/* Sync Status Indicator */}
        <div className="sync-status-badge">
          {isSyncing ? (
            <div className="sync-indicator syncing">
              <RefreshCw size={16} className="spin-animation" />
              <span>Syncing Data...</span>
            </div>
          ) : isOffline ? (
            <div className="sync-indicator offline">
              <CloudOff size={16} />
              <span>Offline Mode</span>
            </div>
          ) : pendingSyncCount > 0 ? (
            <div className="sync-indicator alert" onClick={handleSync} title="Click to sync pending items">
              <RefreshCw size={16} />
              <span>{pendingSyncCount} Pending Sync</span>
            </div>
          ) : (
            <div className="sync-indicator online">
              <Cloud size={16} />
              <span>Cloud Connected</span>
            </div>
          )}
        </div>

        <div className="notification-wrapper" ref={notificationRef}>
          <button
            className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) {
                // Optionally mark as read when opened
                // markAllAsRead(); 
              }
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-badge animate-bounce-in">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h4>Recent Alerts</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="mark-read-btn" onClick={markAllAsRead}>
                    <CheckCheck size={14} style={{ marginRight: '4px' }} />
                    Read All
                  </button>
                  <button className="mark-read-btn" style={{ color: 'var(--color-danger)' }} onClick={clearNotifications}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${notification.unread ? 'unread' : ''}`}
                    >
                      {notification.unread && <div className="notification-dot" />}
                      <div className="notification-content">
                        <p className="notification-text">{notification.text}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-notifications">
                    <BellOff size={32} strokeWidth={1.5} />
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-profile">
          <div className="avatar" style={{ background: user?.avatarColor || 'var(--color-primary)' }}>
            {getInitials(user?.name)}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">
              {(user?.department && user?.department !== 'Doctor' && user?.department !== 'General') 
                ? user?.department 
                : user?.role}
            </span>
          </div>
          <ChevronDown size={16} color="var(--color-gray-500)" />
        </div>
      </div>
    </header>
  );
}
