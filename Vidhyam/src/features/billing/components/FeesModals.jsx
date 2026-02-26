// CreateFeesModal.jsx  
import React, { useState } from 'react';

const CreateFeesModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    feesName: '',
    amount: 0,
    category: 'Tuition',
    frequency: 'Monthly',
    dueDate: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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

          .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
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
          <h2 className="modal-title">➕ Create New Fees</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Fees Name *</label>
            <input
              type="text"
              className="form-control"
              value={formData.feesName}
              onChange={(e) => setFormData({...formData, feesName: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Amount (₹) *</label>
            <input
              type="number"
              className="form-control"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              className="form-control"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="Tuition">Tuition Fees</option>
              <option value="Transport">Transport Fees</option>
              <option value="Library">Library Fees</option>
              <option value="Sports">Sports Fees</option>
              <option value="Exam">Exam Fees</option>
              <option value="Laboratory">Laboratory Fees</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Frequency *</label>
            <select
              className="form-control"
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Yearly">Yearly</option>
              <option value="One-Time">One-Time</option>
            </select>
          </div>

          <div className="form-group">
            <label>Due Date *</label>
            <input
              type="date"
              className="form-control"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Fees
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// AssignFeesModal.jsx
const AssignFeesModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    className: '',
    section: '',
    feesType: '',
    amount: 0,
    dueDate: '',
    specificStudents: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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

          .info-box {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            color: #1976d2;
            font-size: 14px;
          }
        `}</style>

        <div className="modal-header">
          <h2 className="modal-title">📋 Assign Fees to Students</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="info-box">
            ℹ️ Select class and section to assign fees to all students, or leave blank for specific students.
          </div>

          <div className="form-group">
            <label>Class</label>
            <select
              className="form-control"
              value={formData.className}
              onChange={(e) => setFormData({...formData, className: e.target.value})}
            >
              <option value="">Select Class</option>
              {[...Array(10)].map((_, i) => (
                <option key={i} value={`class-${i+1}`}>Class {i+1}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Section</label>
            <select
              className="form-control"
              value={formData.section}
              onChange={(e) => setFormData({...formData, section: e.target.value})}
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="form-group">
            <label>Fees Type *</label>
            <select
              className="form-control"
              value={formData.feesType}
              onChange={(e) => setFormData({...formData, feesType: e.target.value})}
              required
            >
              <option value="">Select Fees Type</option>
              <option value="Tuition">Tuition Fees</option>
              <option value="Transport">Transport Fees</option>
              <option value="Library">Library Fees</option>
              <option value="Sports">Sports Fees</option>
              <option value="Exam">Exam Fees</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount (₹) *</label>
            <input
              type="number"
              className="form-control"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label>Due Date *</label>
            <input
              type="date"
              className="form-control"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Assign Fees
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { CreateFeesModal, AssignFeesModal };