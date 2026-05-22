import { ArrowRight, MessageSquare, Play, User, Activity, ClipboardList, Clock, CheckCircle2 } from 'lucide-react';

export default function Hero({ onGetStarted, onPatientPortal }) {
  return (
    <section id="home" className="hero-section">
      <div className="orb-center"></div>

      <div className="container hero-container">

        {/* Main Content Column */}
        <div className="hero-left animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="hero-tag-wrapper">
            <span className="hero-tag">
              <span className="pulse-dot"></span>
              Built for Awetu Mendera Health Center
            </span>
          </div>

          <h1 className="hero-h1">
            Digitize your clinic. <br />
            Better care for your <span className="text-gradient">community</span>.
          </h1>

          <p className="hero-description" style={{ marginBottom: '2rem', maxWidth: '600px' }}>
            Designed for healthcare centers in Awetu Mendera Kebele.

            Replace paper records, reduce waiting time, and connect doctors, labs, and pharmacies in one simple system.
          </p>

          <div className="hero-actions" style={{ justifyContent: 'flex-start', marginBottom: '3rem' }}>
            <button className="btn btn-primary" onClick={onGetStarted}>
              Launch Dashboard <ArrowRight size={20} />
            </button>
            <button className="btn btn-secondary" onClick={onPatientPortal}>
              <User size={20} /> Patient Portal
            </button>
          </div>

          <div className="hero-stats-row">
            <div className="stat-card-mini">
              <span className="stat-val">Digital</span>
              <span className="stat-lbl">Patient Records</span>
            </div>
            <div className="stat-card-mini">
              <span className="stat-val">Connected</span>
              <span className="stat-lbl">Labs & Pharmacy</span>
            </div>
            <div className="stat-card-mini">
              <span className="stat-val">Shorter</span>
              <span className="stat-lbl">Wait Times</span>
            </div>
          </div>
        </div>

        {/* Visual Mockup Column */}
        <div className="hero-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="hero-visual">
            <div className="floating-node node-1">✦</div>
            <div className="floating-node node-2">✦</div>
            <div className="floating-node node-3">✦</div>

            <div className="hero-mockup-wrapper relative">
              <div className="hero-mockup-main relative">
                <div className="mockup-inner">
                  {/* Realistic Clinic Queue Dashboard Visualization */}
                  <div className="mockup-core-visual" style={{ background: 'var(--color-bg-surface)', width: '100%', height: '100%', borderRadius: 'inherit', padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-white)', fontSize: '1.25rem' }}>Today's Queue</div>
                      <div className="badge badge-primary">12 Waiting</div>
                    </div>
                    {/* Queue Mock Items */}
                    {[
                      { name: 'Aster Tadesse', detail: 'OPD - Dr. Sarah', status: 'Consultation' },
                      { name: 'Kebede Alemu', detail: 'Awaiting Results', status: 'Lab Request' },
                      { name: 'Fatima Nur', detail: 'Prescription Ready', status: 'Pharmacy' },
                      { name: 'Dawit Bekele', detail: 'Room 2', status: 'In Progress' }
                    ].map((pt, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-highlight)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--color-white)', marginBottom: '4px' }}>{pt.name}</div>
                          <div style={{ fontSize: '13px', color: 'var(--color-gray-400)' }}>{pt.detail}</div>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-primary)', background: 'var(--color-highlight)', padding: '4px 10px', borderRadius: '20px' }}>{pt.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </section>
  );
}
