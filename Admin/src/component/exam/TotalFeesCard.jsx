import React from 'react';

const TotalFeesCard = ({ data }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="total-fees-card stat-card">
      <style jsx>{`
        .stat-card {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 20px;
          padding: 30px;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .stat-card:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: 0 20px 50px rgba(102, 126, 234, 0.4);
        }

        .card-icon {
          font-size: 48px;
          margin-bottom: 15px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }

        .card-label {
          font-size: 14px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }

        .card-value {
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .card-details {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,0.3);
        }

        .detail-item {
          text-align: center;
        }

        .detail-label {
          font-size: 12px;
          opacity: 0.8;
        }

        .detail-value {
          font-size: 16px;
          font-weight: 600;
          margin-top: 5px;
        }
      `}</style>

      <div className="card-icon">💰</div>
      <div className="card-label">Total Fees</div>
      <div className="card-value">
        {data ? formatCurrency(data.netTotalFees) : '₹0'}
      </div>
      
      {data && (
        <div className="card-details">
          <div className="detail-item">
            <div className="detail-label">Students</div>
            <div className="detail-value">{data.totalStudents || 0}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">With Fees</div>
            <div className="detail-value">{data.studentsWithFees || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TotalFeesCard;