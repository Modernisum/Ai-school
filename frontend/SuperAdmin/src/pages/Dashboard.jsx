import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import {
  School, Ban, CheckCircle, TrendingUp, Users, CreditCard,
  Activity, AlertTriangle, ArrowRight, RefreshCw, DollarSign,
  Zap, Globe, CalendarDays, PieChart, ShieldCheck
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { listSchools, getChurnRadar, getHealth } from '../api.js';
import { StatCard, ChartCard, StatusBadge, DataTable, formatCurrency, formatDate, HealthDot } from '../components/ui/index.js';
import { useRBAC } from '../contexts/RBACContext.jsx';

const CHART_COLORS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-info)', 'var(--color-secondary)'];

export default function CommandCenter() {
  const [schools, setSchools] = useState([]);
  const [churnData, setChurnData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [schoolsRes, churnRes, healthRes] = await Promise.allSettled([
        listSchools(),
        getChurnRadar(),
        getHealth(),
      ]);
      if (schoolsRes.status === 'fulfilled') setSchools(schoolsRes.value.data || []);
      if (churnRes.status === 'fulfilled') setChurnData(churnRes.value.data || churnRes.value);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const refresh = () => { setRefreshing(true); fetchAll(); };

  // ── Compute Metrics ──────────────────────────────────────────────────────────
  const now = Date.now();
  const msPerDay = 86400000;

  const metrics = useMemo(() => {
    const total = schools.length;
    const active = schools.filter(s => s.status === 'active').length;
    const blocked = schools.filter(s => s.isBlocked).length;
    const trial = schools.filter(s => s.status === 'trial').length;
    const thisWeek = schools.filter(s => {
      const created = s.createdAt ? new Date(s.createdAt).getTime() : 0;
      return now - created < 7 * msPerDay;
    }).length;
    const thisMonth = schools.filter(s => {
      const created = s.createdAt ? new Date(s.createdAt).getTime() : 0;
      return now - created < 30 * msPerDay;
    }).length;
    const churnRisk = churnData?.atRiskCount || schools.filter(s => s.churnRisk === 'high').length;
    const revenue = active * 499; // placeholder - should come from backend
    const growthRate = total > 0 && thisMonth > 0 ? ((thisMonth / total) * 100).toFixed(1) : 0;

    return { total, active, blocked, trial, thisWeek, thisMonth, churnRisk, revenue, growthRate };
  }, [schools, churnData, now]);

  // ── Chart Data ───────────────────────────────────────────────────────────────
  const registrationData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });
    return days.map(date => {
      const registrations = schools.filter(s => s.createdAt?.startsWith(date)).length;
      const activeCount = schools.filter(s => s.status === 'active' && s.createdAt <= date).length;
      return { date: date.slice(5), registrations, active: activeCount };
    });
  }, [schools]);

  const statusDistribution = useMemo(() => {
    const dist = {};
    schools.forEach(s => { const st = s.status || 'unknown'; dist[st] = (dist[st] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [schools]);

  const recentSchools = useMemo(() =>
    [...schools].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8),
    [schools]
  );

  const healthStatus = health?.status || 'checking';
  const deps = health?.dependencies || {};

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ letterSpacing: '-0.02em' }}>Command Center</h1>
          <p className="text-sm text-secondary mt-1">
            Real-time SaaS ecosystem overview · Updated {formatDate(lastRefresh, 'relative')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <HealthDot status={healthStatus} size={7} />
            System {healthStatus}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="stats-grid mb-6">
        <StatCard label="Total Schools" value={metrics.total} icon={School} color="primary" trend={metrics.growthRate} trendLabel="growth" />
        <StatCard label="Active Schools" value={metrics.active} icon={CheckCircle} color="success" />
        <StatCard label="Blocked / At Risk" value={`${metrics.blocked} / ${metrics.churnRisk}`} icon={AlertTriangle} color="danger" />
        <StatCard label="New This Week" value={metrics.thisWeek} icon={TrendingUp} color="info" />
        <StatCard label="Est. MRR" value={formatCurrency(metrics.revenue)} icon={DollarSign} color="warning" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Registration & Active Schools Chart */}
        <ChartCard
          className="col-span-2"
          title="School Registration & Active Growth"
          subtitle="Last 14 days"
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1"><span style={{ width: 10, height: 2, background: 'var(--color-primary)', borderRadius: 1, display: 'inline-block' }} /> <span className="text-xs text-tertiary">Registrations</span></div>
              <div className="flex items-center gap-1"><span style={{ width: 10, height: 2, background: 'var(--color-success)', borderRadius: 1, display: 'inline-block' }} /> <span className="text-xs text-tertiary">Active</span></div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={registrationData}>
              <defs>
                <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} /></linearGradient>
                <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--surface-layer2)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="active" stroke="var(--color-success)" strokeWidth={2} fill="url(#gradActive)" name="Active Schools" />
              <Bar dataKey="registrations" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="New Registrations" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Distribution & Health */}
        <div className="flex flex-col gap-6">
          {/* Status Pie */}
          <ChartCard title="School Status Distribution" style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={200}>
              <RPieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface-layer2)', border: '1px solid var(--border-default)', borderRadius: 12 }} />
              </RPieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {statusDistribution.slice(0, 4).map((s, i) => (
                <div key={s.name} className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i], display: 'inline-block' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* System Health Mini */}
          <div className="glass-card dense">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><ShieldCheck size={14} color="var(--color-success)" />System Health</h3>
              <StatusBadge status={healthStatus} label={healthStatus} />
            </div>
            <div className="flex flex-col gap-2">
              {Object.entries(deps).slice(0, 4).map(([name, dep]) => (
                <div key={name} className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-xs text-secondary capitalize">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs mono text-tertiary">{dep.latency_ms}ms</span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dep.status === 'healthy' ? 'var(--color-success)' : 'var(--color-danger)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Churn Radar & Recent Schools */}
      <div className="grid grid-cols-3 gap-6">
        {/* Churn Risk */}
        <div className="glass-card danger-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle size={14} color="var(--color-danger)" />Churn Risk Radar
            </h3>
            <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{metrics.churnRisk} at risk</span>
          </div>
          {churnData?.atRiskSchools?.length > 0 ? (
            <div className="flex flex-col gap-2">
              {churnData.atRiskSchools.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="text-sm font-semibold">{s.schoolName}</div>
                    <div className="text-xs text-tertiary mono">{s.schoolId}</div>
                  </div>
                  <StatusBadge status={s.status || 'inactive'} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-tertiary text-sm">No at-risk schools detected</div>
          )}
          <button className="btn btn-ghost btn-sm w-full mt-3" onClick={() => window.location.href = '/schools?filter=at-risk'}>
            View All <ArrowRight size={12} />
          </button>
        </div>

        {/* Recent Registrations */}
        <div className="glass-card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">Recent Registrations</h3>
            <button className="btn btn-ghost btn-xs" onClick={() => window.location.href = '/schools'}>View All <ArrowRight size={12} /></button>
          </div>
          {recentSchools.length === 0 ? (
            <div className="text-center py-8 text-tertiary text-sm">No schools registered yet</div>
          ) : (
            <div className="flex flex-col gap-0">
              {recentSchools.map(s => (
                <div key={s.schoolId} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="text-sm font-semibold">{s.schoolName}</div>
                    <div className="text-xs text-tertiary mono">{s.schoolId}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={s.status} />
                    <span className="text-xs text-tertiary">{formatDate(s.createdAt, 'relative')}</span>
                    <button className="btn btn-ghost btn-xs btn-icon" onClick={() => window.location.href = `/schools/${s.schoolId}`}>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
