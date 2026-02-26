// FeesAnalytics.jsx
import React, { memo, useState } from 'react';
import { formatCurrency } from '../../utils/helpers';

const FeesAnalytics = memo(({ data, feesList }) => {

  const paidStudents = feesList.filter(s => s.pendingAmount === 0).length;
  const partialStudents = feesList.filter(s => s.pendingAmount > 0 && s.pendingAmount < s.totalAmount).length;
  const pendingStudents = feesList.filter(s => s.pendingAmount === s.totalAmount).length;

  return (
    <div className="fees-analytics">
      <style jsx>{`
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .analytics-card {
          background: linear-gradient(135deg, #f8f9ff, #ffffff);
          border-radius: 15px;
          padding: 25px;
          border-left: 5px solid #667eea;
          transition: all 0.3s ease;
        }

        .analytics-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .analytics-title {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .analytics-value {
          font-size: 28px;
          font-weight: bold;
          color: #667eea;
        }

        .chart-container {
          margin-top: 30px;
          display: flex;
          gap: 40px;
          flex-wrap: wrap;
        }

        .pie-chart {
          flex: 1;
          min-width: 300px;
        }

        .legend {
          display: flex;
          flex-direction: column;
          gap: 15px;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
        }

        .legend-text {
          font-size: 14px;
          color: #333;
        }

        .legend-value {
          font-weight: bold;
          margin-left: auto;
        }
      `}</style>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-title">Fully Paid Students</div>
          <div className="analytics-value" style={{ color: '#4CAF50' }}>{paidStudents}</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-title">Partially Paid Students</div>
          <div className="analytics-value" style={{ color: '#ff9800' }}>{partialStudents}</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-title">Pending Payment Students</div>
          <div className="analytics-value" style={{ color: '#f44336' }}>{pendingStudents}</div>
        </div>

        {data && (
          <>
            <div className="analytics-card">
              <div className="analytics-title">Average Fees per Student</div>
              <div className="analytics-value">
                {data.totalStudents > 0 ? formatCurrency(data.netTotalFees / data.totalStudents) : '₹0'}
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-title">Total Discount Given</div>
              <div className="analytics-value" style={{ color: '#2196F3' }}>
                {formatCurrency(data.totalDiscount)}
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-title">Collection Efficiency</div>
              <div className="analytics-value" style={{ color: data.pendingPercentage < 20 ? '#4CAF50' : '#ff9800' }}>
                {(100 - data.pendingPercentage).toFixed(1)}%
              </div>
            </div>
          </>
        )}
      </div>

      <div className="chart-container">
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
            <span className="legend-text">Fully Paid</span>
            <span className="legend-value">{paidStudents}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ff9800' }}></div>
            <span className="legend-text">Partially Paid</span>
            <span className="legend-value">{partialStudents}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f44336' }}></div>
            <span className="legend-text">Pending</span>
            <span className="legend-value">{pendingStudents}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
FeesAnalytics.displayName = 'FeesAnalytics';

// FilterBox.jsx
const FilterBox = memo(({ filters, onFilterChange }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = { className: '', section: '', status: '', searchQuery: '' };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="filter-box">
      <style jsx>{`
        .filter-box {
          background: rgba(248, 249, 255, 0.6);
          border-radius: 15px;
          padding: 25px;
          border: 2px dashed rgba(102, 126, 234, 0.3);
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-label {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .filter-input {
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .filter-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .filter-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
        }

        .btn-clear {
          padding: 10px 20px;
          background: #f5f5f5;
          border: none;
          border-radius: 8px;
          color: #666;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-clear:hover {
          background: #e0e0e0;
        }
      `}</style>

      <div className="filter-grid">
        <div className="filter-group">
          <label className="filter-label">🎓 Class</label>
          <select
            className="filter-input"
            value={localFilters.className}
            onChange={(e) => handleChange('className', e.target.value)}
          >
            <option value="">All Classes</option>
            <option value="class-1">Class 1</option>
            <option value="class-2">Class 2</option>
            <option value="class-3">Class 3</option>
            <option value="class-4">Class 4</option>
            <option value="class-5">Class 5</option>
            <option value="class-6">Class 6</option>
            <option value="class-7">Class 7</option>
            <option value="class-8">Class 8</option>
            <option value="class-9">Class 9</option>
            <option value="class-10">Class 10</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">📚 Section</label>
          <select
            className="filter-input"
            value={localFilters.section}
            onChange={(e) => handleChange('section', e.target.value)}
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">📊 Status</label>
          <select
            className="filter-input"
            value={localFilters.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="paid">Fully Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">🔍 Search</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Search by name or ID..."
            value={localFilters.searchQuery}
            onChange={(e) => handleChange('searchQuery', e.target.value)}
          />
        </div>
      </div>

      <div className="filter-actions">
        <button className="btn-clear" onClick={clearFilters}>
          🔄 Clear Filters
        </button>
      </div>
    </div>
  );
});
FilterBox.displayName = 'FilterBox';

export { FeesAnalytics, FilterBox };