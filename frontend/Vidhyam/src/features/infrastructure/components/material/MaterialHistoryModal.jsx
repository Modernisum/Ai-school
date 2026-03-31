import { motion } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownRight, Calendar, Package } from 'lucide-react';
import { useGetMaterialHistoryQuery } from '../../infrastructureApi';

function MaterialHistoryModal({ material, schoolId, onClose }) {
  const { data: history, isLoading } = useGetMaterialHistoryQuery({ schoolId, materialId: material.id });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="border border-white/10 rounded-[3rem] p-12 w-full max-w-2xl shadow-2xl shadow-black/80"
        style={{ backgroundColor: 'var(--dark-bg-1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--dark-bg-2)' }}>
              <Package size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
                Transaction History
              </h2>
              <p className="text-sm" style={{ color: 'var(--secondary-color)' }}>
                {material.materialName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'var(--primary-color)' }}
          >
            <X size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--primary-color)' }}></div>
            <p className="mt-4" style={{ color: 'var(--secondary-color)' }}>Loading history...</p>
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {history.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-colors"
                style={{ backgroundColor: 'var(--dark-bg-2)' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl ${item.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {item.type === 'buy' ? (
                        <ArrowDownRight size={20} className="text-green-400" />
                      ) : (
                        <ArrowUpRight size={20} className="text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">
                          {item.type === 'buy' ? 'Purchased' : 'Sold'} {item.quantity} units
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${item.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1 text-sm" style={{ color: 'var(--secondary-color)' }}>
                        <Calendar size={14} />
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: 'var(--primary-color)' }}>
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--secondary-color)' }}>
                      ₹{item.price} per unit
                    </div>
                  </div>
                </div>
                {item.notes && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm" style={{ color: 'var(--secondary-color)' }}>{item.notes}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--dark-bg-2)' }}>
              <Package size={32} style={{ color: 'var(--secondary-color)' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--primary-color)' }}>
              No Transaction History
            </h3>
            <p style={{ color: 'var(--secondary-color)' }}>
              No transactions have been recorded for this material yet.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-6 mt-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border border-white/20 hover:bg-white/10 transition-colors"
            style={{ color: 'var(--secondary-color)' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default MaterialHistoryModal;