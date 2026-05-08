import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ open, onClose, title, children, wide, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className={`modal-panel ${wide ? 'wide' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {title && <h2>{title}</h2>}
            {children}
            {footer && <div className="flex items-center justify-end gap-3 mt-6">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
