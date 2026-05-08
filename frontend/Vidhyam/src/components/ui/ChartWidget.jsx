import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, MoreVertical, Download, Filter, RefreshCw } from 'lucide-react';
import GlassCard from './GlassCard';
import StandardButton from './StandardButton';

/**
 * ChartWidget - A premium data visualization component for Vidhyam ecosystem
 * Supports multiple chart types with glassmorphism styling
 * 
 * @param {Object} props
 * @param {'bar' | 'line' | 'pie' | 'area' | 'donut' | 'radar'} props.type - Chart type
 * @param {Array} props.data - Chart data array
 * @param {Array} props.categories - X-axis categories/labels
 * @param {string} props.title - Chart title
 * @param {string} props.description - Chart description
 * @param {Object} props.options - Chart configuration options
 * @param {boolean} props.showLegend - Show legend (default: true)
 * @param {boolean} props.showTooltip - Show tooltip on hover (default: true)
 * @param {boolean} props.showGrid - Show grid lines (default: true)
 * @param {boolean} props.animate - Enable animations (default: true)
 * @param {Array} props.colors - Custom color palette
 * @param {Function} props.onExport - Export callback
 * @param {Function} props.onRefresh - Refresh callback
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.minimal - If true, only renders the chart area without headers, footers or borders
 * @param {React.ReactNode} props.children - Custom content
 */
const ChartWidget = ({
  type = 'bar',
  data = [],
  categories = [],
  title = 'Chart Title',
  description = '',
  options = {},
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  animate = true,
  minimal = false,
  colors = [
    'rgba(59, 130, 246, 0.8)',   // primary
    'rgba(16, 185, 129, 0.8)',   // success
    'rgba(6, 182, 212, 0.8)',    // accent
    'rgba(245, 158, 11, 0.8)',   // warning
    'rgba(37, 99, 235, 0.8)',    // blue
    'rgba(14, 165, 233, 0.8)',   // sky
  ],
  onExport,
  onRefresh,
  onHover,
  className = '',
  children,
}) => {
  const chartHeight = options.height || 300;
  const chartWidth = options.width || '100%';
  
  // Calculate max value for scaling
  const maxValue = data && data.length > 0 
    ? Math.max(...data.map(item => Array.isArray(item.value) ? Math.max(...item.value) : item.value))
    : 100;

  // Render chart based on type
  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center pt-4">
          <div className="text-[10px] font-black tracking-widest text-[var(--text-muted)] italic opacity-50">
            NO_DATA_FOUND
          </div>
        </div>
      );
    }

    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      case 'area':
        return renderAreaChart();
      case 'donut':
        return renderDonutChart();
      case 'radar':
        return renderRadarChart();
      default:
        return renderBarChart();
    }
  };

  // Bar Chart
  const renderBarChart = () => {
    return (
      <div className="w-full h-full flex flex-col pt-4">
        {/* Bars Container with Baseline */}
        <div className={`relative flex-1 flex items-end justify-center ${minimal ? 'gap-0.5' : 'gap-1'} border-b border-white/10 pb-1.5`}>
          {data.map((item, index) => {
            const value = Array.isArray(item.value) ? item.value[0] : item.value;
            const height = (value / (maxValue || 1)) * (chartHeight - (minimal ? 50 : 100)); // Adjusted for labels
            const color = colors[index % colors.length];
            const barWidth = minimal ? 34 : Math.max(24, (chartWidth - (categories.length * 12)) / categories.length);
            
            return (
              <motion.div
                key={index}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: minimal ? `${(value/(maxValue || 100)) * 100}%` : `${height + 30}px`, opacity: 1 }}
                whileHover={{ y: -5 }}
                onMouseEnter={() => onHover && onHover(item)}
                onMouseLeave={() => onHover && onHover(null)}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className="relative group flex flex-col justify-end items-center cursor-pointer"
                style={{ width: `${barWidth}px` }}
              >
                {/* Background Bar */}
                <div className="absolute inset-0 w-full bg-white/[0.03] rounded-full" />
                
                {/* Filled Bar */}
                <motion.div 
                  className="w-full rounded-full relative z-10 transition-all duration-300"
                  style={{ 
                    backgroundColor: color,
                    backgroundImage: `linear-gradient(to top, ${color.replace('0.8', '0.7')}, ${color.replace('0.8', '1')})`,
                    boxShadow: 'none',
                    height: '100%'
                  }}
                >
                   <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity" />
                </motion.div>

                {showTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 mb-2 bottom-full">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-2 py-1 shadow-2xl">
                      <div className="text-[10px] font-black text-[var(--text-main)] leading-none">{value.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Labels below baseline */}
        <div className={`flex justify-center ${minimal ? 'gap-0.5' : 'gap-1'} mt-2`}>
          {data.map((item, index) => {
            const barWidth = minimal ? 34 : Math.max(24, (chartWidth - (categories.length * 12)) / categories.length);
            return (
              <div key={index} style={{ width: `${barWidth}px` }} className="flex justify-center">
                 <span className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-300 ${minimal ? 'opacity-40' : 'opacity-60'} text-[var(--text-muted)]`}>
                   {categories[index] || item.label}
                 </span>
              </div>
            );
          })}
        </div>
        {!minimal && showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            {[0.25, 0.5, 0.75, 1].map((percent, i) => (
              <div 
                key={i}
                className="absolute left-0 right-0 border-t border-white/5"
                style={{ bottom: `${percent * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };
  // Calculate math/safe values
  const safeTitleId = React.useMemo(() => title.replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(7), [title]);

  // Line Chart
  const renderLineChart = () => {
    return (
      <div className="relative w-full h-full p-2 flex flex-col">
        <div className="flex-1 relative">
          {/* Premium Dashed Background Grid */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.05] z-0 px-2 pb-5 pt-2">
             <div className="border-t border-dashed border-[var(--glass-border)] w-full"></div>
             <div className="border-t border-dashed border-[var(--glass-border)] w-full"></div>
             <div className="border-t border-dashed border-[var(--glass-border)] w-full"></div>
             <div className="border-t border-dashed border-[var(--glass-border)] w-full"></div>
          </div>

          {/* Background SVG for Paths (Stretchy) */}
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 overflow-visible z-10">
             <defs>
              <linearGradient id={`areaGradient-${safeTitleId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors[0]} stopOpacity="0.4" />
                <stop offset="100%" stopColor={colors[0]} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Fill */}
            <motion.path
              d={`M 0 100 L ${data.map((item, index) => {
                const value = Array.isArray(item.value) ? item.value[0] : item.value;
                const x = (index / (data.length - 1 || 1)) * 100;
                const y = 100 - (value / maxValue) * 80 - 10;
                return `${x} ${y}`;
              }).join(' L ')} L 100 100 Z`}
              fill={`url(#areaGradient-${safeTitleId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Connecting Line Path */}
            <motion.path
              d={`M ${data.map((item, index) => {
                const value = Array.isArray(item.value) ? item.value[0] : item.value;
                const x = (index / (data.length - 1 || 1)) * 100;
                const y = 100 - (value / maxValue) * 80 - 10;
                return `${x} ${y}`;
              }).join(' L ')}`}
              fill="none"
              stroke={colors[0]}
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{ filter: `drop-shadow(0px 8px 6px ${colors[0].replace(/rgba?|\(|\)|\s|[\d.]+(?=\))/g, '').split(',').length === 3 ? `rgba(${colors[0].replace(/rgba?|\(|\)|\s|[\d.]+(?=\))/g, '')}, 0.5)` : colors[0]})` }}
            />
          </svg>

          {/* Foreground SVG for Points & Labels (Fixed Aspect/Responsive %) */}
          <svg width="100%" height="100%" className="absolute inset-0 overflow-visible z-20">
            {data.map((item, index) => {
              const value = Array.isArray(item.value) ? item.value[0] : item.value;
              const x = (index / (data.length - 1 || 1)) * 100;
              const y = 100 - (value / maxValue) * 80 - 10;
              
              return (
                <g key={index} className="group/point cursor-pointer">
                  {/* Point Outer Glow (Hover) */}
                  <motion.circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="8"
                    fill={colors[0]}
                    opacity="0"
                    whileHover={{ opacity: 0.3 }}
                    className="transition-opacity duration-300 pointer-events-none"
                  />
                  {/* Actual Point */}
                  <motion.circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="var(--bg-main)"
                    stroke={colors[0]}
                    strokeWidth="2.5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.3, strokeWidth: 3 }}
                    transition={{ delay: index * 0.1 }}
                  />
                  
                  {/* Value Label Above Dots */}
                  <motion.text
                    x={`${x}%`}
                    y={`${y}%`}
                    dy="-12"
                    textAnchor="middle"
                    className="text-[10px] font-black fill-[var(--text-main)] pointer-events-none transition-all duration-300 group-hover/point:-translate-y-1 group-hover/point:scale-110"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    {value}L
                  </motion.text>
                </g>
              );
            })}
          </svg>
          
          {/* Solid Baseline */}
          <div className="absolute bottom-0 left-0 w-full border-b border-[var(--glass-border)] opacity-80 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"></div>
        </div>
        {/* X-axis labels - Always show even in minimal, scaled down */}
        <div className="flex justify-between mt-1 px-[2px]">
          {categories.map((cat, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* Tick Mark */}
              <div className="w-[1px] h-1 bg-[var(--glass-border)] mb-1 opacity-50"></div>
              {/* Month Label */}
              <div className={`font-black uppercase tracking-tighter truncate text-[var(--text-muted)] ${minimal ? 'text-[7px] opacity-60' : 'text-[9px] opacity-80'}`}>
                {cat}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Pie Chart
  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + (Array.isArray(item.value) ? item.value[0] : item.value), 0);
    let currentAngle = 0;
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <svg width="80%" height="80%" viewBox="0 0 100 100" className="overflow-visible">
          {data.map((item, index) => {
            const value = Array.isArray(item.value) ? item.value[0] : item.value;
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const x1 = 50 + 40 * Math.cos(currentAngle * Math.PI / 180);
            const y1 = 50 + 40 * Math.sin(currentAngle * Math.PI / 180);
            const x2 = 50 + 40 * Math.cos((currentAngle + angle) * Math.PI / 180);
            const y2 = 50 + 40 * Math.sin((currentAngle + angle) * Math.PI / 180);
            
            const path = `
              M 50 50
              L ${x1} ${y1}
              A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}
              Z
            `;
            
            const segment = (
              <motion.path
                key={index}
                d={path}
                fill={colors[index % colors.length]}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              />
            );
            
            currentAngle += angle;
            return segment;
          })}
          
          {/* Center circle */}
          <circle cx="50" cy="50" r="15" fill="rgba(15, 23, 42, 0.8)" />
        </svg>
        
        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-4 left-0 right-0 flex flex-wrap justify-center gap-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-[10px] font-bold text-slate-400">
                  {item.label}: {((Array.isArray(item.value) ? item.value[0] : item.value) / total * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Area Chart (uses same as line but filled)
  const renderAreaChart = () => {
    return (
      <div className="relative w-full h-full">
        {renderLineChart()}
      </div>
    );
  };

  // Donut Chart (pie with hole)
  const renderDonutChart = () => {
    return (
      <div className="relative w-full h-full">
        {renderPieChart()}
      </div>
    );
  };

  // Radar Chart
  const renderRadarChart = () => {
    const sides = data.length;
    const radius = 35;
    const center = 50;
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <svg width="90%" height="90%" viewBox="0 0 100 100" className="overflow-visible">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius * scale}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Radar lines */}
          {data.map((_, i) => {
            const angle = (i / sides) * 2 * Math.PI;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Data polygon */}
          <polygon
            points={data.map((item, i) => {
              const value = Array.isArray(item.value) ? item.value[0] : item.value;
              const angle = (i / sides) * 2 * Math.PI;
              const scaledRadius = radius * (value / maxValue);
              const x = center + scaledRadius * Math.cos(angle);
              const y = center + scaledRadius * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ')}
            fill={colors[0].replace('0.8', '0.2')}
            stroke={colors[0]}
            strokeWidth="2"
            className="transition-all duration-500"
          />
          
          {/* Data points */}
          {data.map((item, i) => {
            const value = Array.isArray(item.value) ? item.value[0] : item.value;
            const angle = (i / sides) * 2 * Math.PI;
            const scaledRadius = radius * (value / maxValue);
            const x = center + scaledRadius * Math.cos(angle);
            const y = center + scaledRadius * Math.sin(angle);
            
            return (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r="2.5"
                fill={colors[i % colors.length]}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="hover:r-4 transition-all"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  // Calculate trend if multiple data points
  const calculateTrend = () => {
    if (data.length < 2) return null;
    const values = data.map(item => Array.isArray(item.value) ? item.value[0] : item.value);
    const first = values[0];
    const last = values[values.length - 1];
    const trend = ((last - first) / first) * 100;
    return trend;
  };

  const trend = calculateTrend();

  if (minimal) {
    return (
      <div className={`${className}`} style={{ height: `${chartHeight}px`, width: chartWidth }}>
        {renderChart()}
      </div>
    );
  }

  return (
    <GlassCard className={`p-6 ${className}`} glowColor={trend > 0 ? 'success' : trend < 0 ? 'accent' : 'primary'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
            {trend !== null && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(trend).toFixed(1)}%
              </div>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className="text-slate-400" />
            </button>
          )}
          
          {onExport && (
            <button
              onClick={onExport}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="Export"
            >
              <Download size={16} className="text-slate-400" />
            </button>
          )}
          
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            <MoreVertical size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        className="relative rounded-xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/10"
        style={{ height: `${chartHeight}px`, width: chartWidth }}
      >
        {renderChart()}
        
        {/* Legend */}
        {showLegend && type !== 'pie' && type !== 'donut' && (
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-center gap-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-[10px] font-bold text-slate-400">
                  {item.label || `Series ${index + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            {type.toUpperCase()} Chart • {data.length} Data Points
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </GlassCard>
  );
};

export default ChartWidget;