import { Users, FolderOpen, Network, CheckCircle2 } from 'lucide-react';

export default function Services() {
   const services = [
      {
         title: "Smooth Patient Registration",
         desc: "Long lines stress clinic staff and frustrate patients. We simplify the reception desk, making registration fast and organizing patient queues so that everyone knows exactly who is next without the confusion.",
         icon: <Users size={64} style={{ color: 'var(--color-primary)' }} />,
         reverse: false
      },
      {
         title: "Reliable Digital Records",
         desc: "Stop wasting time searching through dusty cabinets for lost paper folders. We safely digitize patient forms so that doctors can view a patient's complete medical history instantly and accurately.",
         icon: <FolderOpen size={64} style={{ color: 'var(--color-purple)' }} />,
         reverse: true
      },
      {
         title: "Connected Doctors & Labs",
         desc: "When a doctor orders a test, the lab receives it immediately. When results are ready, they go straight to the doctor and the pharmacy. We connect your rooms to eliminate the need for running around with paper slips.",
         icon: <Network size={64} style={{ color: 'var(--color-success)' }} />,
         reverse: false
      },
      {
         title: "Simplified Daily Operations",
         desc: "Local clinics don't need overly complicated software. Our platform is easy to learn and built specifically for the day-to-day realities of Ethiopian health centers, helping your entire team focus on healing.",
         icon: <CheckCircle2 size={64} style={{ color: 'var(--color-blue)' }} />,
         reverse: true
      }
   ];

   return (
      <section id="services" className="premium-section services-section">
         <div className="container mx-auto px-6" style={{ padding: '4rem 2rem' }}>
            <div className="section-header" style={{ textAlign: 'center', marginBottom: 'var(--spacing-24)' }}>
               <h2 className="heading-2 section-title" style={{ marginBottom: 'var(--spacing-6)' }}>
                  Core <span className="text-gradient">Capabilities</span>
               </h2>
               <p className="section-subtitle" style={{ margin: '0 auto', maxWidth: '600px' }}>
                  Practical, easy-to-use tools designed specifically to solve the daily struggles of healthcare centers like those in Awetu Mendera.
               </p>
            </div>
            {services.map((item, i) => (
               <div key={i} className={`service-row ${item.reverse ? 'reverse' : ''}`} style={{ display: 'flex', flexDirection: item.reverse ? 'row-reverse' : 'row', alignItems: 'center', gap: 'var(--spacing-16)', marginBottom: 'var(--spacing-24)', flexWrap: 'wrap' }}>
                  <div className="service-text" style={{ flex: '1 1 400px' }}>
                     <h3 className="heading-2 service-title" style={{ marginBottom: 'var(--spacing-4)' }}>{item.title}</h3>
                     <p className="about-desc">{item.desc}</p>
                  </div>
                  <div className="service-visual" style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
                     <div className="glass-panel" style={{ padding: 'var(--spacing-12)', borderRadius: 'var(--radius-xl)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', background: 'var(--color-highlight)', opacity: '0.1' }}></div>
                        {item.icon}
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </section>
   );
}
