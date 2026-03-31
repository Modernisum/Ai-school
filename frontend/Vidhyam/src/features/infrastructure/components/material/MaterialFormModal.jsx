import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';

function MaterialFormModal({ material, onClose, onSubmit }) {
  const [name, setName] = useState(material?.materialName || '');
  const [price, setPrice] = useState(material?.unitPrice || '');
  const [initialQty, setInitialQty] = useState(material?.quantity || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      materialName: name,
      unitPrice: parseFloat(price),
      quantity: parseInt(initialQty),
    });
  };

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
          <h2 className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
            {material ? 'Edit Material' : 'Add New Material'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'var(--primary-color)' }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--secondary-color)' }}>
              Material Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter material name"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--secondary-color)' }}>
              Unit Price (₹)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter unit price"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--secondary-color)' }}>
              Initial Quantity
            </label>
            <input
              type="number"
              value={initialQty}
              onChange={(e) => setInitialQty(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter initial quantity"
              min="0"
              required
            />
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
              type="submit"
              className="px-6 py-3 rounded-2xl flex items-center space-x-2 transition-colors"
              style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}
            >
              <Save size={20} />
              <span>{material ? 'Update' : 'Save'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default MaterialFormModal;