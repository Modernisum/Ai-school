export function SkeletonText({ width = '100%' }) {
  return <div className="skeleton skeleton-text" style={{ width }} />;
}

export function SkeletonTitle() {
  return <div className="skeleton skeleton-title" />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass-card">
      <SkeletonTitle />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonText key={i} width={`${Math.max(40, 100 - i * 15)}%`} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="table-container">
      <div style={{ padding: '16px 20px' }}>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex" style={{ gap: 20, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            {Array.from({ length: cols }, (_, c) => (
              <SkeletonText key={c} width={`${60 + c * 15}px`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
