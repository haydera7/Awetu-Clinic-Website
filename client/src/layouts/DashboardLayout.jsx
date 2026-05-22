import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardNavbar from '../components/dashboard/DashboardNavbar';
import AddPatientModal from '../components/dashboard/AddPatientModal';
import AddVisitModal from '../components/dashboard/AddVisitModal';
import AddRecordModal from '../components/dashboard/AddRecordModal';
import AddStaffModal from '../components/dashboard/AddStaffModal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Toast from '../components/dashboard/Toast';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isAddPatientModalOpen, isAddVisitModalOpen, isAddRecordModalOpen, isAddStaffModalOpen } = useData();
  const { user } = useAuth();
  const { toasts, removeToast } = useSocket();

  // Premium loader state (shown for a minimum of 5 seconds on new login session)
  const [showLoader, setShowLoader] = useState(() => {
    const sessionLoaded = sessionStorage.getItem('dashboard-loaded');
    return !sessionLoaded;
  });
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('Securing session & validating credentials...');

  // Premium circular refresh loader state (shown for 1.5s when page is refreshed)
  const [showRefreshLoader, setShowRefreshLoader] = useState(() => {
    const sessionLoaded = sessionStorage.getItem('dashboard-loaded');
    return !!sessionLoaded; // True only if they already logged in but just refreshed
  });

  useEffect(() => {
    if (!showRefreshLoader) return;
    const timer = setTimeout(() => {
      setShowRefreshLoader(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [showRefreshLoader]);

  useEffect(() => {
    if (!showLoader) return;

    // Fast progress increment to 100% in 5 seconds
    const intervalTime = 50; // ms
    const increment = 100 / (5000 / intervalTime); // 5000ms total
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        return next >= 100 ? 100 : next;
      });
    }, intervalTime);

    // Caption transitions
    const captions = [
      { time: 0, text: 'Securing session & validating credentials...' },
      { time: 1000, text: 'Initializing real-time workspace socket...' },
      { time: 2000, text: 'Decrypting local medical records and directory...' },
      { time: 3200, text: 'Synchronizing specialized clinical queues...' },
      { time: 4200, text: 'Finalizing premium user interface layout...' },
    ];

    const captionTimers = captions.map(cap => {
      return setTimeout(() => {
        setCaption(cap.text);
      }, cap.time);
    });

    // Final finish timeout
    const finishTimeout = setTimeout(() => {
      sessionStorage.setItem('dashboard-loaded', 'true');
      setShowLoader(false);
    }, 5100);

    return () => {
      clearInterval(progressInterval);
      captionTimers.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [showLoader]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (showLoader) {
    return (
      <div className="premium-loader-overlay">
        <div className="premium-loader-glow-1"></div>
        <div className="premium-loader-glow-2"></div>
        
        <div className="premium-loader-card">
          <div className="premium-loader-icon-wrap">
            <HeartPulse size={40} className="animate-pulse" />
          </div>
          
          <h1 className="premium-loader-brand">HealthCare Pro</h1>
          <div className="premium-loader-subtitle">Clinical Portal Access</div>
          
          <div className="premium-loader-progress-container">
            <div className="premium-loader-bar-bg">
              <div className="premium-loader-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="premium-loader-status-row">
              <span>{caption}</span>
              <span className="premium-loader-percentage">{Math.round(progress)}%</span>
            </div>
          </div>
          
          <div className="premium-loader-caption">Please wait while we set up your portal workspace...</div>
        </div>
      </div>
    );
  }

  if (showRefreshLoader) {
    return (
      <div className="premium-refresh-overlay">
        <div className="premium-refresh-ring-container">
          <div className="premium-refresh-ring-outer"></div>
          <div className="premium-refresh-ring-inner"></div>
          <HeartPulse size={44} className="premium-refresh-icon" />
        </div>
        <h2 className="premium-refresh-title">Restoring Secure Session</h2>
        <div className="premium-refresh-status">Reconnecting to workspace...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={isSidebarOpen} />
      
      <div className={`dashboard-main ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
        <DashboardNavbar onMenuToggle={toggleSidebar} />
        
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => removeToast(toast.id)} 
            onConfirm={toast.onConfirm}
          />
        ))}
      </div>

      {isAddPatientModalOpen && <AddPatientModal />}
      {isAddVisitModalOpen && <AddVisitModal />}
      {isAddRecordModalOpen && <AddRecordModal />}
      {isAddStaffModalOpen && <AddStaffModal />}
    </div>
  );
}
