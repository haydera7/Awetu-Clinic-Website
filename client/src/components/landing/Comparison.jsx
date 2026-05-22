import { Check, Minus } from 'lucide-react';

export default function Comparison() {
  const comparisonData = [
    { feature: "No Internet Required (Local Sync)", us: true, others: false },
    { feature: "Digital Lab & Pharmacy Sync", us: true, others: false },
    { feature: "Simple Learning Curve", us: true, others: false },
    { feature: "Eliminates Paper Folders", us: true, others: false },
    { feature: "Ethiopian Clinic Focused", us: true, others: true },
  ];

  return (
    <section id="comparison" className="features-section">
      <div className="container">
        
        <div className="section-header">
          <h2 className="heading-2 section-title">How does <span className="text-gradient">HealthCare Pro</span> compare?</h2>
          <p className="section-subtitle">
            The only platform practically designed for Ethiopian health centers.
          </p>
        </div>

        <div className="comparison-grid">
          
          {/* Legacy Card */}
          <div className="comp-card">
            <h3>Paper Records</h3>
            <div className="comp-list">
              {comparisonData.map((item, i) => (
                <div key={i} className="comp-item">
                  {item.others ? <Check size={16} className="comp-icon-yes"/> : <Minus size={16} className="comp-icon-no"/>}
                  <span>{item.feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highlighted Card */}
          <div className="comp-card highlight">
            <h3>HealthCare Pro</h3>
            <div className="comp-list">
              {comparisonData.map((item, i) => (
                <div key={i} className="comp-item">
                  <Check size={18} className="comp-icon-yes" style={{ color: 'var(--color-primary)' }}/>
                  <span>{item.feature}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: '32px' }}>Start Managing Better</button>
          </div>

          {/* Another Competitor Card */}
          <div className="comp-card">
             <h3>Generic Software</h3>
             <div className="comp-list">
              {comparisonData.map((item, i) => (
                <div key={i} className="comp-item">
                  {i % 2 === 0 ? <Check size={16} className="comp-icon-yes"/> : <Minus size={16} className="comp-icon-no"/>}
                  <span>{item.feature}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
