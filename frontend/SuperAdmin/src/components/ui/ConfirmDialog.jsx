import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger = true, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={
      <div className="flex items-center gap-3">
        <div className="stat-card-icon danger">
          <AlertTriangle size={18} />
        </div>
        {title}
      </div>
    }>
      {message && <p className="text-sm text-secondary mt-2">{message}</p>}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
        <button
          className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
