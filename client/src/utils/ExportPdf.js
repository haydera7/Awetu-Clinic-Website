import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports a medical record to a professional PDF document.
 * Handles different templates for Prescriptions, Lab Results, and general Clinical Records.
 * 
 * @param {Object} record - The medical record object
 * @param {Object} patient - The patient object associated with the record
 */
export const exportMedicalRecordToPdf = (record, patient) => {
  try {
    if (!record) {
      console.error('PDF Export: Missing record data');
      return;
    }
    
    // Initialize PDF (A4 size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // --- REFERRAL LETTER TEMPLATE ---
    if (record.type === 'Referral') {
      let curY = 15;
      
      // Beautiful Header
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('AWETU MENDERA HEALTH CENTER', pageWidth / 2, curY + 5, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Jimma, Oromia, Ethiopia', pageWidth / 2, curY + 12, { align: 'center' });
      
      curY = 45;
      
      // Reset text color for body
      doc.setTextColor(30, 41, 59);
      
      doc.setFont('helvetica', 'bold');
      const dateStr = record.date ? new Date(record.date).toLocaleDateString() : new Date().toLocaleDateString();
      doc.text(`Date: ${dateStr}`, pageWidth - margin, curY, { align: 'right' });
      
      // TO Section
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(margin, curY + 5, contentWidth, 20, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TO:', margin + 5, curY + 12);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(record.title || '__________________________________', margin + 5, curY + 18);
      
      curY += 35;
      
      // RE: Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RE: Patient Referral', margin, curY);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, curY + 2, pageWidth - margin, curY + 2);
      
      curY += 10;
      
      // Patient Info Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, curY, contentWidth, 20, 2, 2, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Name:', margin + 5, curY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(patient?.name || '______________________', margin + 35, curY + 8);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Age:', margin + 110, curY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(patient?.age?.toString() || '____', margin + 120, curY + 8);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Sex:', margin + 145, curY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(patient?.gender || '____', margin + 155, curY + 8);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Card No:', margin + 5, curY + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(patient?.pid || '_______', margin + 35, curY + 15);
      
      curY += 30;
      
      let refData = {};
      try {
        refData = JSON.parse(record.notes || '{}');
      } catch (e) {
        refData = { reasonForReferral: record.notes };
      }
      
      // Helper function to draw sections nicely
      const drawSection = (title, text, yPos) => {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(title, margin, yPos);
          
          yPos += 6;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85); // slate-700
          
          const content = text || '____________________________________________________________________';
          const splitText = doc.splitTextToSize(content, contentWidth - 4);
          
          // Draw subtle background for text
          const boxHeight = (splitText.length * 5) + 6;
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(margin, yPos - 4, contentWidth, boxHeight, 1, 1, 'F');
          
          doc.text(splitText, margin + 2, yPos + 1);
          return yPos + boxHeight + 8;
      };
      
      curY = drawSection('Clinical Summary:', refData.clinicalSummary, curY);
      curY = drawSection('Investigation Findings:', refData.investigationFindings, curY);
      curY = drawSection('Treatment Given:', refData.treatmentGiven, curY);
      curY = drawSection('Reason for Referral:', refData.reasonForReferral, curY);
      
      curY += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(15, 23, 42);
      doc.text('Please evaluate and manage accordingly.', margin, curY);
      
      curY += 25;
      
      // Footer Signatures
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Referring Clinician:', margin, curY);
      
      curY += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${record.doctor || '______________________'}`, margin, curY);
      
      doc.setDrawColor(203, 213, 225);
      doc.line(margin + 50, curY + 20, margin + 110, curY + 20);
      doc.text('Signature', margin + 70, curY + 25);
      
      doc.line(margin + 120, curY + 20, pageWidth - margin, curY + 20);
      doc.text('Official Stamp', margin + 135, curY + 25);
      
      const fileName = `Referral_${patient?.name?.replace(/\s+/g, '_') || 'Patient'}_${record.id || Date.now()}.pdf`;
      doc.save(fileName);
      return;
    }

    // --- 1. BRANDED HEADER ---
    // Blue header bar
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Hospital Name / Logo placeholder
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('HEALTHCARE PRO', margin, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Advanced Digital Medical Center', margin, 27);
    doc.text('123 Medical Plaza, Health City, HC 54321', margin, 32);

    // Document Type Label (Top Right)
    const docLabel = (record.type || 'Clinical Record').toUpperCase();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(docLabel, pageWidth - margin, 25, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Reference: ${record.id || 'N/A'}`, pageWidth - margin, 32, { align: 'right' });

    // --- 2. PATIENT INFO BOX ---
    let currentY = 55;
    
    // Light gray background for info box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, contentWidth, 35, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 35, 2, 2, 'D');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT IDENTIFICATION', margin + 5, currentY + 7);
    
    doc.setLineWidth(0.1);
    doc.line(margin + 5, currentY + 10, margin + contentWidth - 5, currentY + 10);

    // Grid Layout for Patient Details
    doc.setFontSize(9);
    doc.text('NAME:', margin + 5, currentY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(patient?.name || 'N/A', margin + 35, currentY + 18);

    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT ID:', margin + 95, currentY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(patient?.pid || 'N/A', margin + 125, currentY + 18);

    doc.setFont('helvetica', 'bold');
    doc.text('DOB / AGE:', margin + 5, currentY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient?.dob || 'N/A'} (${patient?.age || 'N/A'} yrs)`, margin + 35, currentY + 25);

    doc.setFont('helvetica', 'bold');
    doc.text('GENDER:', margin + 95, currentY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(patient?.gender || 'N/A', margin + 125, currentY + 25);

    doc.setFont('helvetica', 'bold');
    doc.text('ADDRESS:', margin + 5, currentY + 32);
    doc.setFont('helvetica', 'normal');
    doc.text(patient?.address || 'N/A', margin + 35, currentY + 32);

    currentY += 45;

    // --- 3. MAIN CONTENT (Conditional Layouts) ---

    if (record.type === 'Prescription') {
      // PRESCRIPTION TEMPLATE
      doc.setFontSize(40);
      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'bold');
      doc.text('Rx', margin, currentY + 10);
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text('Prescription Details', margin + 20, currentY + 5);
      
      currentY += 15;

      autoTable(doc, {
        startY: currentY,
        head: [['Medication', 'Instructions / Dosage', 'Duration']],
        body: [
          [record.title || 'N/A', record.notes || 'N/A', 'As directed']
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: margin, right: margin }
      });

    } else if (record.type === 'Lab Result') {
      // LAB RESULT TEMPLATE
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Laboratory Analysis Report', margin, currentY);
      
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Test Description', 'Found Results', 'Ref. Range', 'Status']],
        body: [
          [record.title || 'N/A', record.notes || 'N/A', 'Normal', 'Verified']
        ],
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin }
      });
    } else {
      // DEFAULT CLINICAL RECORD
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(record.title || 'Clinical Summary', margin, currentY);
      
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Finding / Observation', 'Clinical Notes']],
        body: [
          [record.title || 'N/A', record.notes || 'N/A']
        ],
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: margin, right: margin }
      });
    }

    // --- 4. SIGNATURE & AUTHENTICATION ---
    const finalY = doc.lastAutoTable.finalY + 30;
    
    // Clinician Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Ordering Clinician:', margin, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(record.doctor || 'Unauthorized Clinician', margin + 35, finalY);

    // Signature line
    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - margin - 60, finalY + 10, pageWidth - margin, finalY + 10);
    doc.setFontSize(8);
    doc.text('Authorized Digital Signature', pageWidth - margin - 30, finalY + 15, { align: 'center' });

    // --- 5. FOOTER ---
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFontSize(8);
    const footerText = 'This document is a confidential medical record. Unauthorized reproduction is strictly prohibited. Generated by HealthCare Pro Systems.';
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Page 1 of 1 | Date: ${record.date || new Date().toLocaleDateString()}`, margin, pageHeight - 10);

    // Output
    const fileName = `${record.type}_${patient?.name.replace(/\s+/g, '_')}_${record.id}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    alert('Failed to generate professional PDF. Please check the dashboard logs.');
  }
};

/**
 * Exports a medication referral to a professional PDF document for external purchase.
 * 
 * @param {Object} prescription - The prescription object
 * @param {Object} item - The specific item being referred
 * @param {Object} patient - The patient object
 */
export const exportReferralToPdf = (prescription, item, patient) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFillColor(14, 165, 233); // Sky 600 (Medical Blue)
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('HEALTHCARE PRO', margin, 20);
    doc.setFontSize(14);
    doc.text('OFFICIAL REFERRAL FORM', pageWidth - margin, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Medication External Purchase Authorization', margin, 27);
    doc.text(`Reference: REF-${Math.floor(1000 + Math.random() * 9000)}`, pageWidth - margin, 32, { align: 'right' });

    let currentY = 55;
    
    // Patient Info
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, contentWidth, 25, 2, 2, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT:', margin + 5, currentY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(patient?.name || 'N/A', margin + 35, currentY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text('ID:', margin + 110, currentY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(patient?.pid || 'N/A', margin + 120, currentY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE:', margin + 5, currentY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(), margin + 35, currentY + 18);

    currentY += 40;

    // Content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REFERRAL DETAILS', margin, currentY);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    
    currentY += 15;
    doc.setFontSize(11);
    doc.text('The following medication is currently unavailable at our facility pharmacy.', margin, currentY);
    doc.text('The patient is hereby referred to purchase the medication from an external licensed pharmacy.', margin, currentY + 6);

    currentY += 20;

    autoTable(doc, {
      startY: currentY,
      head: [['Medication Name', 'Dosage Instructions', 'Quantity Requested']],
      body: [
        [item.name || item.resolvedName || 'N/A', item.dosage || 'N/A', item.requestedQty || 'N/A']
      ],
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 8 }
    });

    currentY = doc.lastAutoTable.finalY + 30;

    // Authorization
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized By:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Pharmacy Department / [Pharmacist]', margin + 35, currentY);

    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - margin - 60, currentY + 10, pageWidth - margin, currentY + 10);
    doc.setFontSize(8);
    doc.text('Pharmacy Stamp / Signature', pageWidth - margin - 30, currentY + 15, { align: 'center' });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('This referral is valid for 7 days from the date of issue.', pageWidth / 2, 280, { align: 'center' });
    doc.text('HealthCare Pro Digital Referral System', pageWidth / 2, 285, { align: 'center' });

    const fileName = `Referral_${patient?.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('Referral PDF Error:', error);
  }
};


/**
 * Exports a professional digital receipt for a paid bill.
 * 
 * @param {Object} bill - The bill object
 * @param {Object} patient - The patient object
 */
export const exportBillReceiptToPdf = (bill, patient) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header - Professional Dark Blue
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('HEALTHCARE PRO', margin, 22);
    
    doc.setFontSize(14);
    doc.text('OFFICIAL PAYMENT RECEIPT', pageWidth - margin, 22, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Digital Medical Center & Pharmacy', margin, 30);
    doc.text('Ametu Mendera, Jimma, Oromia', margin, 35);
    doc.text(`Receipt No: ${bill.invoiceId || bill.id}`, pageWidth - margin, 30, { align: 'right' });
    doc.text(`Date: ${new Date(bill.date).toLocaleDateString()}`, pageWidth - margin, 35, { align: 'right' });

    let currentY = 60;
    
    // Patient & Payment Summary Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, contentWidth, 30, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 30, 2, 2, 'D');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', margin + 5, currentY + 8);
    doc.text('PAYMENT STATUS', margin + 110, currentY + 8);

    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${bill.patientName}`, margin + 5, currentY + 16);
    doc.text(`Patient ID: ${patient?.pid || 'N/A'}`, margin + 5, currentY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // Success Green
    doc.text('STATUS: PAID', margin + 110, currentY + 16);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    const rawMethod = bill.payments?.[0]?.method || 'Online';
    const paymentMethod = rawMethod.toLowerCase() === 'test' ? 'Online (Test)' : rawMethod;
    doc.text(`Method: ${paymentMethod.toUpperCase()}`, margin + 110, currentY + 23);

    currentY += 45;

    // Items Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLING BREAKDOWN', margin, currentY);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    
    currentY += 8;

    autoTable(doc, {
      startY: currentY,
      head: [['Description', 'Quantity', 'Unit Cost', 'Total']],
      body: bill.items.map(item => [
        item.desc,
        item.qty,
        `${(item.cost / item.qty).toFixed(2)} ETB`,
        `${item.cost.toFixed(2)} ETB`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 6 },
      foot: [['', '', 'TOTAL AMOUNT:', `${bill.totalAmount || bill.total} ETB`]],
      footStyles: { fillColor: [248, 250, 252], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 11 }
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // Digital Authentication
    doc.setFillColor(240, 253, 244); // light green
    doc.roundedRect(margin, currentY, contentWidth, 20, 1, 1, 'F');
    doc.setTextColor(21, 128, 61); // green 700
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ DIGITALLY VERIFIED PAYMENT', margin + contentWidth/2, currentY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    const txId = bill.payments?.[0]?.txId || 'N/A';
    doc.text(`Transaction ID: ${txId}`, margin + contentWidth/2, currentY + 14, { align: 'center' });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('Thank you for choosing HealthCare Pro. Get well soon!', pageWidth / 2, 280, { align: 'center' });
    doc.text('This is a computer-generated receipt and does not require a physical signature.', pageWidth / 2, 285, { align: 'center' });

    const fileName = `Receipt_${bill.invoiceId || 'Bill'}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('Receipt PDF Error:', error);
  }
};
