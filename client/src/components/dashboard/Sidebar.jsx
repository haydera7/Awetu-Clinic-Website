import { NavLink } from 'react-router-dom';
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  Zap,
  Pill,
  BarChart,
  User,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTranslation } from '../../utils/translations';

export default function Sidebar({ isOpen }) {
  const { user, logout } = useAuth();
  const { patients, openAddPatientModal } = useData();
  const role = user?.role || 'Doctor';

  const patientRecord = role === 'Patient' ? patients.find(p => p.id === user?._id || p.pid === user?.pid) : null;
  const preferredLanguage = patientRecord?.preferredLanguage || 'English';
  const { t } = useTranslation(preferredLanguage);

  const allNavItems = [
    { name: 'Overview', path: '/dashboard/overview', icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Doctor', 'Receptionist', 'Lab Technician', 'Pharmacist', 'Nurse', 'Patient'] },
    { name: 'Patients', path: '/dashboard/patients', icon: <Users size={20} />, roles: ['Admin', 'Doctor', 'Receptionist', 'Pharmacist', 'Nurse'] },
    { name: 'Staff', path: '/dashboard/staff', icon: <Users size={20} />, roles: ['Admin'] },
    { name: 'Visits', path: '/dashboard/visits', icon: <CalendarDays size={20} />, roles: ['Admin', 'Doctor', 'Receptionist', 'Nurse'] },
    { name: 'Appointments', path: '/dashboard/appointments', icon: <CalendarDays size={20} />, roles: ['Admin', 'Doctor', 'Receptionist', 'Nurse', 'Patient'] },
    { name: 'Medical Records', path: '/dashboard/records', icon: <FileText size={20} />, roles: ['Admin', 'Doctor', 'Lab Technician', 'Pharmacist', 'Nurse'] },
    { name: 'Pharmacy & Billing', path: '/dashboard/pharmacy', icon: <Pill size={20} />, roles: ['Admin', 'Pharmacist'] },
    { name: 'Analytics', path: '/dashboard/analytics', icon: <BarChart size={20} />, roles: ['Admin'] },
    { name: 'Announcements', path: '/dashboard/announcements', icon: <Megaphone size={20} />, roles: ['Admin'] },
    { name: 'My Profile', path: '/dashboard/profile', icon: <User size={20} />, roles: ['Patient'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  const canAddPatient = ['Receptionist'].includes(role);

  const getTranslatedName = (name) => {
    if (role !== 'Patient') return name;
    if (name === 'Overview') return t('overview');
    if (name === 'Appointments') return t('appointments');
    if (name === 'My Profile') return t('myProfile');
    return name;
  };

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <HeartPulse size={28} className="logo-icon" />
        <span className="sidebar-logo-text">HealthCare Pro</span>
      </div>

      {canAddPatient && (
        <div className="sidebar-action-box">
          <button
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center' }}
            onClick={() => openAddPatientModal()}
          >
            <Zap size={16} /> <span style={{ marginLeft: '4px' }}>Add Patient</span>
          </button>
        </div>
      )}

      <div className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span className="sidebar-item-text">{getTranslatedName(item.name)}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <NavLink to="/dashboard/settings" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span className="sidebar-item-text">{role === 'Patient' ? t('settings') : 'Settings'}</span>
          </NavLink>
          <button onClick={logout} className="sidebar-item" style={{ color: 'var(--color-danger)', border: 'none', background: 'none', width: '100%', cursor: 'pointer' }}>
            <LogOut size={20} />
            <span className="sidebar-item-text">{role === 'Patient' ? t('logout') : 'Logout'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
