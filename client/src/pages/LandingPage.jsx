import { useState, useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import About from '../components/landing/About';
import Trust from '../components/landing/Trust';
import Testimonials from '../components/landing/Testimonials';
import CTA from '../components/landing/CTA';
import Services from '../components/landing/Services';
import Features from '../components/landing/Features';
import Comparison from '../components/landing/Comparison';
import SystemPreview from '../components/landing/SystemPreview';
import LoginModal from '../components/auth/LoginModal';
import api from '../services/api';
import './LandingPage.css';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPatientMode, setIsPatientMode] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch active announcements
    api.get('/announcements')
      .then(res => {
        if (res && res.data) {
          setAnnouncements(res.data.filter(a => a.active));
        }
      })
      .catch(err => console.error("Failed to load announcements on landing page:", err));
  }, []);

  const openStaffLogin = () => {
    setIsPatientMode(false);
    setIsLoginModalOpen(true);
  };

  const openPatientPortal = () => {
    setIsPatientMode(true);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="landing-page">
      <Navbar
        isScrolled={isScrolled}
        onOpenLogin={openStaffLogin}
      />
      <main>
        <Hero 
          onGetStarted={openStaffLogin} 
          onPatientPortal={openPatientPortal}
        />

        {announcements.length > 0 && (
          <section className="landing-announcements">
            <div className="container">
              <div className="announcements-header">
                <span className="live-indicator">
                  <span className="pulse-dot"></span>
                  LIVE ANNOUNCEMENTS
                </span>
                <h2 className="section-title">Clinical Notices & Updates</h2>
                <p className="section-subtitle">Important real-time news, schedule adjustments, and system status alerts.</p>
              </div>
              <div className="landing-announcements-grid">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann._id || ann.id} className={`landing-ann-card ${ann.category.toLowerCase()}`}>
                    {ann.imageUrl && (
                      <div className="landing-ann-img-wrapper">
                        <img
                          src={ann.imageUrl}
                          alt={ann.title}
                          className="landing-ann-img"
                          onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                        />
                        <span className={`landing-ann-img-badge ${ann.category.toLowerCase()}`}>
                          {ann.category}
                        </span>
                      </div>
                    )}
                    <div className="ann-card-header">
                      <span className={`ann-category-tag ${ann.category.toLowerCase()}`}>
                        {ann.category}
                      </span>
                      <span className="ann-card-date">
                        {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="ann-card-title">{ann.title}</h3>
                    <p className="ann-card-content">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <About />
        <Trust />
        <Services />
        <Features />
        <Comparison />
        <SystemPreview />
        <Testimonials />
        <CTA onGetStarted={openStaffLogin} />
      </main>

      {/* Premium Footer */}
      <footer className="landing-footer">
        <div className="container footer-container">
          <div className="footer-brand">
            <div className="navbar-logo" style={{ marginBottom: 'var(--spacing-4)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.4))' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              <span>HealthCare Pro</span>
            </div>
            <p className="footer-desc">
              The premier simulated medical and clinical analytics platform for industry leaders building the future of digital health.
            </p>
          </div>

          <div className="footer-links">
            <div className="link-column">
              <h4>Platform</h4>
              <a href="#">Overview</a>
              <a href="#">Features</a>
              <a href="#">Integrations</a>
            </div>
            <div className="link-column">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="link-column">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container bottom-container">
            <p>&copy; {new Date().getFullYear()} HealthCare Pro. All rights reserved.</p>
            <div className="footer-socials">
              <a href="#">Twitter</a>
              <a href="#">Discord</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>

      {isLoginModalOpen && (
        <LoginModal 
          onClose={() => setIsLoginModalOpen(false)} 
          initialIsPatient={isPatientMode}
        />
      )}
    </div>
  );
}
