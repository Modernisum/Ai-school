import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No data', description, action }) {
  return (
    <div className="table-empty">
      <Icon size={36} />
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{title}</p>
      {description && <p className="text-xs text-tertiary">{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
