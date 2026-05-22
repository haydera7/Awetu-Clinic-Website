import { ArrowRight, MessageSquare } from 'lucide-react';

export default function CTA({ onGetStarted }) {
  return (
    <section className="premium-section" style={{ padding: 'var(--spacing-24) var(--spacing-6)' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
        
        <div className="glow-panel-cyan" style={{ position: 'relative', padding: 'var(--spacing-16) var(--spacing-8)', textAlign: 'center', overflow: 'hidden', maxWidth: '900px', width: '100%', borderRadius: 'var(--radius-xl)' }}>
          {/* Decorative background glows */}
          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), transparent, rgba(157, 0, 255, 0.1))', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'var(--color-primary)', opacity: '0.15', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
          
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '700px', margin: '0 auto' }}>
            <h2 className="heading-2" style={{ color: 'var(--color-white)', marginBottom: 'var(--spacing-6)', textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)' }}>
              Ready to digitize your clinic's workflow?
            </h2>
            
            <p className="about-desc" style={{ marginBottom: 'var(--spacing-10)', fontSize: 'var(--font-size-lg)', color: 'var(--color-gray-300)' }}>
              Moving away from paper records doesn't have to be complicated. Equip your staff with a reliable, grounded system built specifically for Ethiopian healthcare centers—helping you cut wait times and coordinate doctor, lab, and pharmacy workflows effortlessly.
            </p>
            
            <div style={{ display: 'flex', gap: 'var(--spacing-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={onGetStarted}>
                Deploy System <ArrowRight size={20} />
              </button>
              <button className="btn btn-secondary">
                <MessageSquare size={20} /> Talk to our Team
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
