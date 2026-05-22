import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

export default function Toast({ message, type = 'info', onClose, onConfirm, duration = 5000 }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (type === 'confirm') return; // Do not auto-close confirm toasts
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, type]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Wait for fade-out animation
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="toast-icon success" />;
      case 'danger': return <AlertCircle size={20} className="toast-icon danger" />;
      case 'warning': return <AlertTriangle size={20} className="toast-icon warning" />;
      case 'confirm': return <AlertTriangle size={20} className="toast-icon warning" />;
      default: return <Info size={20} className="toast-icon info" />;
    }
  };

  return (
    <div className={`toast-item ${type} ${isExiting ? 'exit' : 'enter'}`}>
      <div className="toast-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {getIcon()}
          <span className="toast-message">{message}</span>
        </div>
        
        {type === 'confirm' && (
          <div className="toast-actions" style={{ display: 'flex', gap: '8px', marginLeft: '32px' }}>
            <button 
              onClick={() => {
                if (onConfirm) onConfirm();
                handleClose();
              }}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Confirm
            </button>
            <button 
              onClick={handleClose}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <button className="toast-close" onClick={handleClose}>
        <X size={16} />
      </button>
    </div>
  );
}
