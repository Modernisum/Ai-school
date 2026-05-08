import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, color = 'primary', trend, trendLabel, onClick, className = '' }) {
  const trendUp = trend > 0;
  const showTrend = trend !== undefined && trend !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`stat-card ${color} ${onClick ? 'interactive' : ''} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-card-header">
        <div className={`stat-card-icon ${color}`}>
          {Icon && <Icon size={16} />}
        </div>
      </div>
      <div className="stat-card-value" style={{ color: `var(--color-${color})` }}>
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
      {showTrend && (
        <div className={`stat-card-trend ${trendUp ? 'up' : 'down'}`}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
          {trendLabel && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
