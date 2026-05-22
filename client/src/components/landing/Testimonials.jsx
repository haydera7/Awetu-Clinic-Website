import { Quote } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      text: "We used to spend hours searching through paper stacks whenever a patient returned. Now, the files are just there on the screen, and we easily handle visits without the chaos.",
      author: "Dawit M.",
      role: "Clinic Administrator"
    },
    {
      text: "Before, patients had to carry paper slips from my desk to the lab, and papers would get lost. Sending lab requests directly through the system has saved so much confusion.",
      author: "Tigist A.",
      role: "Head Nurse"
    },
    {
      text: "Patients appreciate not having to explain their prescription all over again. By the time they reach the pharmacy window, I already have their medicine ready.",
      author: "Samuel T.",
      role: "Pharmacist"
    }
  ];

  return (
    <section id="testimonials" className="premium-section testimonials-section" style={{ borderTop: '1px solid var(--glass-border)', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(2, 132, 199, 0.02) 100%)' }}>
      <div className="container">
        <div className="section-header">
          <div className="badge badge-primary" style={{ marginBottom: '1rem' }}>Community Voices</div>
          <h2 className="heading-2 section-title">Real results everyday .</h2>
        </div>

        <div className="features-grid">
          {testimonials.map((t, idx) => (
            <div key={idx} className="glass-panel hover-glow-card" style={{ position: 'relative', padding: 'var(--spacing-8)', overflow: 'hidden', display: 'flex', flexDirection: 'column', textAlign: 'left', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, transform: 'rotate(10deg)' }}>
                <Quote size={120} color="var(--color-primary)" />
              </div>
              <p className="feature-desc" style={{ fontStyle: 'italic', color: 'var(--color-white)', flex: 1, position: 'relative', zIndex: 1, fontSize: 'var(--font-size-lg)', lineHeight: 1.6, marginBottom: 'var(--spacing-8)' }}>
                "{t.text}"
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: 'var(--font-size-lg)', boxShadow: '0 4px 10px rgba(0, 240, 255, 0.2)' }}>
                  {t.author.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-white)', fontSize: 'var(--font-size-base)' }}>{t.author}</div>
                  <div style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
