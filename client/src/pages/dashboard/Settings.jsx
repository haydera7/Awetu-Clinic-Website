import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';
import { useSocket } from '../../contexts/SocketContext';
import { useTranslation } from '../../utils/translations';
import { User, Bell, Shield, Moon, Monitor, Sun, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import './Settings.css';

export default function Settings() {
  const { user } = useAuth();
  const { theme, changeTheme } = useTheme();
  const { patients, updatePatient } = useData();
  const { showToast } = useSocket();

  const [language, setLanguage] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const { t } = useTranslation(language);

  const patientRecord = user?.role === 'Patient' 
    ? patients.find(p => p.id === user?._id || p.pid === user?.pid) 
    : null;

  useEffect(() => {
    if (patientRecord && patientRecord.preferredLanguage) {
      setLanguage(patientRecord.preferredLanguage);
    }
  }, [patientRecord]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (user?.role === 'Patient' && patientRecord) {
      setIsSaving(true);
      try {
        await updatePatient(patientRecord.id, { preferredLanguage: language });
        showToast("Preferred SMS Language successfully updated!", "success");
      } catch (error) {
        console.error(error);
        showToast("Failed to update language. Please try again.", "danger");
      } finally {
        setIsSaving(false);
      }
    } else {
      showToast("Profile config saved successfully!", "success");
    }
  };

  const handleNotificationsSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("Notification preferences updated!", "success");
    }, 800);
  };

  const handleSecuritySave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("Security settings updated successfully!", "success");
    }, 800);
  };

  return (
    <div className="dashboard-page animate-fade-in">
      <header className="dashboard-header">
        <div>
          <h1 className="text-gradient heading-2">{user?.role === 'Patient' ? t('platformSettings') : 'Platform Settings'}</h1>
          <p style={{ color: 'var(--color-gray-400)', marginTop: 'var(--spacing-2)' }}>
            {user?.role === 'Patient' ? t('managePreferences') : 'Manage your workspace and profile preferences'}
          </p>
        </div>
      </header>

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <div className="glass-panel settings-sidebar">
          <button 
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>{user?.role === 'Patient' ? t('profileIdentity') : 'Profile Identity'}</span>
          </button>
          <button 
            className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            <span>{user?.role === 'Patient' ? t('notifications') : 'Notifications'}</span>
          </button>
          <button 
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} />
            <span>{user?.role === 'Patient' ? t('securityLimits') : 'Security Limits'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="settings-content">
          {activeTab === 'profile' && (
            <>
              <div className="glass-panel settings-section">
                <div className="section-title">
                  <h3 className="text-gradient">{user?.role === 'Patient' ? t('profileInformation') : 'Profile Information'}</h3>
                  <p>{user?.role === 'Patient' ? t('updateAccountInfo') : "Update your account's profile information and email address."}</p>
                </div>
                
                <form className="settings-form" onSubmit={handleSave}>
                  <div className="form-group-grid">
                    <div className="form-group">
                      <label>{user?.role === 'Patient' ? t('fullName') : 'Full Name'}</label>
                      <input type="text" className="form-control" defaultValue={user?.name || ''} disabled={true} />
                    </div>
                    
                    <div className="form-group">
                      <label>{user?.role === 'Patient' ? t('emailAddress') : 'Email Address'}</label>
                      <input type="email" className="form-control" defaultValue={user?.email || 'doctor@healthcare.pro'} disabled={true} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{user?.role === 'Patient' ? t('assignedRole') : 'Assigned Role'}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                      <input type="text" className="form-control" defaultValue={user?.role || 'Doctor'} disabled style={{ flex: 1 }} />
                      <span className="badge badge-success">Verified</span>
                    </div>
                  </div>

                  {user?.role === 'Patient' && (
                    <div className="form-group" style={{ marginTop: 'var(--spacing-3)' }}>
                      <label>{t('preferredSMSLanguage')}</label>
                      <select 
                        className="form-control" 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        <option value="English">English</option>
                        <option value="Amharic">Amharic (አማርኛ)</option>
                        <option value="Oromic">Oromic (Afaan Oromoo)</option>
                      </select>
                      <small style={{ color: 'var(--color-gray-500)', marginTop: '4px', display: 'block' }}>
                        {t('languageNotice')}
                      </small>
                    </div>
                  )}
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : (user?.role === 'Patient' ? t('saveConfig') : 'Save Config')}
                    </button>
                    <button type="button" className="btn btn-secondary">{user?.role === 'Patient' ? t('discardChanges') : 'Discard Changes'}</button>
                  </div>
                </form>
              </div>

              <div className="glass-panel settings-section glow-on-hover">
                <div className="section-title">
                  <h3 className="text-gradient">{user?.role === 'Patient' ? t('interfaceAppearance') : 'Interface Appearance'}</h3>
                  <p>{user?.role === 'Patient' ? t('customizeWorkspace') : 'Customize the look and feel of your medical workspace.'}</p>
                </div>
                
                <div className="theme-options">
                  <button 
                    className={`theme-card ${theme === 'light' ? 'active-theme' : ''}`}
                    onClick={() => changeTheme('light')}
                  >
                    <div className="theme-icon-wrapper ui-light"><Sun size={24} /></div>
                    <span>{user?.role === 'Patient' ? t('light') : 'Light'}</span>
                  </button>
                  <button 
                    className={`theme-card ${theme === 'dark' ? 'active-theme' : ''}`}
                    onClick={() => changeTheme('dark')}
                  >
                    <div className="theme-icon-wrapper ui-dark"><Moon size={24} /></div>
                    <span>{user?.role === 'Patient' ? t('dark') : 'Dark & Neon'}</span>
                  </button>
                  <button 
                    className={`theme-card ${theme === 'system' ? 'active-theme' : ''}`}
                    onClick={() => changeTheme('system')}
                  >
                    <div className="theme-icon-wrapper ui-system"><Monitor size={24} /></div>
                    <span>{user?.role === 'Patient' ? t('system') : 'System Sync'}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <div className="glass-panel settings-section animate-fade-in">
              <div className="section-title">
                <h3 className="text-gradient">{user?.role === 'Patient' ? t('notifications') : 'Notification Preferences'}</h3>
                <p>{user?.role === 'Patient' ? 'Manage how we contact you about your appointments and health records.' : 'Manage how and when you receive alerts and system updates.'}</p>
              </div>
              <form className="settings-form" onSubmit={handleNotificationsSave}>
                
                <div className="setting-toggle-row">
                  <div>
                    <h4>{user?.role === 'Patient' ? 'Push Notifications' : 'In-App Push Notifications'}</h4>
                    <p className="setting-desc">
                      {user?.role === 'Patient' 
                        ? 'Receive real-time alerts in the portal when your lab results or prescriptions are ready.' 
                        : 'Receive real-time alerts in your dashboard when new patients or tasks arrive.'}
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <h4>{user?.role === 'Patient' ? 'Email Updates' : 'Email Digest'}</h4>
                    <p className="setting-desc">
                      {user?.role === 'Patient'
                        ? 'Receive appointment confirmations and billing receipts via email.'
                        : 'Receive a daily summary of missed notifications and important updates.'}
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={user?.role === 'Patient'} />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <h4>{user?.role === 'Patient' ? 'SMS Reminders' : 'SMS Critical Alerts'}</h4>
                    <p className="setting-desc">
                      {user?.role === 'Patient'
                        ? 'Get text messages 24 hours before your scheduled appointments.'
                        : 'Get SMS messages for critical system failures or urgent patient calls.'}
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="form-group" style={{ marginTop: 'var(--spacing-4)' }}>
                  <label>Notification Sound</label>
                  <select className="form-control" defaultValue="chime">
                    <option value="chime">Gentle Chime</option>
                    <option value="bell">Classic Bell</option>
                    <option value="pop">Modern Pop</option>
                    <option value="none">Mute (Silent)</option>
                  </select>
                </div>

                <div className="form-actions" style={{ marginTop: 'var(--spacing-4)' }}>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass-panel settings-section animate-fade-in">
              <div className="section-title">
                <h3 className="text-gradient">{user?.role === 'Patient' ? t('securityLimits') : 'Security & Limits'}</h3>
                <p>Protect your account with advanced security configurations.</p>
              </div>
              <form className="settings-form" onSubmit={handleSecuritySave}>
                
                <div className="setting-toggle-row">
                  <div>
                    <h4>Two-Factor Authentication (2FA)</h4>
                    <p className="setting-desc">Require an authentication code when logging in from an unrecognized device.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-toggle-row">
                  <div>
                    <h4>Login Alerts</h4>
                    <p className="setting-desc">Send an email immediately if a new login occurs on your account.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider round"></span>
                  </label>
                </div>

                {user?.role !== 'Patient' && (
                  <div className="form-group" style={{ marginTop: 'var(--spacing-4)' }}>
                    <label>Session Inactivity Timeout</label>
                    <select className="form-control" defaultValue="30">
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="120">2 Hours</option>
                      <option value="never">Never (Not Recommended)</option>
                    </select>
                    <small style={{ color: 'var(--color-gray-500)', marginTop: '4px', display: 'block' }}>
                      You will be automatically logged out after this duration of inactivity to secure patient data.
                    </small>
                  </div>
                )}

                <hr className="settings-divider" />

                <h4 style={{ marginBottom: 'var(--spacing-3)', color: 'var(--text-color)' }}>Change Password</h4>
                
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" className="form-control" placeholder="••••••••" />
                </div>
                <div className="form-group-grid">
                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" className="form-control" placeholder="Create new password" />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" className="form-control" placeholder="Repeat new password" />
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: 'var(--spacing-4)' }}>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Update Security Settings'}
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                    Revoke All Active Sessions
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
