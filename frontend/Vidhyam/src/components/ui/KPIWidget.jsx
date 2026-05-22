import React from 'react';
import { motion } from 'framer-motion';
import ChartWidget from './ChartWidget';

/**
 * Common KPI Widget for displaying metrics
 * Reusable component for KPI cards with trends
 */
const KPIWidget = ({
  // KPI data
  kpis = [],
  
  // Layout
  columns = 4, // 1, 2, 3, 4
  gap = 'gap-4',
  
  // Styling
  className = '',
  cardClassName = '',
  
  // Animation
  animate = true,
  staggerDelay = 0.05,
  
  // Children for declarative tiles
  children,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  
  const colorMap = {
    primary: {
      bg: 'from-blue-600/10 to-indigo-600/10',
      text: 'text-blue-400',
      hex: '#60a5fa',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    },
    success: {
      bg: 'from-emerald-600/10 to-teal-600/10',
      text: 'text-emerald-400',
      hex: '#34d399',
      iconBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    },
    accent: {
      bg: 'from-cyan-500/20 to-blue-500/20',
      text: 'text-cyan-400',
      hex: '#22d3ee',
      iconBg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      glow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]',
    },
    warning: {
      bg: 'from-amber-600/10 to-orange-600/10',
      text: 'text-amber-400',
      hex: '#fbbf24',
      iconBg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    },
    purple: {
      bg: 'from-blue-600/10 to-cyan-600/10',
      text: 'text-blue-400',
      hex: '#3b82f6',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    },
    cyan: {
      bg: 'from-cyan-500/20 to-blue-500/20',
      text: 'text-cyan-400',
      hex: '#22d3ee',
      iconBg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      glow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]',
    },
  };
  
  const KPIItem = ({ kpi, index }) => {
    const [hoveredData, setHoveredData] = React.useState(null);
    const colors = colorMap[kpi.color || 'primary'];
    const delay = animate ? { transitionDelay: `${index * staggerDelay}s` } : {};
    
    // Display value: either the hovered daily data or the total value
    const displayValue = hoveredData ? hoveredData.value.toLocaleString() : kpi.value;
    const displayLabel = kpi.label;

    return (
      <motion.div
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className={`relative overflow-hidden glass-card p-3 aspect-[4/3] group transition-all duration-500 ${colors.glow} ${cardClassName}`}
        style={delay}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="relative z-10 h-full flex flex-col">
          {/* Content */}
          <div className="flex-1 flex flex-col p-1">
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {kpi.icon && (
                  <div className={`p-1.5 rounded-lg ${colors.iconBg} border border-[var(--glass-border)] shrink-0`}>
                    <kpi.icon size={14} className={colors.text} />
                  </div>
                )}
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest truncate">{displayLabel}</h3>
              </div>
              <motion.h3 
                key={displayValue}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-black text-[var(--text-main)] tracking-tight whitespace-nowrap"
              >
                {displayValue}
              </motion.h3>
            </div>
            
            {/* In-tile Chart (optional) */}
            {kpi.chart && (
              <div className="flex-1 w-full border-t border-[var(--glass-border)] pt-2 flex items-center justify-center overflow-hidden">
                <ChartWidget
                  minimal
                  type={kpi.chart.type || 'line'}
                  data={kpi.chart.data || []}
                  categories={kpi.chart.categories || []}
                  options={{ height: '100%', width: '100%' }}
                  showGrid={false}
                  showLegend={false}
                  showTooltip={false}
                  onHover={setHoveredData}
                  colors={kpi.chart.colors || [colorMap[kpi.color || 'primary'].hex]}
                  className="!p-0 w-full h-full"
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };
  
  return (
    <div className={`grid ${gridCols[columns] || gridCols[4]} ${gap} ${className}`}>
      {kpis && kpis.length > 0 ? kpis.map((kpi, index) => (
        <KPIItem key={index} kpi={kpi} index={index} />
      )) : children}
    </div>
  );
};

import KPITile from './KPITile';
export { KPITile };
export default KPIWidget;

/**
 * Example usage:
 * 
 * <KPIWidget
 *   kpis={[
 *     {
 *       label: 'Total Students',
 *       value: '1,248',
 *       sub: 'Active this month',
 *       icon: Users,
 *       color: 'primary',
 *       trend: 12.5,
 *       progress: 75,
 *       progressColor: 'success',
 *       metrics: [
 *         { label: 'New', value: '48' },
 *         { label: 'Active', value: '1,200' },
 *       ]
 *     },
 *     {
 *       label: 'Revenue',
 *       value: '₹2.4M',
 *       sub: 'Monthly collection',
 *       icon: DollarSign,
 *       color: 'success',
 *       trend: 8.2,
 *     },
 *     {
 *       label: 'Attendance',
 *       value: '94.2%',
 *       sub: 'Daily average',
 *       icon: CheckCircle,
 *       color: 'accent',
 *       trend: 2.1,
 *     },
 *     {
 *       label: 'Pending Tasks',
 *       value: '18',
 *       sub: 'Require attention',
 *       icon: AlertTriangle,
 *       color: 'warning',
 *       trend: -3.2,
 *     },
 *   ]}
 *   columns={4}
 *   gap="gap-6"
 *   animate={true}
 * />
 */