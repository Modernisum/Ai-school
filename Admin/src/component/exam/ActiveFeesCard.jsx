import React from 'react';

const ActiveFeesCard = ({ data }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const collectionRate = data && data.netTotalFees > 0 
    ? ((data.totalPaid / data.netTotalFees) * 100).toFixed(1)
    : 0;

  return (
    <div className="active-fees-card stat-card">
      <style jsx>{`
        .stat-card {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          border-radius: 20px;
          padding: 30px;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(76, 175, 80, 0.3);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
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
          box-shadow: 0 20px 50px rgba(76, 175, 80, 0.4);
        }

        .card-icon {
          font-size: 48px;
          margin-bottom: 15px;
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

        .progress-bar-container {
          background: rgba(255,255,255,0.3);
          border-radius: 10px;
          height: 12px;
          margin-top: 15px;
          overflow: hidden;
        }

        .progress-bar {
          background: white;
          height: 100%;
          border-radius: 10px;
          transition: width 1s ease-in-out;
          box-shadow: 0 2px 10px rgba(255,255,255,0.3);
        }

        .progress-label {
          font-size: 12px;
          margin-top: 8px;
          text-align: right;
          opacity: 0.9;
        }
      `}</style>

      <div className="card-icon">✅</div>
      <div className="card-label">Collected Fees</div>
      <div className="card-value">
        {data ? formatCurrency(data.totalPaid) : '₹0'}
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar" style={{width: `${collectionRate}%`}}></div>
      </div>
      <div className="progress-label">{collectionRate}% Collection Rate</div>
    </div>
  );
};

export default ActiveFeesCard;