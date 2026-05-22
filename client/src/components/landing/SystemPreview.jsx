import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

export default function SystemPreview() {
  return (
    <section id="preview" className="preview-section">
      <div className="container" style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '4rem' }}>
        <h2 className="heading-2 text-gradient">Unparalleled Analytics</h2>
        <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-lg)', marginTop: '8px' }}>
          Track capital, patient metrics, and clinical efficiency with surgical precision.
        </p>
      </div>

      <div className="container">
        <div className="preview-mockup glow-panel-cyan" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Window Header */}
          <div className="mockup-header-bar">
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', padding: '4px 16px', fontSize: '12px', color: 'var(--color-gray-500)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>app.healthcarepro.com</span>
            </div>
          </div>

          {/* Dashboard Application Shell */}
          <div style={{ display: 'flex', height: '540px', background: 'var(--color-bg-base)' }}>

            {/* Mock Sidebar */}
            <div style={{ width: '220px', borderRight: '1px solid var(--glass-border)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', paddingLeft: '8px' }}>
                <Activity size={20} color="var(--color-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(0, 240, 255, 0.5))' }} />
                <span style={{ fontWeight: 700, color: 'var(--color-white)' }}>HC Pro</span>
              </div>

              {['Overview', 'Performance', 'Analytics', 'Terminal', 'Patients'].map((item, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  color: i === 0 ? 'var(--color-primary)' : 'var(--color-gray-400)',
                  background: i === 0 ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
                  border: i === 0 ? '1px solid rgba(0, 240, 255, 0.1)' : '1px solid transparent',
                  fontWeight: i === 0 ? 600 : 500,
                  fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}>
                  {i === 0 ? <TrendingUp size={16} /> : <Activity size={16} />}
                  {item}
                </div>
              ))}
            </div>

            {/* Mock Main Content */}
            <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>

              {/* Top Stats */}
              <div style={{ display: 'flex', gap: '24px' }}>
                {[{ label: 'Total P/L', val: '+$42,500.00', inc: '+12.5%', color: 'var(--color-success)' },
                { label: 'Win Rate', val: '68.4%', inc: '+2.1%', color: 'var(--color-primary)' },
                { label: 'Active Patients', val: '1,492', inc: '-0.4%', color: 'var(--color-gray-500)' }].map((stat, i) => (
                  <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '20px' }}>
                    <span style={{ color: 'var(--color-gray-500)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{stat.label}</span>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-white)', marginTop: '8px' }}>{stat.val}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', color: stat.color, fontSize: '13px', fontWeight: 600 }}>
                      {stat.inc.startsWith('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {stat.inc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Graph Area */}
              <div style={{ flex: 1, background: 'var(--color-gray-900)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '24px', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 10 }}>
                  <span style={{ color: 'var(--color-white)', fontWeight: 600, fontSize: '16px' }}>Equity Curve</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-gray-300)', border: '1px solid var(--glass-border)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600 }}>1W</div>
                    <div style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0, 240, 255, 0.2)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600 }}>1M</div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-gray-300)', border: '1px solid var(--glass-border)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600 }}>1Y</div>
                  </div>
                </div>

                {/* Background Graph Grid Overlay */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '100% 20%, 10% 100%', pointerEvents: 'none' }}></div>

                {/* Mock SVG Graph */}
                <div style={{ position: 'absolute', bottom: 0, left: '-2%', right: '-2%', height: '80%' }}>
                  <svg viewBox="0 0 1000 300" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="cyberGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,250 C100,200 200,280 300,150 C400,20 500,180 600,100 C700,20 800,220 900,120 L1000,50 L1000,300 L0,300 Z" fill="url(#cyberGradient)" />
                    <path d="M0,250 C100,200 200,280 300,150 C400,20 500,180 600,100 C700,20 800,220 900,120 L1000,50" fill="none" stroke="var(--color-primary)" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.8))' }} />

                    <circle cx="1000" cy="50" r="5" fill="var(--color-bg-base)" stroke="var(--color-primary)" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 12px rgba(0,240,255,1))' }} />
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
