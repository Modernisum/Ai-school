// FeesListAndPayment.jsx
import React, { useState, memo } from 'react';
import { formatCurrency } from '../../utils/helpers';

const FeesListBox = memo(({ feesList, onPaymentClick }) => {

  const getStatusBadge = (student) => {
    if (!student.totalAmount) return { text: 'No Fees', color: '#999' };

    const pending = student.pendingAmount || 0;
    const total = student.totalAmount || 0;

    if (pending === 0) return { text: 'Paid', color: '#4CAF50' };
    if (pending === total) return { text: 'Pending', color: '#f44336' };
    return { text: 'Partial', color: '#ff9800' };
  };

  if (feesList.length === 0) {
    return (
      <div className="empty-state">
        <style jsx>{`
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
          }
          .empty-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.5;
          }
        `}</style>
        <div className="empty-icon">📭</div>
        <h3>No Students Found</h3>
        <p>Try adjusting your filters or create some fees records</p>
      </div>
    );
  }

  return (
    <div className="fees-list-box">
      <style jsx>{`
        .fees-table-container {
          overflow-x: auto;
        }

        .fees-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .fees-table thead {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .fees-table th {
          padding: 15px 20px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 13px;
        }

        .fees-table td {
          padding: 15px 20px;
          border-bottom: 1px solid #f0f0f0;
        }

        .fees-table tbody tr {
          transition: all 0.3s ease;
          background: white;
        }

        .fees-table tbody tr:hover {
          background: rgba(102, 126, 234, 0.05);
          transform: scale(1.01);
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
        }

        .student-details {
          display: flex;
          flex-direction: column;
        }

        .student-name {
          font-weight: 600;
          color: #333;
        }

        .student-id {
          font-size: 12px;
          color: #666;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
          display: inline-block;
        }

        .progress-cell {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .progress-bar-container {
          background: #f0f0f0;
          border-radius: 10px;
          height: 8px;
          overflow: hidden;
        }

        .progress-bar {
          background: linear-gradient(90deg, #4CAF50, #45a049);
          height: 100%;
          border-radius: 10px;
          transition: width 0.5s ease;
        }

        .progress-text {
          font-size: 12px;
          color: #666;
        }

        .btn-pay {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 13px;
        }

        .btn-pay:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }

        .btn-pay:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .fees-table {
            font-size: 12px;
          }

          .fees-table th,
          .fees-table td {
            padding: 10px;
          }
        }
      `}</style>

      <div className="fees-table-container">
        <table className="fees-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class/Section</th>
              <th>Total Fees</th>
              <th>Paid</th>
              <th>Pending</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {feesList.map((student) => {
              const status = getStatusBadge(student);
              const progress = student.totalAmount > 0
                ? ((student.paidAmount / student.totalAmount) * 100).toFixed(0)
                : 0;

              return (
                <tr key={student.studentId}>
                  <td>
                    <div className="student-info">
                      <div className="student-avatar">
                        {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="student-details">
                        <span className="student-name">{student.name || 'Unknown'}</span>
                        <span className="student-id">{student.studentId || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {student.className ? student.className.replace('class-', 'Class ').toUpperCase() : 'N/A'}
                    {student.section && ` - ${student.section}`}
                  </td>
                  <td>{formatCurrency(student.totalAmount)}</td>
                  <td style={{ color: '#4CAF50', fontWeight: '600' }}>
                    {formatCurrency(student.paidAmount)}
                  </td>
                  <td style={{ color: '#f44336', fontWeight: '600' }}>
                    {formatCurrency(student.pendingAmount)}
                  </td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                      </div>
                      <span className="progress-text">{progress}% Paid</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: status.color }}
                    >
                      {status.text}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-pay"
                      onClick={() => onPaymentClick(student)}
                      disabled={student.pendingAmount === 0}
                    >
                      💳 {student.pendingAmount === 0 ? 'Paid' : 'Pay'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
FeesListBox.displayName = 'FeesListBox';

const StudentPaymentModal = memo(({ student, onClose, onSubmit }) => {
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'Cash',
    transactionId: '',
    remarks: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (paymentData.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (paymentData.amount > student.pendingAmount) {
      alert('Payment amount cannot exceed pending amount');
      return;
    }
    onSubmit({
      studentId: student.studentId,
      ...paymentData
    });
  };

  const handleQuickAmount = (percentage) => {
    const amount = (student.pendingAmount * percentage) / 100;
    setPaymentData({ ...paymentData, amount: Math.round(amount) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
          }

          .modal-content {
            background: white;
            border-radius: 20px;
            padding: 35px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
          }

          .modal-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #999;
            transition: all 0.3s ease;
          }

          .close-btn:hover {
            color: #f44336;
            transform: rotate(90deg);
          }

          .student-summary {
            background: linear-gradient(135deg, #f8f9ff, #ffffff);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 25px;
            border-left: 5px solid #667eea;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .summary-label {
            color: #666;
            font-weight: 600;
          }

          .summary-value {
            font-weight: bold;
            color: #333;
          }

          .quick-amounts {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 15px 0 25px 0;
          }

          .quick-btn {
            padding: 12px;
            background: #f5f5f5;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
            color: #667eea;
          }

          .quick-btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
            transform: scale(1.05);
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }

          .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.3s ease;
            box-sizing: border-box;
          }

          .form-control:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .form-actions {
            display: flex;
            gap: 15px;
            justify-content: flex-end;
            margin-top: 30px;
          }

          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .btn-success {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
          }

          .btn-secondary {
            background: #f5f5f5;
            color: #666;
          }

          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
        `}</style>

        <div className="modal-header">
          <h2 className="modal-title">💳 Record Payment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="student-summary">
          <div className="summary-row">
            <span className="summary-label">Student Name:</span>
            <span className="summary-value">{student.name}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Class/Section:</span>
            <span className="summary-value">
              {student.className?.replace('class-', 'Class ').toUpperCase()} - {student.section}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Total Fees:</span>
            <span className="summary-value">{formatCurrency(student.totalAmount)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Already Paid:</span>
            <span className="summary-value" style={{ color: '#4CAF50' }}>
              {formatCurrency(student.paidAmount)}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Pending Amount:</span>
            <span className="summary-value" style={{ color: '#f44336' }}>
              {formatCurrency(student.pendingAmount)}
            </span>
          </div>
        </div>

        <div>
          <label style={{ fontWeight: '600', marginBottom: '10px', display: 'block' }}>
            Quick Amount Selection:
          </label>
          <div className="quick-amounts">
            <button className="quick-btn" onClick={() => handleQuickAmount(25)}>25%</button>
            <button className="quick-btn" onClick={() => handleQuickAmount(50)}>50%</button>
            <button className="quick-btn" onClick={() => handleQuickAmount(75)}>75%</button>
            <button className="quick-btn" onClick={() => handleQuickAmount(100)}>Full</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Payment Amount (₹) *</label>
            <input
              type="number"
              className="form-control"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
              min="0"
              max={student.pendingAmount}
              required
            />
          </div>

          <div className="form-group">
            <label>Payment Method *</label>
            <select
              className="form-control"
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
            >
              <option value="Cash">Cash</option>
              <option value="Card">Debit/Credit Card</option>
              <option value="UPI">UPI</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="form-group">
            <label>Transaction ID / Reference Number</label>
            <input
              type="text"
              className="form-control"
              value={paymentData.transactionId}
              onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div className="form-group">
            <label>Payment Date *</label>
            <input
              type="date"
              className="form-control"
              value={paymentData.paymentDate}
              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Remarks</label>
            <textarea
              className="form-control"
              rows="3"
              value={paymentData.remarks}
              onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
StudentPaymentModal.displayName = 'StudentPaymentModal';

export { FeesListBox, StudentPaymentModal };