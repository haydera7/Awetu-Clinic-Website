import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Pill, CreditCard, AlertTriangle, CheckCircle2, Search, Plus, Package, Receipt, DollarSign, FileText, X, Trash2 } from 'lucide-react';
import './PatientsList.css'; // Re-use list styles
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { exportMedicalRecordToPdf, exportReferralToPdf, exportBillReceiptToPdf } from '../../utils/ExportPdf';

export default function PharmacyBilling() {
  const { user } = useAuth();
  const { showToast } = useSocket();

  const { inventory, bills, prescriptions, updateInventoryStock, addInventoryItem, addPaymentToBill, createManualInvoice, dispensePrescription, patients, visits, deleteBill } = useData();
  const [activeTab, setActiveTab] = useState('prescriptions'); // 'prescriptions', 'inventory', 'billing'
  const [searchRx, setSearchRx] = useState('');

  // Dispense Modal State
  const [selectedRx, setSelectedRx] = useState(null);
  const [dispenseForm, setDispenseForm] = useState([]);

  // Inventory Modal States
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [newMedForm, setNewMedForm] = useState({ name: '', category: 'General', stock: 0, unitPrice: 0 });
  const [adjustStockMed, setAdjustStockMed] = useState(null);
  const [adjustStockAmount, setAdjustStockAmount] = useState('');

  // Manual Invoice State
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [manualInvoiceForm, setManualInvoiceForm] = useState({
    patientName: '',
    items: [{ medicineId: '', qty: 1 }]
  });

  // Payment Modal State
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash' });

  const lowStockCount = useMemo(() => inventory.filter(m => m.stock <= 100).length, [inventory]);
  const unpaidTotal = useMemo(() => bills.filter(b => b.status !== 'Paid').reduce((acc, b) => acc + (b.total - (b.paidAmount || 0)), 0), [bills]);
  const pendingRxCount = useMemo(() => prescriptions.filter(rx => rx.status === 'PRESCRIBED').length, [prescriptions]);



  const manageInventoryAndBilling = ['Pharmacist'].includes(user?.role);
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(rx => {
      const patient = patients.find(p => p.id === rx.patientId || p._id === rx.patientId);
      const patientName = patient ? patient.name.toLowerCase() : '';
      return patientName.includes(searchRx.toLowerCase()) || rx.id.toLowerCase().includes(searchRx.toLowerCase());
    });
  }, [prescriptions, searchRx, patients]);

  const handleOpenDispenseModal = (rx) => {
    setSelectedRx(rx);
    // Initialize dispense form
    const initialForm = rx.items.map(item => {
      const isManual = item.medicineId === 'MANUAL';

      // Match inventory by all possible ID formats
      const med = !isManual ? inventory.find(m =>
        m.id === item.medicineId ||
        m._id === item.medicineId ||
        m.itemId === item.medicineId
      ) : null;

      const availableStock = med ? med.stock : (isManual ? 9999 : 0);
      const defaultQty = Math.min(item.requestedQty - item.dispensedQty, availableStock);

      return {
        itemId: item.itemId,
        medicineId: item.medicineId,
        requestedQty: item.requestedQty,
        previouslyDispensed: item.dispensedQty,
        dispensedQty: defaultQty,
        status: defaultQty === 0 && availableStock === 0 ? 'OUT_OF_STOCK' : 'DISPENSED',
        availableStock,
        resolvedName: med ? med.name : item.name,
        dosage: item.dosage,
        isManual,
        price: med ? med.unitPrice : 0,
        requiresTreatment: (med?.name || item.name || '').toLowerCase().includes('inj') || (med?.name || item.name || '').toLowerCase().includes('syringe') || (med?.name || item.name || '').toLowerCase().includes('vaccine'), // Auto-detect but allow override
        nurseDepartment: (med?.name || item.name || '').toLowerCase().includes('vaccine') ? 'Immunization Room' : (((med?.name || item.name || '').toLowerCase().includes('inj') || (med?.name || item.name || '').toLowerCase().includes('syringe')) ? 'Dressing & Injection Room' : 'None')
      };
    });
    setDispenseForm(initialForm);
  };


  const handleDispensePriceChange = (itemId, price) => {
    setDispenseForm(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, price: Number(price) || 0 };
      }
      return item;
    }));
  };

  const handleDispenseDosageChange = (itemId, dosage) => {
    setDispenseForm(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, dosage: dosage };
      }
      return item;
    }));
  };

  const handleToggleTreatment = (itemId) => {
    setDispenseForm(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, requiresTreatment: !item.requiresTreatment };
      }
      return item;
    }));
  };

  const handleNurseDepartmentChange = (itemId, dept) => {
    setDispenseForm(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { 
          ...item, 
          nurseDepartment: dept, 
          requiresTreatment: dept !== 'None' 
        };
      }
      return item;
    }));
  };

  const handleDispenseRequestedQtyChange = (itemId, qty) => {
    setDispenseForm(prev => prev.map(item => {
      if (item.itemId === itemId) {
        const newQty = Math.max(0, Number(qty) || 0);
        return { ...item, requestedQty: newQty, dispensedQty: newQty };
      }
      return item;
    }));
  };

  const handleMarkOutOfStock = (itemId) => {
    setDispenseForm(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, dispensedQty: 0, status: 'OUT_OF_STOCK' };
      }
      return item;
    }));
  };

  const handleMarkReferred = (itemId) => {
    const item = dispenseForm.find(i => i.itemId === itemId);
    const patient = patients.find(p => p.id === selectedRx?.patientId || p._id === selectedRx?.patientId);

    if (item && patient && selectedRx) {
      exportReferralToPdf(selectedRx, item, patient);
    }

    setDispenseForm(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, dispensedQty: 0, status: 'REFERRED' };
      }
      return item;
    }));
  };

  const handleDispenseSubmit = async () => {
    if (!selectedRx) return;
    try {
      await dispensePrescription(selectedRx.id, dispenseForm);
      
      const requiresNurse = dispenseForm.some(item => item.requiresTreatment);
      const nurseDeptNames = dispenseForm
        .filter(item => item.requiresTreatment && item.nurseDepartment && item.nurseDepartment !== 'None')
        .map(item => item.nurseDepartment);
      
      const uniqueNurseDepts = Array.from(new Set(nurseDeptNames));

      if (requiresNurse && uniqueNurseDepts.length > 0) {
        showToast(`Medication dispensed & patient routed to ${uniqueNurseDepts.join(', ')}!`, "success");
      } else {
        showToast("Medication dispensed successfully!", "success");
      }
      setSelectedRx(null);
    } catch (err) {
      showToast(err.message || "Failed to dispense prescription", "danger");
    }
  };

  const handleAddMedicineSubmit = async (e) => {
    e.preventDefault();
    try {
      await addInventoryItem({
        name: newMedForm.name,
        category: newMedForm.category,
        stock: Number(newMedForm.stock),
        unitPrice: Number(newMedForm.unitPrice)
      });
      showToast(`Medicine "${newMedForm.name}" successfully added to inventory!`, "success");
      setIsAddMedOpen(false);
      setNewMedForm({ name: '', category: 'General', stock: 0, unitPrice: 0 });
    } catch (err) {
      showToast(err.message || "Failed to add medicine", "danger");
    }
  };

  const handleAdjustStockSubmit = async (e) => {
    e.preventDefault();
    if (!adjustStockMed) return;

    try {
      const amount = Number(adjustStockAmount);
      if (!isNaN(amount)) {
        await updateInventoryStock(adjustStockMed.id, amount);
        showToast(`Stock for ${adjustStockMed.name} successfully adjusted by ${amount > 0 ? '+' : ''}${amount}!`, "success");
      }
      setAdjustStockMed(null);
      setAdjustStockAmount('');
    } catch (err) {
      showToast(err.message || "Failed to adjust stock", "danger");
    }
  };

  const handleCreateManualInvoice = async (e) => {
    e.preventDefault();
    const validItems = manualInvoiceForm.items.filter(i => i.medicineId && i.qty > 0);
    if (validItems.length > 0) {
      try {
        await createManualInvoice({
          patientName: manualInvoiceForm.patientName,
          items: validItems
        });
        showToast(`Invoice for ${manualInvoiceForm.patientName} successfully created!`, "success");
        setIsCreateInvoiceOpen(false);
        setManualInvoiceForm({ patientName: '', items: [{ medicineId: '', qty: 1 }] });
      } catch (err) {
        showToast(err.message || "Failed to create invoice", "danger");
      }
    }
  };

  return (
    <div className="dashboard-page animate-fade-in" style={{ padding: 'var(--spacing-6)', maxWidth: '1600px', margin: '0 auto' }}>

      {/* KPI Header Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-8)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '16px' }}>
            <FileText size={28} className="text-primary" />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--color-gray-400)', fontWeight: '500' }}>Pending Prescriptions</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{pendingRxCount} <span style={{ fontSize: '16px', color: 'var(--color-gray-500)', fontWeight: 'normal' }}>Waiting</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <div style={{ padding: '16px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '16px' }}>
            <AlertTriangle size={28} className="text-danger" />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--color-gray-400)', fontWeight: '500' }}>Critical Low Stock</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{lowStockCount} <span style={{ fontSize: '16px', color: 'var(--color-gray-500)', fontWeight: 'normal' }}>Items</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <div style={{ padding: '16px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '16px' }}>
            <DollarSign size={28} className="text-warning" />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--color-gray-400)', fontWeight: '500' }}>Pending Revenue</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{unpaidTotal} <span style={{ fontSize: '16px', color: 'var(--color-gray-500)', fontWeight: 'normal' }}>ETB</span></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', borderBottom: '1px solid var(--glass-border)' }}>
        <button
          className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', color: activeTab === 'prescriptions' ? 'var(--color-primary)' : 'var(--color-gray-400)', borderBottom: activeTab === 'prescriptions' ? '2px solid var(--color-primary)' : '2px solid transparent', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileText size={18} /> Prescriptions
        </button>
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', color: activeTab === 'inventory' ? 'var(--color-primary)' : 'var(--color-gray-400)', borderBottom: activeTab === 'inventory' ? '2px solid var(--color-primary)' : '2px solid transparent', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Package size={18} /> Inventory
        </button>
        <button
          className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', color: activeTab === 'billing' ? 'var(--color-primary)' : 'var(--color-gray-400)', borderBottom: activeTab === 'billing' ? '2px solid var(--color-primary)' : '2px solid transparent', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Receipt size={18} /> Billing
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-8)' }}>

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                Pharmacy Queue
              </h2>
              <div className="search-bar" style={{ background: 'var(--color-highlight)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-full)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', width: '250px' }}>
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search patient or RX ID..."
                  value={searchRx}
                  onChange={(e) => setSearchRx(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-white)', outline: 'none', width: '100%', fontSize: '14px' }}
                />
              </div>
            </div>

            <div className="table-card glass-panel hover-glow-card" style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '16px' }}>Prescription</th>
                      <th style={{ padding: '16px' }}>Patient</th>
                      <th style={{ padding: '16px' }}>Date</th>
                      <th style={{ padding: '16px' }}>Items</th>
                      <th style={{ padding: '16px' }}>Status</th>
                      {manageInventoryAndBilling && <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrescriptions.map(rx => {
                      const patient = patients.find(p => p.id === rx.patientId || p._id === rx.patientId);
                      return (
                        <tr key={rx.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background var(--transition-fast)' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ padding: '8px', background: 'var(--color-highlight)', borderRadius: '8px' }}>
                                <FileText size={16} className="text-primary" />
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', fontSize: '15px' }}>{rx.id}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Visit: {rx.visitId}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px', fontWeight: '500' }}>{patient ? patient.name : 'Unknown'}</td>
                          <td style={{ padding: '16px', color: 'var(--color-gray-300)', fontSize: '14px' }}>{new Date(rx.date).toLocaleDateString()}</td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>{rx.items.length} meds</td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {rx.status === 'PRESCRIBED' && <span className="badge badge-warning">Pending</span>}
                              {rx.status === 'PARTIALLY_DISPENSED' && <span className="badge badge-primary">Partial</span>}
                              {rx.status === 'DISPENSED' && <span className="badge badge-success">Dispensed</span>}
                              {rx.status === 'CANCELLED' && <span className="badge badge-danger">Cancelled</span>}
                              {rx.status === 'REFERRED' && <span className="badge badge-info">Referred</span>}

                              {/* Payment Evidence Badge */}
                              {bills.find(b => b.referenceId === rx.id && b.status === 'Paid') ? (
                                <span className="badge badge-success" style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>PAID</span>
                              ) : bills.find(b => b.referenceId === rx.id) ? (
                                <span className="badge badge-danger" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>UNPAID</span>
                              ) : null}
                            </div>
                          </td>
                          {manageInventoryAndBilling && <td style={{ padding: '16px', textAlign: 'right' }}>
                            {(rx.status === 'PRESCRIBED' || rx.status === 'PARTIALLY_DISPENSED') && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                {(() => {
                                  const associatedBill = bills.find(b => b.referenceId === rx.id);
                                  const isUnpaid = associatedBill && associatedBill.status !== 'Paid';
                                  
                                  return (
                                    <>
                                      <button
                                        className={`btn ${isUnpaid ? 'btn-warning' : 'btn-primary'}`}
                                        style={{ 
                                          padding: '6px 16px', 
                                          fontSize: '13px',
                                          background: isUnpaid ? '#f59e0b' : undefined,
                                          borderColor: isUnpaid ? '#f59e0b' : undefined
                                        }}
                                        onClick={() => handleOpenDispenseModal(rx)}
                                      >
                                        Dispense {isUnpaid && 'Anyway'}
                                      </button>
                                      {isUnpaid && (
                                        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                          <AlertTriangle size={10} /> PAYMENT PENDING
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            {rx.status === 'DISPENSED' && (
                              <button
                                className="btn"
                                style={{
                                  padding: '6px 16px',
                                  fontSize: '13px',
                                  background: 'var(--color-highlight)',
                                  color: 'var(--color-gray-400)',
                                  cursor: 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                disabled
                              >
                                {visits.find(v => v.id === rx.visitId)?.status === 'Ready for Treatment' ? '💉 Sent to Nurse' : '✅ Finished'}
                              </button>
                            )}
                          </td>}
                        </tr>
                      );
                    })}
                    {filteredPrescriptions.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                          No prescriptions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                Active Inventory
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="search-bar" style={{ background: 'var(--color-highlight)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-full)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px', width: '200px' }}>
                  <Search size={16} className="text-muted" />
                  <input type="text" placeholder="Search meds..." style={{ background: 'transparent', border: 'none', color: 'var(--color-white)', outline: 'none', width: '100%', fontSize: '14px' }} />
                </div>
                {manageInventoryAndBilling && <button
                  className="btn btn-primary"
                  onClick={() => setIsAddMedOpen(true)}
                  style={{ padding: '6px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Add Medicine
                </button>}
              </div>
            </div>

            <div className="table-card glass-panel hover-glow-card" style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '16px' }}>Medication</th>
                      <th style={{ padding: '16px' }}>Stock</th>
                      <th style={{ padding: '16px' }}>Price</th>
                      <th style={{ padding: '16px' }}>Status</th>
                      {manageInventoryAndBilling && <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(med => (
                      <tr key={med.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background var(--transition-fast)' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', background: 'var(--color-highlight)', borderRadius: '8px' }}>
                              <Package size={16} className="text-primary" />
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '15px' }}>{med.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>{med.category}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '15px', fontWeight: '500' }}>{med.stock} <span className="text-muted" style={{ fontSize: '12px' }}>units</span></td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>{med.unitPrice} ETB</td>
                        <td style={{ padding: '16px' }}>
                          {med.status === 'Low Stock' ? (
                            <span className="badge badge-danger"><AlertTriangle size={12} /> Low Stock</span>
                          ) : (
                            <span className="badge badge-success"><CheckCircle2 size={12} /> In Stock</span>
                          )}
                        </td>
                        {manageInventoryAndBilling && <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button
                            className="btn"
                            style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--color-highlight)', color: 'var(--color-white)', border: '1px solid var(--glass-border)' }}
                            onClick={() => setAdjustStockMed(med)}
                          >
                            Adjust Stock
                          </button>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                Recent Invoices
              </h2>
              {manageInventoryAndBilling && <button
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={() => setIsCreateInvoiceOpen(true)}
              >
                <Plus size={16} /> Create Invoice
              </button>}
            </div>

            <div className="table-card glass-panel hover-glow-card" style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '16px' }}>Invoice</th>
                      <th style={{ padding: '16px' }}>Date</th>
                      <th style={{ padding: '16px' }}>Source</th>
                      <th style={{ padding: '16px' }}>Amount</th>
                      <th style={{ padding: '16px' }}>Status</th>
                      <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(bill => (
                      <tr key={bill.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background var(--transition-fast)' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', background: 'var(--color-highlight)', borderRadius: '8px' }}>
                              <Receipt size={16} className="text-success" />
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '15px' }}>{bill.patientName}</div>
                              <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>{bill.invoiceId || bill.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--color-gray-300)', fontSize: '14px' }}>{bill.date ? new Date(bill.date).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '16px', color: 'var(--color-gray-300)', fontSize: '14px' }}>{bill.source || 'GENERAL'}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '600', fontSize: '15px' }}>{bill.total} ETB</div>
                          {bill.status !== 'Paid' && <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>Rem: {bill.total - (bill.paidAmount || 0)} ETB</div>}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {bill.status === 'Unpaid' && <span className="badge badge-danger">Unpaid</span>}
                          {bill.status === 'Partial' && <span className="badge badge-warning">Partial</span>}
                          {bill.status === 'Paid' && <span className="badge badge-success">Paid</span>}
                        </td>

                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {/* Receipt Button: Visible to all authorized staff for Paid bills */}
                            {bill.status === 'Paid' && (
                              <button
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--color-highlight)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}
                                onClick={() => {
                                  const patient = patients.find(p => p.id === bill.patientId || p._id === bill.patientId);
                                  exportBillReceiptToPdf(bill, patient);
                                }}
                              >
                                Receipt
                              </button>
                            )}

                            {/* Accept Payment: Only visible to Cashier/Pharmacist for Unpaid bills */}
                            {(user?.role === 'Cashier' || user?.role === 'Pharmacist') && bill.status !== 'Paid' && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                onClick={() => setSelectedBillForPayment(bill)}
                              >
                                Accept Payment
                              </button>
                            )}

                            {/* Delete Button: Admin Only */}
                            {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
                              <button
                                className="btn"
                                style={{ padding: '6px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                onClick={() => deleteBill(bill._id || bill.id)}
                                title="Delete Invoice"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Dispense Modal */}
      {selectedRx && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ width: '800px', maxWidth: '90%', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)', background: 'var(--color-bg-base)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>Dispense Medication</h2>
                <p style={{ color: 'var(--color-gray-400)', fontSize: '14px', marginTop: '4px' }}>RX ID: {selectedRx.id}</p>
              </div>
              <button onClick={() => setSelectedRx(null)} style={{ background: 'none', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', padding: '8px', borderRadius: '50%', ':hover': { background: 'var(--color-highlight)' } }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: 'var(--spacing-6)' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '12px' }}>Medication</th>
                    <th style={{ padding: '12px' }}>Quantity</th>
                    <th style={{ padding: '12px' }}>In Stock</th>
                    <th style={{ padding: '12px', width: '120px' }}>Unit Price</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRx.items.map((item, index) => {
                    const formItem = dispenseForm.find(df => df.itemId === item.itemId);
                    const isDispensedAlready = item.status === 'DISPENSED' || (item.requestedQty > 0 && item.requestedQty === item.dispensedQty);

                    return (
                      <tr key={index} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {formItem?.resolvedName || item.name || '—'}
                            {formItem?.isManual && <span style={{ fontSize: '10px', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>MANUAL</span>}
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <label style={{ fontSize: '10px', color: 'var(--color-gray-500)', display: 'block' }}>Dosage Instructions</label>
                            <input
                              type="text"
                              placeholder="e.g., 1 tab 3x daily"
                              value={formItem?.dosage || ''}
                              onChange={(e) => handleDispenseDosageChange(item.itemId, e.target.value)}
                              style={{ width: '100%', padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--color-highlight)', color: 'white', marginTop: '2px' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {isDispensedAlready ? (
                            <span>{item.requestedQty}</span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={formItem?.requestedQty || 0}
                              onChange={(e) => handleDispenseRequestedQtyChange(item.itemId, e.target.value)}
                              style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--color-highlight)', color: 'white' }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {formItem?.isManual ? (
                            <span style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>External</span>
                          ) : (
                            <>
                              {formItem?.availableStock || 0}
                              {(formItem?.availableStock || 0) < (formItem.requestedQty - item.dispensedQty) && <AlertTriangle size={12} className="text-warning" style={{ marginLeft: '4px' }} />}
                            </>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={!formItem?.isManual}
                              value={formItem?.price || 0}
                              onChange={(e) => handleDispensePriceChange(item.itemId, e.target.value)}
                              style={{
                                width: '100px',
                                padding: '6px 8px 6px 20px',
                                borderRadius: '4px',
                                border: '1px solid var(--glass-border)',
                                background: formItem?.isManual ? 'var(--color-highlight)' : 'transparent',
                                color: formItem?.isManual ? 'white' : 'var(--color-gray-500)',
                                opacity: formItem?.isManual ? 1 : 0.7
                              }}
                            />
                            <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--color-gray-500)' }}>$</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {!isDispensedAlready && (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn"
                                title="Mark Out of Stock"
                                onClick={() => handleMarkOutOfStock(item.itemId)}
                                style={{ fontSize: '11px', padding: '4px 6px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}
                              >
                                OOS
                              </button>
                              <button
                                className="btn"
                                title="Refer Patient (Buy Outside)"
                                onClick={() => handleMarkReferred(item.itemId)}
                                style={{ fontSize: '11px', padding: '4px 6px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(56, 189, 248, 0.2)' }}
                              >
                                Refer
                              </button>
                            </div>
                          )}
                          {formItem?.status === 'REFERRED' && <span className="badge badge-primary" style={{ fontSize: '10px' }}>Referred</span>}
                          {formItem?.status === 'OUT_OF_STOCK' && <span className="badge badge-danger" style={{ fontSize: '10px' }}>OOS</span>}

                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <label style={{ fontSize: '10px', color: 'var(--color-gray-400)', fontWeight: '500' }}>Send to Nursing Station:</label>
                            <select
                              value={formItem?.nurseDepartment || 'None'}
                              onChange={(e) => handleNurseDepartmentChange(item.itemId, e.target.value)}
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '11px', 
                                borderRadius: '6px', 
                                border: '1px solid var(--color-border)', 
                                background: formItem?.requiresTreatment ? 'var(--color-bg-surface-hover)' : 'var(--color-gray-800)', 
                                color: 'var(--color-white)',
                                cursor: 'pointer',
                                outline: 'none',
                                fontWeight: '500',
                                width: '180px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <option value="None" style={{ background: 'var(--color-gray-900)', color: 'var(--color-white)' }}>None (Outpatient)</option>
                              <option value="Dressing & Injection Room" style={{ background: 'var(--color-gray-900)', color: 'var(--color-white)' }}>Dressing & Injection Room</option>
                              <option value="Immunization Room" style={{ background: 'var(--color-gray-900)', color: 'var(--color-white)' }}>Immunization Room</option>
                              <option value="Maternal & Child Health (MCH)" style={{ background: 'var(--color-gray-900)', color: 'var(--color-white)' }}>Maternal & Child Health (MCH)</option>
                              <option value="ART/HIV Clinic" style={{ background: 'var(--color-gray-900)', color: 'var(--color-white)' }}>ART/HIV Clinic</option>
                              <option value="Triage & Emergency" style={{ background: 'var(--color-gray-900)', color: 'var(--color-white)' }}>Triage & Emergency</option>
                              <option value="OPD Nursing" style={{ background: 'var(--color-gray-900)', color: 'var(--color-white)' }}>OPD Nursing Room</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn"
                onClick={() => setSelectedRx(null)}
                style={{ padding: '10px 20px', background: 'var(--color-highlight)', color: 'var(--color-white)' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDispenseSubmit}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle2 size={18} /> Confirm Dispense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Medicine Modal */}
      {isAddMedOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ width: '400px', maxWidth: '90%', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)', background: 'var(--color-bg-base)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>Add New Medicine</h2>
              <button onClick={() => setIsAddMedOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', padding: '8px' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddMedicineSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Medicine Name</label>
                  <input type="text" className="form-control" required value={newMedForm.name} onChange={e => setNewMedForm({ ...newMedForm, name: e.target.value })} placeholder="e.g., Aspirin 100mg" />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input type="text" className="form-control" required value={newMedForm.category} onChange={e => setNewMedForm({ ...newMedForm, category: e.target.value })} placeholder="e.g., Painkiller" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Initial Stock</label>
                    <input type="number" min="0" className="form-control" required value={newMedForm.stock} onChange={e => setNewMedForm({ ...newMedForm, stock: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Unit Price (ETB)</label>
                    <input type="number" min="0" step="0.01" className="form-control" required value={newMedForm.unitPrice} onChange={e => setNewMedForm({ ...newMedForm, unitPrice: e.target.value })} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn" onClick={() => setIsAddMedOpen(false)} style={{ padding: '10px 20px', background: 'var(--color-highlight)', color: 'var(--color-white)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Save Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustStockMed && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ width: '400px', maxWidth: '90%', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)', background: 'var(--color-bg-base)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>Adjust Stock</h2>
                <p style={{ color: 'var(--color-gray-400)', fontSize: '14px', marginTop: '4px' }}>{adjustStockMed.name}</p>
              </div>
              <button onClick={() => setAdjustStockMed(null)} style={{ background: 'none', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', padding: '8px' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdjustStockSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--color-highlight)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-gray-400)', fontSize: '14px' }}>Current Stock</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{adjustStockMed.stock}</p>
                </div>
                <div>
                  <label className="form-label">Adjustment Amount</label>
                  <input type="number" className="form-control" required value={adjustStockAmount} onChange={e => setAdjustStockAmount(e.target.value)} placeholder="e.g., +100 or -5" />
                  <p style={{ color: 'var(--color-gray-500)', fontSize: '12px', marginTop: '4px' }}>Use negative numbers to reduce stock manually.</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn" onClick={() => setAdjustStockMed(null)} style={{ padding: '10px 20px', background: 'var(--color-highlight)', color: 'var(--color-white)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Manual Invoice Modal */}
      {isCreateInvoiceOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)', background: 'var(--color-bg-base)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>Create Walk-in Invoice</h2>
              <button onClick={() => setIsCreateInvoiceOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', padding: '8px' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateManualInvoice}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Patient Name (Optional)</label>
                  <input type="text" className="form-control" value={manualInvoiceForm.patientName} onChange={e => setManualInvoiceForm({ ...manualInvoiceForm, patientName: e.target.value })} placeholder="Walk-in Patient" />
                </div>

                <div>
                  <label className="form-label">Items to Bill</label>
                  {manualInvoiceForm.items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <select
                          className="form-control"
                          required
                          value={item.medicineId}
                          onChange={(e) => {
                            const newItems = [...manualInvoiceForm.items];
                            newItems[index].medicineId = e.target.value;
                            setManualInvoiceForm({ ...manualInvoiceForm, items: newItems });
                          }}
                          style={{ appearance: 'auto' }}
                        >
                          <option value="" disabled>-- Select Item --</option>
                          {inventory.map(med => (
                            <option key={med.id} value={med.id}>{med.name} ({med.unitPrice} ETB) - Stock: {med.stock}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: '100px' }}>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          required
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...manualInvoiceForm.items];
                            newItems[index].qty = Number(e.target.value);
                            setManualInvoiceForm({ ...manualInvoiceForm, items: newItems });
                          }}
                        />
                      </div>
                      {manualInvoiceForm.items.length > 1 && (
                        <button type="button" className="btn" style={{ background: 'rgba(248, 113, 113, 0.1)', color: 'var(--color-danger)', border: 'none', padding: '0 12px' }} onClick={() => {
                          const newItems = manualInvoiceForm.items.filter((_, i) => i !== index);
                          setManualInvoiceForm({ ...manualInvoiceForm, items: newItems });
                        }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline" style={{ fontSize: '13px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
                    setManualInvoiceForm({
                      ...manualInvoiceForm,
                      items: [...manualInvoiceForm.items, { medicineId: '', qty: 1 }]
                    });
                  }}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn" onClick={() => setIsCreateInvoiceOpen(false)} style={{ padding: '10px 20px', background: 'var(--color-highlight)', color: 'var(--color-white)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Generate Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept Payment Modal */}
      {selectedBillForPayment && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ width: '400px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-6)', background: 'var(--color-bg-base)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>Accept Payment</h2>
              <button onClick={() => setSelectedBillForPayment(null)} style={{ background: 'none', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', padding: '8px' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ background: 'var(--color-highlight)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-gray-400)', fontSize: '13px' }}>Total Amount</span>
                <span style={{ fontWeight: '600' }}>{selectedBillForPayment.total} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-gray-400)', fontSize: '13px' }}>Paid So Far</span>
                <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>{selectedBillForPayment.paidAmount || 0} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--color-gray-300)', fontSize: '14px', fontWeight: 'bold' }}>Remaining Balance</span>
                <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>{selectedBillForPayment.total - (selectedBillForPayment.paidAmount || 0)} ETB</span>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const amount = Number(paymentForm.amount);
              const remaining = selectedBillForPayment.total - (selectedBillForPayment.paidAmount || 0);
              if (amount > 0 && amount <= remaining) {
                addPaymentToBill(selectedBillForPayment.id, amount, paymentForm.method, 'System');
                setSelectedBillForPayment(null);
                setPaymentForm({ amount: '', method: 'Cash' });
              }
            }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Payment Amount (ETB)</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  min="1"
                  max={selectedBillForPayment.total - (selectedBillForPayment.paidAmount || 0)}
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Payment Method</label>
                <select
                  className="form-control"
                  value={paymentForm.method}
                  onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_banking">Mobile Banking(CBE)</option>
                  <option value="cbe_birr">CBE_Birr</option>
                  <option value="telebirr">Telebirr</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn" onClick={() => setSelectedBillForPayment(null)} style={{ padding: '10px 20px', background: 'var(--color-highlight)', color: 'var(--color-white)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Log Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
