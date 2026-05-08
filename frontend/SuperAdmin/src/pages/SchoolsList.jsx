import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  School, Download, Ban, CheckCircle,
  Trash2, Eye, RefreshCw
} from 'lucide-react';
import { listSchools, setStatus, deleteSchool, downloadExport } from '../api.js';
import { DataTable, PageHeader, StatusBadge, StatCard, formatDate, ConfirmDialog } from '../components/ui/index.js';

export default function SchoolsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || '');
  const [selected, setSelected] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSchools();
      setSchools(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const filtered = useMemo(() => {
    let result = schools;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.schoolName?.toLowerCase().includes(q) || s.schoolId?.toLowerCase().includes(q));
    }
    if (statusFilter === 'at-risk') result = result.filter(s => s.churnRisk === 'high' || s.isBlocked);
    else if (statusFilter) result = result.filter(s => s.status === statusFilter);
    return result;
  }, [schools, search, statusFilter]);

  const stats = useMemo(() => ({
    total: schools.length,
    active: schools.filter(s => s.status === 'active').length,
    blocked: schools.filter(s => s.isBlocked).length,
    trial: schools.filter(s => s.status === 'trial').length,
  }), [schools]);

  const handleBlock = async (schoolId, block) => {
    await setStatus(schoolId, block ? 'blocked' : 'active');
    fetchSchools();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteSchool(confirmDelete);
    setConfirmDelete(null);
    fetchSchools();
  };

  const handleBulkAction = async (action) => {
    for (const id of selected) {
      if (action === 'block') await setStatus(id, 'blocked');
      else if (action === 'activate') await setStatus(id, 'active');
    }
    setSelected([]);
    fetchSchools();
  };

  const handleExport = async () => {
    await downloadExport('all');
  };

  const columns = [
    {
      key: 'schoolName',
      label: 'School',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="text-sm font-semibold">{val}</div>
          <div className="text-xs mono text-tertiary">{row.schoolId}</div>
        </div>
      ),
    },
    { key: 'status', label: 'Status', sortable: true, render: (val) => <StatusBadge status={val} /> },
    { key: 'createdAt', label: 'Registered', sortable: true, render: (val) => <span className="text-xs text-tertiary">{formatDate(val)}</span> },
    {
      key: 'plan',
      label: 'Plan / Config',
      render: (_, row) => (
        <span className="text-xs text-secondary">{row.plan || 'Basic'} · {row.sessionDurationHours || 24}h sessions</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 120,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-xs btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/schools/${row.schoolId}`); }} title="View">
            <Eye size={14} />
          </button>
          <button
            className={`btn btn-ghost btn-xs btn-icon ${row.isBlocked ? 'text-success' : 'text-danger'}`}
            onClick={(e) => { e.stopPropagation(); handleBlock(row.schoolId, !row.isBlocked); }}
            title={row.isBlocked ? 'Unblock' : 'Block'}
          >
            {row.isBlocked ? <CheckCircle size={14} /> : <Ban size={14} />}
          </button>
          <button className="btn btn-ghost btn-xs btn-icon" onClick={(e) => { e.stopPropagation(); setConfirmDelete(row.schoolId); }} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
      <PageHeader
        title="Schools Directory"
        description={`${stats.total} schools across the platform`}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} />Export All</button>
            <button className="btn btn-secondary btn-sm" onClick={fetchSchools}><RefreshCw size={14} />Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/setup')}>+ Add School</button>
          </div>
        }
      />

      <div className="stats-grid mb-6">
        <StatCard label="Total" value={stats.total} icon={School} color="primary" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle} color="success" />
        <StatCard label="Blocked" value={stats.blocked} icon={Ban} color="danger" />
        <StatCard label="Trial" value={stats.trial} color="warning" />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey="schoolId"
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by school name or ID..."
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        pageSize={15}
        onRowClick={(row) => navigate(`/schools/${row.schoolId}`)}
        filters={[{
          key: 'status', label: 'All Status', options: [
            { value: 'active', label: 'Active' },
            { value: 'trial', label: 'Trial' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'at-risk', label: 'At Risk' },
          ],
        }]}
        activeFilters={{ status: statusFilter }}
        onFilterChange={(k, v) => setStatusFilter(v)}
        bulkActions={selected.length > 0 ? (
          <div className="flex items-center gap-2">
            <button className="btn btn-xs btn-secondary" onClick={() => handleBulkAction('activate')}>Activate</button>
            <button className="btn btn-danger btn-xs" onClick={() => handleBulkAction('block')}>Block</button>
          </div>
        ) : null}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete School?"
        message="This cannot be undone. All school data will be permanently deleted."
        confirmLabel="Delete School"
      />
    </motion.div>
  );
}
