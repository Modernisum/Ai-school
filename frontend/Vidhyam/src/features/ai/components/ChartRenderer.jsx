import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function ChartRenderer({ jsonString }) {
  let config = null;
  try {
    config = JSON.parse(jsonString);
  } catch (e) {
    return <div className="text-red-400 text-xs p-2 border border-red-500/20 bg-red-500/10 rounded">Failed to parse chart data.</div>;
  }

  if (!config || !config.type || !config.data) {
    return <div className="text-red-400 text-xs p-2 border border-red-500/20 bg-red-500/10 rounded">Invalid chart configuration.</div>;
  }

  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

  const renderChartType = () => {
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey={config.xAxisKey || 'name'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0b0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }} />
              {(config.series || [{key: 'value'}]).map((s, i) => (
                <Bar key={s.key} dataKey={s.key} fill={s.color || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );


      case 'area':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey={config.xAxisKey || 'name'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0b0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {(config.series || [{key: 'value'}]).map((s, i) => (
                <Area type="monotone" key={s.key} dataKey={s.key} stroke={s.color || COLORS[i % COLORS.length]} fill={s.color || COLORS[i % COLORS.length]} fillOpacity={0.3} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey={config.xAxisKey || 'name'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0b0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {(config.series || [{key: 'value'}]).map((s, i) => (
                <Line type="monotone" key={s.key} dataKey={s.key} stroke={s.color || COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4, fill: '#1f2937' }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const nameKey = config.xAxisKey || 'name';
        const dataKey = (config.series && config.series[0]?.key) || 'value';
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0b0c0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Pie
                data={config.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={nameKey}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {config.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-red-400 text-xs">Unsupported chart type: {config.type}</div>;
    }
  };

  return (
    <div className="my-3 p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="text-[10px] text-primary/70 font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Data Analytics Visualization
      </div>
      {renderChartType()}
    </div>
  );
}
