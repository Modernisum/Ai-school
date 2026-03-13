import React, { memo } from 'react';
import { CreditCard, DollarSign, Minus } from 'lucide-react';
import { formatDateTime, formatCurrency } from '../../../../utils/helpers';

const FeesTimeline = memo(({ feesHistory }) => {
  if (!feesHistory || feesHistory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
          <CreditCard className="mr-3 text-green-600" size={24} />
          Fees History
        </h3>
        <div className="py-8">
          <CreditCard size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No fees history found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <CreditCard className="mr-3 text-green-600" size={24} />
          Fees History
        </h3>
        <span className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-full font-medium">
          {feesHistory.length} transactions
        </span>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {feesHistory.map((record, index) => {
          const isPayment = record.action === 'payment';
          
          return (
            <div
              key={index}
              className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${isPayment
                ? 'bg-white border-green-100 hover:border-green-300'
                : 'bg-white border-blue-100 hover:border-blue-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isPayment ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isPayment ? <DollarSign size={18} /> : <Minus size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 capitalize leading-tight">{record.details.type}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(record.date)}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-black ${isPayment ? 'text-green-600' : 'text-blue-600'}`}>
                    {isPayment ? '+' : '-'}{formatCurrency(isPayment ? record.details.amount : record.details.discountAmount)}
                  </p>
                  <div className="text-[10px] text-gray-400 font-medium">
                    Pending: {formatCurrency(record.details.newPending)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

FeesTimeline.displayName = 'FeesTimeline';

export default FeesTimeline;
