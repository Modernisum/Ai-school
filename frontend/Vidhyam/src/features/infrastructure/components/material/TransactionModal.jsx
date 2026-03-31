import { motion } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

function TransactionModal({ type, material, qty, price, setQty, setPrice, onClose, onSubmit }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="border border-white/10 rounded-[3rem] p-12 w-full max-w-lg shadow-2xl shadow-black/80"
        style={{ backgroundColor: 'var(--dark-bg-1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl ${type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {type === 'buy' ? (
                <ArrowDownRight size={24} className="text-green-400" />
              ) : (
                <ArrowUpRight size={24} className="text-red-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
              {type === 'buy' ? 'Buy Material' : 'Sell Material'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'var(--primary-color)' }}
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 p-4 rounded-2xl" style={{ backgroundColor: 'var(--dark-bg-2)' }}>
          <p className="text-sm" style={{ color: 'var(--secondary-color)' }}>Material</p>
          <p className="text-lg font-semibold">{material.materialName}</p>
          <div className="flex justify-between mt-2">
            <div>
              <p className="text-sm" style={{ color: 'var(--secondary-color)' }}>Current Stock</p>
              <p className="text-lg">{material.extraUnit} units</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--secondary-color)' }}>Unit Price</p>
              <p className="text-lg">₹{material.unitPrice}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--secondary-color)' }}>
              Quantity
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--secondary-color)' }}>
              Price per Unit (₹)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter price per unit"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--dark-bg-2)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--secondary-color)' }}>Total Amount</span>
              <span className="text-xl font-bold" style={{ color: 'var(--primary-color)' }}>
                ₹{(qty * price).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl border border-white/20 hover:bg-white/10 transition-colors"
              style={{ color: 'var(--secondary-color)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className={`px-6 py-3 rounded-2xl flex items-center space-x-2 transition-colors ${type === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
              style={{ color: 'white' }}
            >
              {type === 'buy' ? (
                <>
                  <ArrowDownRight size={20} />
                  <span>Buy Now</span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={20} />
                  <span>Sell Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default TransactionModal;