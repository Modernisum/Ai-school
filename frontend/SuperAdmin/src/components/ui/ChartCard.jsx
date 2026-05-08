export default function ChartCard({ title, subtitle, children, actions, className = '', style }) {
  return (
    <div className={`chart-card ${className}`} style={style}>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <span className="text-xs text-tertiary">{subtitle}</span>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
