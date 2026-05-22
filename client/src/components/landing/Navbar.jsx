import { useState } from 'react';
import { Activity, HeartPulse, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function Navbar({ isScrolled, onOpenLogin }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <>
      <nav className={`landing-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-container">
          <a href="#" className="navbar-logo">
            <HeartPulse size={24} className="logo-icon" />
            <span>HealthCare Pro</span>
          </a>

          <div className="navbar-menu">
            <a href="#" className="menu-item">Home</a>
            <a href="#about" className="menu-item">About</a>
            <a href="#trust" className="menu-item">Trust</a>
            <a href="#services" className="menu-item">Services</a>
            <a href="#features" className="menu-item">Features</a>
          </div>

          <div className="navbar-actions">
            <button className="btn btn-secondary desktop-login" onClick={onOpenLogin}>
              Log in
            </button>
            <button className="btn btn-primary desktop-get-started" onClick={onOpenLogin}>
              Get Started
            </button>
            
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button className="mobile-menu-toggle" onClick={() => setIsMobileOpen(!isMobileOpen)}>
              {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div className={`mobile-dropdown ${isMobileOpen ? 'open' : ''}`}>
        <div className="mobile-dropdown-content">
          <a href="#platform" className="mobile-link" onClick={() => setIsMobileOpen(false)}>Platform</a>
          <a href="#trust" className="mobile-link" onClick={() => setIsMobileOpen(false)}>Trust</a>
          <a href="#features" className="mobile-link" onClick={() => setIsMobileOpen(false)}>Features</a>
          <a href="#solutions" className="mobile-link" onClick={() => setIsMobileOpen(false)}>Solutions</a>
          <a href="#pricing" className="mobile-link" onClick={() => setIsMobileOpen(false)}>Pricing</a>
          <div className="mobile-actions-box">
            <button className="btn btn-secondary w-full" onClick={() => { setIsMobileOpen(false); onOpenLogin(); }}>Log in</button>
            <button className="btn btn-primary w-full" onClick={() => { setIsMobileOpen(false); onOpenLogin(); }}>Get Started</button>
            <button 
              className="btn btn-outline w-full" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
              onClick={toggleTheme}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
