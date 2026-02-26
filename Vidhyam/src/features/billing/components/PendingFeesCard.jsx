import React, { memo } from 'react';
import { formatCurrency } from '../../utils/helpers';

const PendingFeesCard = memo(({ data }) => {

  return (
    <div className="pending-fees-card stat-card">
      <style jsx>{`
        .stat-card {
          background: linear-gradient(135deg, #f44336, #d32f2f);
          border-radius: 20px;
          padding: 30px;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(244, 67, 54, 0.3);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          bottom: -50%;
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
          box-shadow: 0 20px 50px rgba(244, 67, 54, 0.4);
        }

        .card-icon {
          font-size: 48px;
          margin-bottom: 15px;
          animation: shake 2s infinite;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
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

        .card-percentage {
          font-size: 18px;
          background: rgba(255,255,255,0.2);
          padding: 8px 16px;
          border-radius: 20px;
          display: inline-block;
          margin-top: 10px;
        }

        .warning-badge {
          margin-top: 15px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          font-size: 12px;
          text-align: center;
        }
      `}</style>

      <div className="card-icon">⚠️</div>
      <div className="card-label">Pending Fees</div>
      <div className="card-value">
        {data ? formatCurrency(data.totalPending) : '₹0'}
      </div>

      {data && (
        <>
          <div className="card-percentage">
            {data.pendingPercentage?.toFixed(1) || 0}% Pending
          </div>
          {data.pendingPercentage > 30 && (
            <div className="warning-badge">
              ⚠️ High pending amount - Action required
            </div>
          )}
        </>
      )}
    </div>
  );
});
PendingFeesCard.displayName = 'PendingFeesCard';

export default PendingFeesCard;