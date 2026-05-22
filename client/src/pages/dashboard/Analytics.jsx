import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { BarChart, Users, Clock, CreditCard, Activity } from 'lucide-react';

export default function Analytics() {
  const { patients, visits, bills, medicalRecords } = useData();

  const handleExport = () => {
    alert("Exporting CSV Database... (Simulated)");
  };

  const revenue = useMemo(() => {
    return bills.filter(b => b.status === "Paid").reduce((acc, b) => acc + b.total, 0);
  }, [bills]);

  return (
    <div className="dashboard-page animate-fade-in" style={{ padding: 'var(--spacing-6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <BarChart size={24} className="text-primary" /> Reports & Analytics
          </h1>
          <p className="text-muted" style={{ marginTop: 'var(--spacing-2)' }}>System operations and clinical averages for the current month.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>
          Export PDF Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-8)' }}>
        {/* KPI Cards */}
        <div className="glass-panel hover-glow-card" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '12px' }}>
              <Users size={24} className="text-primary" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-400)' }}>Total Registered</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{patients.length} Patients</div>
            </div>
          </div>
        </div>

        <div className="glass-panel hover-glow-card" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <div style={{ padding: '12px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '12px' }}>
              <CreditCard size={24} className="text-success" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-400)' }}>Monthly Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{revenue} ETB</div>
            </div>
          </div>
        </div>

        <div className="glass-panel hover-glow-card" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <div style={{ padding: '12px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px' }}>
              <Clock size={24} className="text-warning" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-400)' }}>Avg Wait Time</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>~14 mins</div>
            </div>
          </div>
        </div>

      </div>

      {/* Basic Clinical Metrics */}
      <div className="table-card glass-panel" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <Activity size={20} className="text-purple" /> Common Clinical Records
        </h3>
        <p className="text-muted" style={{ marginBottom: '24px' }}>A high-level view of recorded patient diagnoses and visit types for supply chain planning.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--color-highlight)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
             <span style={{ fontWeight: '500' }}>Essential Hypertension Tracking</span>
             <span className="badge badge-primary">3 Records</span>
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--color-highlight)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
             <span style={{ fontWeight: '500' }}>Type 2 Diabetes Checkups</span>
             <span className="badge badge-primary">2 Records</span>
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--color-highlight)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
             <span style={{ fontWeight: '500' }}>Malaria Rapid Tests (Simulated)</span>
             <span className="badge badge-warning">Low Seasonal Cases</span>
           </div>
        </div>
      </div>

    </div>
  );
}
