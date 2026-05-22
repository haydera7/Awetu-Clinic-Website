import { Users, Activity, FlaskConical, Filter, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Pill, DollarSign, Package, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Overview.css';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { exportMedicalRecordToPdf } from '../../utils/ExportPdf';
import { useTranslation } from '../../utils/translations';

export default function Overview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patients, visits, medicalRecords, prescriptions, inventory, bills, staffs, openAddPatientModal, openAddRecordModal } = useData();
  const role = user?.role || 'Doctor';

  const patientRecord = role === 'Patient' ? patients.find(p => p.id === user?._id || p.pid === user?.pid) : null;
  const preferredLanguage = patientRecord?.preferredLanguage || 'English';
  const { t } = useTranslation(preferredLanguage);

  // --- Data Normalization Helpers ---
  const formatAsDateString = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  const isSameDay = (backendDate, targetDateStr) => {
    if (!backendDate) return false;
    const dStr = typeof backendDate === 'string' ? backendDate : formatAsDateString(backendDate);
    return dStr === targetDateStr;
  };

  // --- Role-Based Logic ---
  const today = new Date().toISOString().split('T')[0];
  const todayVisits = visits.filter(v => {
    const isToday = isSameDay(v.date, today);
    if (!isToday) return false;
    if (role === 'Doctor') {
      // Doctors see patients ready for consult or with results, but not those waiting for triage or already at the injection room
      return !['Scheduled', 'Ready for Treatment', 'Completed'].includes(v.status);
    }
    return true;
  });
  const pendingLabs = medicalRecords.filter(r => r.type === 'Lab Result' && r.notes?.toLowerCase().includes('pending'));
  const lowStockItems = inventory.filter(i => i.stock <= 50);
  const pendingRxs = prescriptions.filter(p => p.status === 'PRESCRIBED');
  const totalRevenue = bills.reduce((acc, b) => acc + (b.totalAmount || b.total || 0), 0);

  // --- Dynamic Change Calculations ---
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const getCreatedDate = (item) => new Date(item.createdAt || item.date || 0);

  // New patients this week
  const newPatientsThisWeek = patients.filter(p => getCreatedDate(p) >= weekAgo).length;
  const patientChange = newPatientsThisWeek > 0 ? `+${newPatientsThisWeek}` : '0';

  // New staff this week
  const newStaffThisWeek = staffs.filter(s => getCreatedDate(s) >= weekAgo).length;
  const staffChange = newStaffThisWeek > 0 ? `+${newStaffThisWeek}` : '0';

  // Revenue growth: this week vs last week
  const revenueThisWeek = bills
    .filter(b => getCreatedDate(b) >= weekAgo)
    .reduce((acc, b) => acc + (b.totalAmount || b.total || 0), 0);
  const revenueLastWeek = bills
    .filter(b => { const d = getCreatedDate(b); return d >= twoWeeksAgo && d < weekAgo; })
    .reduce((acc, b) => acc + (b.totalAmount || b.total || 0), 0);
  const revenueGrowth = revenueLastWeek > 0
    ? Math.round(((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100)
    : (revenueThisWeek > 0 ? 100 : 0);
  const revenueChange = revenueGrowth > 0 ? `+${revenueGrowth}%` : (revenueGrowth === 0 ? '0%' : `${revenueGrowth}%`);

  // Prescriptions dispensed this week
  const dispensedThisWeek = prescriptions.filter(p => p.status === 'DISPENSED' && getCreatedDate(p) >= weekAgo).length;
  const dispensedChange = dispensedThisWeek > 0 ? `+${dispensedThisWeek}` : '0';

  // New medical records this week
  const newRecordsThisWeek = medicalRecords.filter(r => getCreatedDate(r) >= weekAgo).length;
  const recordsChange = newRecordsThisWeek > 0 ? `+${newRecordsThisWeek}` : '0';

  // New lab results this week
  const newLabResultsThisWeek = medicalRecords.filter(r => r.type === 'Lab Result' && getCreatedDate(r) >= weekAgo).length;
  const labResultsChange = newLabResultsThisWeek > 0 ? `+${newLabResultsThisWeek}` : '0';

  let stats = [];
  let dashboardTitle = "Dashboard";
  let dashboardSubtitle = "Hospital Overview & Clinical Analytics";

  // --- Combined Activity for Admin ---
  const allActivity = [
    ...medicalRecords
      .filter(r => role !== 'Admin' || r.type !== 'Lab Request')
      .map(r => ({ ...r, feedType: 'record', sortDate: r.date })),
    ...prescriptions.map(p => ({ ...p, feedType: 'prescription', sortDate: p.date })),
    ...bills.map(b => ({ ...b, feedType: 'bill', sortDate: b.date }))
  ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate)).slice(0, 6);

  if (role === 'Admin') {
    dashboardTitle = "Administrator Console";
    dashboardSubtitle = "Strategic Overview & Hospital Management";
    stats = [
      { title: 'Total Patients', value: patients.length.toLocaleString(), change: patientChange, icon: <Users size={24} />, color: 'primary' },
      { title: 'Total Staff', value: staffs.length.toLocaleString(), change: staffChange, icon: <ShieldCheck size={24} />, color: 'purple' },
      { title: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, change: revenueChange, icon: <DollarSign size={24} />, color: 'success' },
      { title: 'Inventory Items', value: inventory.length.toLocaleString(), change: lowStockItems.length > 0 ? `${lowStockItems.length} Low` : 'Stable', icon: <Package size={24} />, color: 'warning' },
    ];
  } else if (role === 'Doctor') {
    dashboardTitle = "Clinical Dashboard";
    dashboardSubtitle = "Patient Care & Medical Records";
    stats = [
      { title: 'Total Patients', value: patients.length.toLocaleString(), change: patientChange, icon: <Users size={24} />, color: 'primary' },
      { title: 'Visits Today', value: todayVisits.length.toLocaleString(), change: `Total: ${visits.length}`, icon: <Activity size={24} />, color: 'purple' },
      { title: 'Pending Labs', value: pendingLabs.length.toLocaleString(), change: pendingLabs.length > 0 ? 'Urgent' : 'Clear', icon: <FlaskConical size={24} />, color: 'warning' },
      { title: 'Clinical Records', value: medicalRecords.length.toLocaleString(), change: recordsChange, icon: <Filter size={24} />, color: 'success' },
    ];
  } else if (role === 'Pharmacist') {
    dashboardTitle = "Pharmacy Dashboard";
    dashboardSubtitle = "Prescription Management & Inventory";
    stats = [
      { title: 'Pending Rx', value: pendingRxs.length.toLocaleString(), change: pendingRxs.length > 0 ? 'Waiting' : 'Clear', icon: <Pill size={24} />, color: 'primary' },
      { title: 'Total Dispensed', value: prescriptions.filter(p => p.status === 'DISPENSED').length.toLocaleString(), change: dispensedChange, icon: <Activity size={24} />, color: 'success' },
      { title: 'Low Stock', value: lowStockItems.length.toLocaleString(), change: lowStockItems.length > 0 ? 'Critical' : 'Healthy', icon: <Package size={24} />, color: 'danger' },
      { title: 'Medicines', value: inventory.length.toLocaleString(), change: 'Items', icon: <TrendingUp size={24} />, color: 'purple' },
    ];
  } else if (role === 'Receptionist') {
    dashboardTitle = "Reception Desk";
    dashboardSubtitle = "Patient Registration & Appointments";
    stats = [
      { title: 'Total Patients', value: patients.length.toLocaleString(), change: patientChange, icon: <Users size={24} />, color: 'primary' },
      { title: 'Visits Today', value: todayVisits.length.toLocaleString(), change: `Total: ${visits.length}`, icon: <Clock size={24} />, color: 'purple' },
      { title: 'Active Patients', value: patients.filter(p => p.status === 'Active').length.toLocaleString(), change: `of ${patients.length}`, icon: <Activity size={24} />, color: 'success' },
      { title: 'Unpaid Bills', value: bills.filter(b => b.status === 'Unpaid').length.toLocaleString(), change: bills.filter(b => b.status === 'Unpaid').length > 0 ? 'Pending' : 'Clear', icon: <DollarSign size={24} />, color: 'warning' },
    ];
  } else if (role === 'Lab Technician') {
    dashboardTitle = "Laboratory Overview";
    dashboardSubtitle = "Lab Requests & Sample Tracking";
    const pendingLabVisits = visits.filter(v => v.status === 'Lab Requested');
    stats = [
      { title: 'Pending Tests', value: pendingLabVisits.length.toLocaleString(), change: pendingLabVisits.length > 0 ? 'Queued' : 'Clear', icon: <FlaskConical size={24} />, color: 'warning' },
      { title: 'Completed Labs', value: medicalRecords.filter(r => r.type === 'Lab Result' && !r.notes?.toLowerCase().includes('pending')).length.toLocaleString(), change: labResultsChange, icon: <ShieldCheck size={24} />, color: 'success' },
      { title: 'Total Patients', value: patients.length.toLocaleString(), change: patientChange, icon: <Users size={24} />, color: 'primary' },
      { title: 'Recent Results', value: medicalRecords.filter(r => r.type === 'Lab Result').length.toLocaleString(), change: 'Records', icon: <Filter size={24} />, color: 'purple' },
    ];
  } else if (role === 'Nurse') {
    const dept = user?.department || 'Triage & Emergency';
    const treatmentsLogged = medicalRecords.filter(r => r.type === 'Treatment/Procedure').length;
    const vitalsLoggedToday = medicalRecords.filter(r => r.type === 'Vitals' && isSameDay(r.date, today)).length;
    
    if (dept === 'Triage & Emergency' || dept === 'OPD Nursing') {
      dashboardTitle = dept === 'Triage & Emergency' ? "Triage & Emergency Station" : "OPD Nursing Station";
      dashboardSubtitle = "Patient Vital Signs Intake & Priority Screening";
      const awaitingTriage = visits.filter(v => ['Scheduled', 'Waiting'].includes(v.status) && isSameDay(v.date, today)).length;
      stats = [
        { title: 'Awaiting Triage', value: awaitingTriage.toLocaleString(), change: awaitingTriage > 0 ? 'Action Needed' : 'Clear', icon: <Activity size={24} />, color: 'warning' },
        { title: 'Vitals Logged Today', value: vitalsLoggedToday.toLocaleString(), change: 'Recorded', icon: <TrendingUp size={24} />, color: 'success' },
        { title: 'Total Checked-In', value: todayVisits.length.toLocaleString(), change: `Total: ${visits.length}`, icon: <Users size={24} />, color: 'primary' },
        { title: 'Emergency Referrals', value: medicalRecords.filter(r => r.type === 'Referral' && isSameDay(r.date, today)).length.toLocaleString(), change: 'Shift Total', icon: <ShieldCheck size={24} />, color: 'purple' },
      ];
    } else if (dept === 'Dressing & Injection Room') {
      dashboardTitle = "Dressing & Injection Room";
      dashboardSubtitle = "Injectable Medications, Wound Care & Clinical Procedures";
      const readyForTx = visits.filter(v => v.status === 'Ready for Treatment').length;
      stats = [
        { title: 'Ready for Procedure', value: readyForTx.toLocaleString(), change: readyForTx > 0 ? 'Awaiting Nurse' : 'Clear', icon: <TrendingUp size={24} />, color: 'warning' },
        { title: 'Procedures Done Today', value: medicalRecords.filter(r => r.type === 'Treatment/Procedure' && isSameDay(r.date, today)).length.toLocaleString(), change: 'Administered', icon: <ShieldCheck size={24} />, color: 'success' },
        { title: 'Total Treatments', value: treatmentsLogged.toLocaleString(), change: 'Records', icon: <Activity size={24} />, color: 'primary' },
        { title: 'Low Stock Alarms', value: lowStockItems.length.toLocaleString(), change: lowStockItems.length > 0 ? 'Refill Needed' : 'Stable', icon: <Package size={24} />, color: lowStockItems.length > 0 ? 'danger' : 'success' },
      ];
    } else if (dept === 'Maternal & Child Health (MCH)' || dept === 'Immunization Room') {
      dashboardTitle = dept;
      dashboardSubtitle = "Vaccination Admin, Pediatric Growth Tracking & Antenatal Care";
      const growthLogged = medicalRecords.filter(r => r.type === 'Treatment/Procedure' && (r.title?.toLowerCase().includes('growth') || r.title?.toLowerCase().includes('height') || r.title?.toLowerCase().includes('weight'))).length;
      const vaccinesDone = medicalRecords.filter(r => r.type === 'Treatment/Procedure' && (r.title?.toLowerCase().includes('vaccine') || r.title?.toLowerCase().includes('immuniz'))).length;
      stats = [
        { title: 'Vaccines Logged', value: vaccinesDone.toLocaleString(), change: 'Cumulative', icon: <Activity size={24} />, color: 'success' },
        { title: 'Growth Screenings', value: growthLogged.toLocaleString(), change: 'Registered', icon: <TrendingUp size={24} />, color: 'primary' },
        { title: 'Maternal Visits Today', value: todayVisits.filter(v => v.type === 'OB/GYN' || v.type === 'MCH').length.toLocaleString(), change: 'Attended', icon: <Users size={24} />, color: 'purple' },
        { title: 'Total Records Logged', value: (vaccinesDone + growthLogged).toLocaleString(), change: 'Station Total', icon: <ShieldCheck size={24} />, color: 'warning' },
      ];
    } else {
      dashboardTitle = dept;
      dashboardSubtitle = "Department Overview & Nursing Care Plans";
      stats = [
        { title: 'Total Patients', value: patients.length.toLocaleString(), change: patientChange, icon: <Users size={24} />, color: 'primary' },
        { title: 'Visits Today', value: todayVisits.length.toLocaleString(), change: `Total: ${visits.length}`, icon: <Activity size={24} />, color: 'purple' },
        { title: 'Treatments Logged', value: treatmentsLogged.toLocaleString(), change: 'Records', icon: <Activity size={24} />, color: 'success' },
        { title: 'Awaiting Procedure', value: visits.filter(v => v.status === 'Ready for Treatment').length.toLocaleString(), change: 'Pending', icon: <TrendingUp size={24} />, color: 'warning' },
      ];
    }
  } else if (role === 'Patient') {
    dashboardTitle = t('myHealthPortal');
    dashboardSubtitle = t('personalMedicalRecords');
    
    // Filter data for current patient
    const myVisits = visits.filter(v => v.patientId === user._id || v.patientId === user.pid);
    const myRxs = prescriptions.filter(p => p.patientId === user._id || p.patientId === user.pid);
    const myRecords = medicalRecords.filter(r => r.patientId === user._id || r.patientId === user.pid);
    const myBills = bills.filter(b => b.patientId === user._id || b.patientId === user.pid);
    const balance = myBills.reduce((acc, b) => acc + ((b.total || 0) - (b.paidAmount || 0)), 0);

    stats = [
      { title: t('myVisits'), value: myVisits.length.toLocaleString(), change: t('lifetime'), icon: <Calendar size={24} />, color: 'primary' },
      { title: t('activeMeds'), value: myRxs.filter(p => p.status !== 'DISPENSED').length.toLocaleString(), change: t('pending'), icon: <Pill size={24} />, color: 'purple' },
      { title: t('labReports'), value: myRecords.filter(r => r.type === 'Lab Result').length.toLocaleString(), change: t('records'), icon: <FlaskConical size={24} />, color: 'success' },
      { title: t('totalBalance'), value: `$${balance.toLocaleString()}`, change: balance > 0 ? t('unpaid') : t('clear'), icon: <DollarSign size={24} />, color: balance > 0 ? 'warning' : 'success' },
    ];
  }

  // --- Queue Status Logic for Patients ---
  let myQueueStatus = null;
  if (role === 'Patient') {
    const myActiveVisit = visits.find(v => (v.patientId === user._id || v.patientId === user.pid) && !['Completed', 'Cancelled'].includes(v.status) && isSameDay(v.date, today));
    
    if (myActiveVisit) {
      const activeQueue = visits
        .filter(v => 
          v.status === myActiveVisit.status && 
          isSameDay(v.date, today) && 
          !['Completed', 'Cancelled'].includes(v.status)
        )
        .sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
      
      const myPosition = activeQueue.findIndex(v => (v.id === myActiveVisit.id || v._id === myActiveVisit._id || v.visitId === myActiveVisit.visitId)) + 1;
      
      myQueueStatus = {
        position: myPosition,
        status: myActiveVisit.status,
        doctor: myActiveVisit.doctor,
        waitTime: Math.max(0, (myPosition - 1) * 12), // Estimate: 12 mins per patient ahead
        totalInQueue: activeQueue.length
      };
    }
  }

  // --- Role-Based Content Filtering ---
  // --- Activity Feed Mapping ---
  const mapActivity = (items, type) => items.map(item => ({
    ...item,
    feedType: type,
    sortDate: item.createdAt || item.date || item.updatedAt
  }));

  const allActivityList = [
    ...mapActivity(medicalRecords, 'record'),
    ...mapActivity(prescriptions, 'prescription'),
    ...mapActivity(bills, 'bill')
  ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

  const displayActivity = role === 'Admin' 
    ? allActivityList.slice(0, 6)
    : role === 'Patient'
      ? allActivityList.filter(a => a.patientId === user._id || a.patientId === user.pid).slice(0, 6)
      : role === 'Pharmacist'
        ? allActivityList.filter(a => a.feedType === 'prescription' || a.feedType === 'bill').slice(0, 6)
        : allActivityList.slice(0, 6);

  const recentPatientsDisplay = role === 'Patient' 
    ? visits.filter(v => v.patientId === user._id || v.patientId === user.pid).slice(0, 5)
    : patients.slice(0, 5);

  // --- Chart Data Logic ---
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const chartData = last7Days.map(date => {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    if (role === 'Patient') {
      const myVisits = visits.filter(v => (v.patientId === user._id || v.patientId === user.pid) && isSameDay(v.date, date));
      const myRecords = medicalRecords.filter(r => (r.patientId === user._id || r.patientId === user.pid) && isSameDay(r.date, date));
      return { name: dayName, primary: myVisits.length, secondary: myRecords.length };
    }
    if (role === 'Pharmacist') {
      return { name: dayName, primary: prescriptions.filter(p => isSameDay(p.date, date)).length, secondary: inventory.filter(i => i.stock < 100).length };
    }
    if (role === 'Admin') {
      const revenue = bills.filter(b => isSameDay(b.date, date)).reduce((acc, b) => acc + (b.totalAmount || b.total || 0), 0);
      return { name: dayName, primary: revenue / 100, secondary: visits.filter(v => isSameDay(v.date, date)).length };
    }
    return {
      name: dayName,
      primary: visits.filter(v => isSameDay(v.date, date)).length,
      secondary: medicalRecords.filter(r => isSameDay(r.date, date)).length
    };
  });

  const chartLabels = {
    Admin: { primary: 'Revenue (x100)', secondary: 'Visits', pColor: 'var(--color-success)', sColor: 'var(--color-primary)' },
    Doctor: { primary: 'Visits', secondary: 'Records', pColor: 'var(--color-primary)', sColor: 'var(--color-purple)' },
    Pharmacist: { primary: 'Prescriptions', secondary: 'Low Stock', pColor: 'var(--color-primary)', sColor: 'var(--color-danger)' },
    Receptionist: { primary: 'Visits', secondary: 'New Patients', pColor: 'var(--color-primary)', sColor: 'var(--color-success)' },
    'Lab Technician': { primary: 'Lab Tests', secondary: 'Results', pColor: 'var(--color-warning)', sColor: 'var(--color-success)' },
    'Patient': { primary: t('myVisits'), secondary: t('records'), pColor: 'var(--color-primary)', sColor: 'var(--color-purple)' },
  }[role] || { primary: 'Visits', secondary: 'Records', pColor: 'var(--color-primary)', sColor: 'var(--color-purple)' };

  return (
    <div className="overview-page">
      <div className="overview-header">
        <div>
          <h1 className="heading-3">{dashboardTitle}</h1>
          <div className="role-badge">
            <ShieldCheck size={12} /> 
            {role === 'Patient' ? `Patient ID: ${user.pid}` : ((user?.department && user?.department !== 'Doctor' && user?.department !== 'General') 
              ? user?.department 
              : role)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {role !== 'Patient' && <button className="btn btn-outline">Reports</button>}
        </div>
      </div>
      
      {role === 'Patient' && myQueueStatus && (
        <div className="queue-status-widget animate-fade-in">
          <div className="queue-card">
            <div className="queue-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="live-pulse"></div>
                <h3 className="queue-title">{t('liveQueueStatus')}</h3>
              </div>
              <span className="queue-dept">{myQueueStatus.status}</span>
            </div>
            
            <div className="queue-body">
              <div className="queue-position-wrap">
                <span className="position-label">{t('yourPosition')}</span>
                <div className="position-number">#{myQueueStatus.position}</div>
                <span className="queue-total">{t('ofWaiting', { count: myQueueStatus.totalInQueue })}</span>
              </div>
              
              <div className="queue-details">
                <div className="detail-item">
                  <Clock size={16} />
                  <div>
                    <div className="detail-label">{t('estWait')}</div>
                    <div className="detail-value">{myQueueStatus.waitTime} {t('mins')}</div>
                  </div>
                </div>
                <div className="detail-item">
                  <ShieldCheck size={16} />
                  <div>
                    <div className="detail-label">{t('currentProvider')}</div>
                    <div className="detail-value">{myQueueStatus.doctor || 'Assigned Doctor'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="queue-progress-bar">
              <div 
                className="queue-progress-fill" 
                style={{ width: `${Math.max(10, 100 - (myQueueStatus.position / myQueueStatus.totalInQueue * 100))}%` }}
              ></div>
            </div>
            <p className="queue-footer">
              {myQueueStatus.position === 1 ? t('youAreNext') : t('pleaseTakeSeat')}
            </p>
          </div>
        </div>
      )}

      <div className="overview-stats-container">
        {/* ... stats rendering ... */}
        <div className="stats-column">
          {stats.map((stat, i) => (
            <div key={i} className="dashboard-stat-card">
              <div className={`stat-icon-wrapper ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="stat-info">
                <span className="stat-title">{stat.title}</span>
                <div className="stat-value-row">
                  <span className="stat-number">{stat.value}</span>
                  <span className={`stat-change ${
                    stat.change.startsWith('+') || ['Stable', 'Clear', 'Healthy'].includes(stat.change)
                      ? 'positive'
                      : stat.change === '0' || stat.change === '0%' || ['Items', 'Records', 'Lifetime', 'Pending'].includes(stat.change) || stat.change.startsWith('of ') || stat.change.startsWith('Total')
                        ? 'neutral'
                        : 'negative'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3 className="heading-4" style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>{role === 'Patient' ? t('myHealthTrends') : 'Activity Trends'}</h3>
            <div className="chart-legend">
              <div className="legend-dot" style={{ background: chartLabels.pColor }}></div>
              {chartLabels.primary}
              <div className="legend-dot" style={{ background: chartLabels.sColor, marginLeft: '12px' }}></div>
              {chartLabels.secondary}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartLabels.pColor} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={chartLabels.pColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartLabels.sColor} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={chartLabels.sColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-gray-400)' }} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--glass-bg)' }} />
                <Area type="monotone" dataKey="primary" stroke={chartLabels.pColor} fillOpacity={1} fill="url(#colorPrimary)" strokeWidth={2} />
                <Area type="monotone" dataKey="secondary" stroke={chartLabels.sColor} fillOpacity={1} fill="url(#colorSecondary)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="overview-panels">
        {/* Recent Activity Table or Nursing Workspace */}
        {role === 'Nurse' ? (
          <NurseWorkspacePanel 
            dept={user?.department || 'Triage & Emergency'}
            patients={patients}
            visits={visits}
            medicalRecords={medicalRecords}
            prescriptions={prescriptions}
            openAddRecordModal={openAddRecordModal}
            navigate={navigate}
            isSameDay={isSameDay}
          />
        ) : (
          <div className="panel flex-2">
            <div className="panel-header">
              <h3 className="heading-4" style={{ fontSize: 'var(--font-size-lg)' }}>{role === 'Patient' ? t('myRecentVisits') : 'Recent Patients'}</h3>
              {role !== 'Patient' && (
                <button className="btn btn-link" onClick={() => navigate('/dashboard/patients')}>View All</button>
              )}
            </div>

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>{role === 'Patient' ? t('visitId') : 'Patient ID'}</th>
                    <th>{role === 'Patient' ? t('doctorDept') : 'Patient Name'}</th>
                    <th>{role === 'Patient' ? t('type') : 'Detail'}</th>
                    <th>{role === 'Patient' ? t('date') : 'Date'}</th>
                    <th>{role === 'Patient' ? t('status') : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatientsDisplay.map((item) => (
                    <tr key={item.id} className="hover-lift" onClick={() => role !== 'Patient' && navigate(`/dashboard/patient/${item.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{role === 'Patient' ? item.visitId : item.pid}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar sm">{(role === 'Patient' ? (item.doctor || item.doctorName || 'D') : item.name).split(' ').map(n => n[0]).join('')}</div>
                          <span style={{ fontWeight: 500 }}>{role === 'Patient' ? (item.doctor || item.doctorName || item.department) : item.name}</span>
                        </div>
                      </td>
                      <td>{role === 'Patient' ? item.reason : `${item.age} yrs, ${item.gender}`}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-700)' }}>
                          {new Date(item.date || item.lastVisit).toLocaleDateString('en-GB')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${item.status === 'Completed' || item.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <div className="panel flex-1">
          <div className="panel-header">
            <h3 className="heading-4" style={{ fontSize: 'var(--font-size-lg)' }}>{role === 'Patient' ? t('recentActivity') : 'Recent Activity'}</h3>
          </div>
          <div className="activity-feed">
            {displayActivity.map((act, i) => {
              const ptName = act.patientName || patients.find(p => p.id === act.patientId || p._id === act.patientId)?.name || 'Patient';
              let iconColor = 'var(--color-primary)';
              let title = (act.feedType || act.type || 'Activity').toUpperCase();
              let text = '';

              if (act.feedType === 'record' || act.type) {
                text = `${act.type || 'Medical record'} added for ${ptName}`;
                iconColor = 'var(--color-primary)';
              } else if (act.feedType === 'prescription') {
                text = `Prescription ${act.status} for ${ptName}`;
                iconColor = 'var(--color-purple)';
              } else if (act.feedType === 'bill') {
                text = `Invoice ${act.status} - ${ptName}`;
                iconColor = 'var(--color-success)';
              }

              return (
                <div key={i} className="activity-item">
                  <div className="activity-dot" style={{ background: iconColor, boxShadow: `0 0 10px ${iconColor}` }}></div>
                  <div className="activity-content">
                    <p className="activity-text">
                      <strong>{title}</strong>: {text}
                    </p>
                    <span className="activity-time">{new Date(act.sortDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NurseWorkspacePanel({ dept, patients, visits, medicalRecords, prescriptions, openAddRecordModal, navigate, isSameDay }) {
  const today = new Date().toISOString().split('T')[0];
  
  // Triage logic: find today's visits that are 'Scheduled' or 'Waiting'
  const triageQueue = visits.filter(v => 
    ['Scheduled', 'Waiting'].includes(v.status) && isSameDay(v.date, today)
  );

  // Dressing & Injection logic: find visits that are 'Ready for Treatment'
  const treatmentQueue = visits.filter(v => v.status === 'Ready for Treatment');

  // MCH / Vaccine logic: find patients today with MCH/Pediatric reason or general check
  const mchQueue = visits.filter(v => 
    isSameDay(v.date, today) && !['Completed', 'Cancelled'].includes(v.status)
  );

  if (dept === 'Triage & Emergency' || dept === 'OPD Nursing') {
    return (
      <div className="panel flex-2 animate-fade-in">
        <div className="panel-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <h3 className="heading-4" style={{ fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-pulse"></span>
              Live Triage Intake Queue
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>
              {triageQueue.length} patient(s) waiting for initial vital signs and priority screening.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Encounter Details</th>
                <th>Arrival Time</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {triageQueue.map((visit) => {
                const pt = patients.find(p => p.id === visit.patientId || p._id === visit.patientId);
                const ptName = visit.patientName || pt?.name || 'Unknown Patient';
                const ptPid = pt?.pid || 'PT-XXX';
                
                return (
                  <tr key={visit.id} className="hover-lift">
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{ptPid}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar sm">{ptName.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{ptName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>{pt?.age ? `${pt.age} yrs, ${pt.gender}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{visit.type}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>{visit.reason || 'General checkup'}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-700)' }}>
                        {visit.time || 'Today'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px' }}
                        onClick={() => openAddRecordModal(visit.patientId, visit.id)}
                      >
                        Triage & Vitals
                      </button>
                    </td>
                  </tr>
                );
              })}
              {triageQueue.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-state" style={{ padding: '40px 0', textShadow: 'none' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontWeight: 500, color: 'white' }}>Queue Clear!</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>All patients have been triaged.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (dept === 'Dressing & Injection Room') {
    return (
      <div className="panel flex-2 animate-fade-in">
        <div className="panel-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <h3 className="heading-4" style={{ fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-pulse" style={{ backgroundColor: 'var(--color-success)', boxShadow: '0 0 8px var(--color-success)' }}></span>
              Dispensed Procedures & Treatment Queue
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>
              {treatmentQueue.length} patient(s) ready for clinical procedures, injections, or dressing.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Prescribed Procedure</th>
                <th>Dose Info</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {treatmentQueue.map((visit) => {
                const pt = patients.find(p => p.id === visit.patientId || p._id === visit.patientId);
                const ptName = visit.patientName || pt?.name || 'Unknown Patient';
                const ptPid = pt?.pid || 'PT-XXX';
                
                // Find prescriptions for this visit
                const rxList = prescriptions.filter(p => p.visitId === visit.id);
                const procedures = rxList.flatMap(p => p.items.filter(i => {
                  if (i.requiresNurse === true) return true;
                  const n = (i.name || '').toLowerCase();
                  return n.includes('inj') || n.includes('syringe') || n.includes('vial') || n.includes('iv') || n.includes('im') || n.includes('amp') || n.includes('diclofenac');
                }));
                
                // Track doses
                const prevTreatments = medicalRecords.filter(r => r.visitId === visit.id && r.type === 'Treatment/Procedure');
                const dosesLogged = prevTreatments.length;
                
                let maxDoses = 1;
                procedures.forEach(p => {
                  const m = (p.dosage || '').match(/(\d+)\s*day/i);
                  if (m) maxDoses = Math.max(maxDoses, parseInt(m[1]));
                });

                const procedureLabel = procedures.map(p => p.name).join(', ') || 'General Dressing/Treatment';

                return (
                  <tr key={visit.id} className="hover-lift">
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{ptPid}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar sm" style={{ background: 'var(--color-purple)' }}>{ptName.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{ptName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>{pt?.age ? `${pt.age} yrs, ${pt.gender}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: 500, color: 'white' }}>{procedureLabel}</span>
                      <div style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>Ordered by Doctor</div>
                    </td>
                    <td>
                      {procedures.length > 0 && maxDoses > 1 ? (
                        <div>
                          <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 8px' }}>
                            Dose {dosesLogged + 1} of {maxDoses}
                          </span>
                          <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, ((dosesLogged + 1) / maxDoses) * 100)}%`, height: '100%', background: 'var(--color-primary)' }}></div>
                          </div>
                        </div>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-gray-400)', fontSize: '10px' }}>
                          Single Session
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px', background: 'var(--color-success)', color: 'var(--color-gray-900)', boxShadow: '0 4px 12px rgba(52, 211, 153, 0.2)' }}
                        onClick={() => openAddRecordModal(visit.patientId, visit.id)}
                      >
                        Perform Treatment
                      </button>
                    </td>
                  </tr>
                );
              })}
              {treatmentQueue.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-state" style={{ padding: '40px 0', textShadow: 'none' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛡️</div>
                    <div style={{ fontWeight: 500, color: 'white' }}>Suite Ready!</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>No pending dressing or injection orders.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // MCH / Vaccines desk
  return (
    <div className="panel flex-2 animate-fade-in">
      <div className="panel-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <h3 className="heading-4" style={{ fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👶 Maternal, Vaccine & Child Health Desk
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>
            Quick clinical recording desk for pediatric patients and vaccinations.
          </p>
        </div>
      </div>

      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Reason for Visit</th>
              <th>Quick Log Options</th>
            </tr>
          </thead>
          <tbody>
            {mchQueue.slice(0, 5).map((visit) => {
              const pt = patients.find(p => p.id === visit.patientId || p._id === visit.patientId);
              const ptName = visit.patientName || pt?.name || 'Unknown Patient';
              
              return (
                <tr key={visit.id} className="hover-lift">
                  <td>
                    <div style={{ fontWeight: 500 }}>{ptName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>{pt?.age ? `${pt.age} yrs, ${pt.gender}` : ''}</div>
                  </td>
                  <td>
                    <span className="type-tag">{visit.type}</span>
                    <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: '2px' }}>{visit.reason || 'General checkup'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                        onClick={() => openAddRecordModal(visit.patientId, visit.id)}
                      >
                        💉 Log Vaccine
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                        onClick={() => openAddRecordModal(visit.patientId, visit.id)}
                      >
                        📈 Growth Chart
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {mchQueue.length === 0 && (
              <tr>
                <td colSpan="3" className="empty-state">
                  No active patients checked in today for child/maternal care.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
