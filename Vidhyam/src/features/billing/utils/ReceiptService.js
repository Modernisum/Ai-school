import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * ReceiptService
 * Utility to generate and download professional fee receipts for Vidhyam ERP.
 */
export const ReceiptService = {
  /**
   * Generate a professional fee receipt PDF
   * @param {Object} data - Receipt data
   * @param {Object} data.school - School details (name, address, logo placeholder)
   * @param {Object} data.student - Student details (name, id, class)
   * @param {Object} data.payment - Payment details (id, date, method, total)
   * @param {Array} data.fees - List of fees items paid
   */
  generateReceipt: (data) => {
    const { school, student, payment, fees } = data;
    const doc = new jsPDF();

    // 1. Header & Branding
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Blue Accent
    doc.text(school.name || "VIDHYAM ERP", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(school.address || "Enterprise School Management Platform", 105, 28, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);

    // 2. Receipt Info Header
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("FEE RECEIPT", 20, 48);
    
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Receipt ID: ${payment.id || 'N/A'}`, 190, 48, { align: "right" });
    doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`, 190, 53, { align: "right" });

    // 3. Student & School Info Section
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("BILLED TO:", 20, 65);
    doc.setFont(undefined, 'bold');
    doc.text(student.name || "Student Name", 20, 70);
    doc.setFont(undefined, 'normal');
    doc.text(`ID: ${student.id}`, 20, 75);
    doc.text(`Class: ${student.className || 'N/A'}`, 20, 80);

    doc.text("SCHOOL DETAILS:", 120, 65);
    doc.setFont(undefined, 'bold');
    doc.text(school.name, 120, 70);
    doc.setFont(undefined, 'normal');
    doc.text(`Method: ${payment.method || 'Online'}`, 120, 75);
    doc.text(`Status: Success`, 120, 80);

    // 4. Fees Breakdown Table
    const tableRows = fees.map(fee => [
      fee.name,
      `INR ${Number(fee.amount).toLocaleString()}`,
      `INR ${Number(fee.penalty || 0).toLocaleString()}`,
      `INR ${(Number(fee.amount) + Number(fee.penalty || 0)).toLocaleString()}`
    ]);

    doc.autoTable({
      startY: 90,
      head: [['Fee Head', 'Base Amount', 'Late Fee/Penalty', 'Line Total']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // 5. Total Section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`GRAND TOTAL: INR ${Number(payment.total).toLocaleString()}`, 190, finalY, { align: "right" });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const words = `Amount in words: ${payment.total} Rupees Only`;
    doc.text(words, 20, finalY + 5);

    // 6. Footer & Signature
    doc.setLineWidth(0.2);
    doc.line(140, finalY + 30, 190, finalY + 30);
    doc.setFontSize(8);
    doc.text("Authorized Signatory", 165, finalY + 35, { align: "center" });

    doc.setTextColor(150);
    doc.text("This is a computer generated receipt and does not require a physical signature.", 105, 285, { align: "center" });

    // 7. Save the PDF
    doc.save(`Receipt_${student.id}_${payment.id}.pdf`);
  }
};
