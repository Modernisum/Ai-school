export default function StatusBadge({ status, label, size = 'sm' }) {
  const displayLabel = label || status;
  const variant = status?.toLowerCase() || 'inactive';

  return (
    <span className={`status-badge ${variant}`}>
      <span className="status-dot" />
      {displayLabel}
    </span>
  );
}
