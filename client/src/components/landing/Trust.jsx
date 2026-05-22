import { ShieldCheck, Server, Clock, CheckCircle2 } from 'lucide-react';

export default function Trust() {
  return (
    <section id="trust" className="premium-section trust-section">
      <div className="container">
        <div className="section-header">
          <div className="badge badge-primary" style={{ marginBottom: '1rem' }}>Trust & Reliability</div>
          <h2 className="heading-2 section-title">Made for everyday care.</h2>
        </div>

        <div className="glow-panel-cyan" style={{ padding: 'var(--spacing-12)', maxWidth: '1000px', margin: '0 auto', overflow: 'hidden', position: 'relative', borderRadius: 'var(--radius-xl)' }}>
          {/* Decorative background glow */}
          <div style={{ position: 'absolute', top: '-150px', right: '-150px', width: '400px', height: '400px', background: 'var(--color-primary)', opacity: '0.15', filter: 'blur(80px)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }}></div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-12)', position: 'relative', zIndex: 10, alignItems: 'center' }}>
            
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '600', color: 'var(--color-white)', marginBottom: 'var(--spacing-4)' }}>Built for real daily operations.</h3>
              <p className="about-desc" style={{ marginBottom: 'var(--spacing-6)', color: 'var(--color-gray-300)' }}>
                Upgrading from paper records is a critical transition. We designed HealthCare Pro strictly around the operational realities of local clinics like Awetu Mendera Health Center, focusing on extreme stability and low learning curves.
              </p>
              <p className="about-desc" style={{ color: 'var(--color-gray-300)' }}>
                Whether registering new walk-ins, routing test requests to the lab, or dispensing medications, the platform handles the administrative burden effortlessly so your team can focus on their patients—not their paperwork.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck style={{ color: 'var(--color-success)' }} size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-white)' }}>Protected Patient Privacy</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Medical histories stay secure and strictly confidential</div>
                </div>
              </div>

              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Server style={{ color: 'var(--color-primary)' }} size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-white)' }}>Local Network Reliability</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Operates smoothly during internet drops</div>
                </div>
              </div>

              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(157, 0, 255, 0.1)', border: '1px solid rgba(157, 0, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock style={{ color: 'var(--color-purple)' }} size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-white)' }}>Eliminates Desk Clutter</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>No more lost physical folders or misread hand-writing</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
