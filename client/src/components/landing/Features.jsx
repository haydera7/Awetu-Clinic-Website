import { UserPlus, FileText, History, Activity, Pill, FlaskConical } from 'lucide-react';

export default function Features() {
  const features = [
    { icon: <UserPlus />, title: "Easy Registration", desc: "Digital intake forms that take seconds to complete, permanently eliminating repetitive desk queues." },
    { icon: <FileText />, title: "Instant Patient Records", desc: "Find patient medical history instantly. No more lost paper folders or illegible writing." },
    { icon: <History />, title: "Clear Visit Histories", desc: "Reliable, chronological tracking of every past consultation, prescription, and lab result." },
    { icon: <Activity />, title: "Doctor's Dashboard", desc: "A clean interface for physicians to diagnose, review charts, and request tests in one click." },
    { icon: <Pill />, title: "Seamless Pharmacy", desc: "Prescriptions are sent digitally so medication is ready exactly when the patient arrives." },
    { icon: <FlaskConical />, title: "Direct Lab Routing", desc: "Lab technicians receive requests immediately and send results back directly to the doctor's screen." }
  ];

  return (
    <section id="features" className="premium-section grid-features-section">
      <div className="container">
        <div className="section-header">
          <h2 className="heading-2 section-title">Built for <span className="text-gradient">Simplicity</span></h2>
          <p className="section-subtitle">
            Every tool is designed to solve real daily frustrations in clinic environments.
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((item, idx) => (
            <div key={idx} className="feature-card glass-panel hover-glow-card">
               <div className="feature-icon-wrapper">
                  {item.icon}
               </div>
               <h3 className="feature-title">{item.title}</h3>
               <p className="feature-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
