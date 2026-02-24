import { useState, useContext } from 'react'
import { motion } from 'framer-motion'
import { Download, Upload, Database, AlertTriangle, CheckCircle, Loader, FileJson } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { downloadExport, importSchoolData, listSchools } from '../api.js'

export default function BackupPage() {
    const toast = useContext(ToastCtx)
    const [schools, setSchools] = useState([])
    const [schoolsLoaded, setSchoolsLoaded] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [selectedSchool, setSelectedSchool] = useState('')
    const [importFile, setImportFile] = useState(null)
    const [exportingId, setExportingId] = useState(null)

    const loadSchools = async () => {
        const r = await listSchools()
        setSchools(r.data || [])
        setSchoolsLoaded(true)
    }

    const handleExport = async (id) => {
        setExportingId(id)
        try {
            await downloadExport(id)
            toast('success', id === 'all' ? 'All schools exported' : `School ${id} exported`)
        } catch { toast('error', 'Export failed') }
        setExportingId(null)
    }

    const handleImport = async () => {
        if (!importFile || !selectedSchool) return
        setImporting(true)
        setImportResult(null)
        try {
            const text = await importFile.text()
            const data = JSON.parse(text)
            const r = await importSchoolData(selectedSchool, data)
            setImportResult(r)
            if (r.success) toast('success', `Imported successfully`)
            else toast('error', r.message || 'Import failed')
        } catch (e) {
            toast('error', 'Invalid JSON file')
        }
        setImporting(false)
    }

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Database size={22} style={{ color: 'var(--accent)' }} />
                <h1 className="page-title">Backup & Restore</h1>
            </div>
            <p className="page-sub">Export full school data as JSON or restore from a backup file</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Export */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                        <Download size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--accent)' }} /> Export Data
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
                        Download complete school data as a JSON file (students, employees, classes, fees, attendance, and more).
                    </p>

                    {/* Export all */}
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}
                        onClick={() => handleExport('all')}
                        disabled={exportingId !== null}
                    >
                        {exportingId === 'all' ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Database size={14} />}
                        Export All Schools
                    </button>

                    <div style={{ border: '1px dashed var(--glass-border)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>Or export a single school:</p>
                        {!schoolsLoaded ? (
                            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={loadSchools}>
                                Load school list
                            </button>
                        ) : (
                            <>
                                <select
                                    value={selectedSchool}
                                    onChange={e => setSelectedSchool(e.target.value)}
                                    style={{ marginBottom: 10 }}
                                >
                                    <option value="">Select school…</option>
                                    {schools.map(s => (
                                        <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolId})</option>
                                    ))}
                                </select>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    disabled={!selectedSchool || exportingId !== null}
                                    onClick={() => handleExport(selectedSchool)}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    {exportingId === selectedSchool ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                                    Export {selectedSchool || 'School'}
                                </button>
                            </>
                        )}
                    </div>

                    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text3)' }}>
                        📦 Exports include: school info, students, employees, classes, subjects, fees, attendance, announcements, events, complaints, spaces
                    </div>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>

                {/* Import */}
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                        <Upload size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--amber)' }} /> Restore from Backup
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
                        Import student and school data from a previously exported JSON backup file.
                    </p>

                    <div
                        style={{
                            border: `2px dashed ${importFile ? 'var(--accent)' : 'var(--glass-border)'}`,
                            borderRadius: 10, padding: 24, textAlign: 'center',
                            cursor: 'pointer', marginBottom: 14,
                            background: importFile ? 'rgba(99,102,241,0.05)' : 'transparent',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => document.getElementById('file-input').click()}
                    >
                        <FileJson size={28} style={{ color: importFile ? 'var(--accent)' : 'var(--text3)', marginBottom: 8 }} />
                        {importFile ? (
                            <>
                                <p style={{ fontWeight: 600, fontSize: 13 }}>{importFile.name}</p>
                                <p style={{ fontSize: 11, color: 'var(--text2)' }}>{(importFile.size / 1024).toFixed(1)} KB</p>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: 13, color: 'var(--text2)' }}>Click to select backup JSON</p>
                                <p style={{ fontSize: 11, color: 'var(--text3)' }}>Only valid export JSON files are accepted</p>
                            </>
                        )}
                        <input id="file-input" type="file" accept=".json" style={{ display: 'none' }}
                            onChange={e => setImportFile(e.target.files[0] || null)} />
                    </div>

                    {!schoolsLoaded && (
                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }} onClick={loadSchools}>
                            Load school list to select target
                        </button>
                    )}
                    {schoolsLoaded && (
                        <div className="input-group">
                            <label>Target School</label>
                            <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
                                <option value="">Select school to restore into…</option>
                                {schools.map(s => (
                                    <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolId})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#f59e0b', marginBottom: 14 }}>
                        <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Import will upsert records — existing data for conflicting IDs will be overwritten.
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleImport}
                        disabled={importing || !importFile || !selectedSchool}
                    >
                        {importing ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                        Restore from File
                    </button>

                    {importResult && (
                        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 12, background: importResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: importResult.success ? '#34d399' : '#f87171' }}>
                            <CheckCircle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {importResult.data?.message || importResult.message}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
