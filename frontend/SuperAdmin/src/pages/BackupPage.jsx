import { useState, useContext } from 'react'
import { motion } from 'framer-motion'
import { Download, Upload, Database, AlertTriangle, CheckCircle, FileJson } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { downloadExport, importSchoolData, listSchools, manualBackup } from '../api.js'
import { API_ROOT } from '../config.js'
import { GlassCard, StandardButton, StatusBadge, PageHeader } from '../components/ui/'

export default function BackupPage() {
    const toast = useContext(ToastCtx)
    const [schools, setSchools] = useState([])
    const [schoolsLoaded, setSchoolsLoaded] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [selectedSchool, setSelectedSchool] = useState('')
    const [importFile, setImportFile] = useState(null)
    const [exportingId, setExportingId] = useState(null)
    const [importingGeo, setImportingGeo] = useState(false)

    const handleGeoExport = async () => {
        try {
            const res = await fetch(`${API_ROOT}/geo/export`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'geo.json';
            a.click();
            window.URL.revokeObjectURL(url);
            toast('success', 'Global Geo JSON Exported');
        } catch (e) {
            toast('error', 'Failed to export Geo JSON');
        }
    }

    const handleGeoImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportingGeo(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await fetch(`${API_ROOT}/geo/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                toast('success', 'Geo Data updated and synced successfully!');
            } else {
                toast('error', result.message || 'Geo Data update failed');
            }
        } catch (error) {
            toast('error', 'Invalid JSON file');
        }
        setImportingGeo(false);
        e.target.value = null;
    }

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
            <PageHeader
                title="Backup & Restore"
                description="Export full school data as JSON or restore from a backup file"
                actions={<Database size={22} style={{ color: 'var(--color-primary)' }} />}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <GlassCard glowColor="primary">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                        <Download size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--color-primary)' }} /> Export Data
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 18 }}>
                        Download complete school data as a JSON file (students, employees, classes, fees, attendance, and more).
                    </p>

                    <StandardButton
                        variant="primary"
                        size="md"
                        className="w-full justify-center"
                        icon={Database}
                        isLoading={exportingId === 'all'}
                        onClick={() => handleExport('all')}
                        disabled={exportingId !== null}
                    >
                        Export All Schools
                    </StandardButton>

                    <div style={{ border: '1px dashed var(--border-default)', borderRadius: 8, padding: 14, marginBottom: 10, marginTop: 14 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Or export a single school:</p>
                        {!schoolsLoaded ? (
                            <StandardButton variant="ghost" size="sm" className="w-full justify-center" onClick={loadSchools}>
                                Load school list
                            </StandardButton>
                        ) : (
                            <>
                                <select
                                    className="form-select"
                                    value={selectedSchool}
                                    onChange={e => setSelectedSchool(e.target.value)}
                                    style={{ marginBottom: 10, width: '100%' }}
                                >
                                    <option value="">Select school…</option>
                                    {schools.map(s => (
                                        <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolId})</option>
                                    ))}
                                </select>
                                <StandardButton
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-center"
                                    icon={Download}
                                    isLoading={exportingId === selectedSchool}
                                    disabled={!selectedSchool || exportingId !== null}
                                    onClick={() => handleExport(selectedSchool)}
                                >
                                    Export {selectedSchool || 'School'}
                                </StandardButton>
                            </>
                        )}
                    </div>

                    <div className="alert-inline alert-inline-info" style={{ marginBottom: 14 }}>
                        📦 Exports include: school info, students, employees, classes, subjects, fees, attendance, announcements, events, complaints, spaces
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 14 }}>
                        <h4 style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>System Auto-Backup</h4>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                            The system performs an incremental auto-backup every 15 minutes to the server's local storage.
                        </p>
                        <StandardButton
                            variant="ghost"
                            size="md"
                            className="w-full justify-center"
                            icon={Database}
                            onClick={async () => {
                                try {
                                    const r = await manualBackup();
                                    if(r.success) toast('success', 'Manual system backup triggered');
                                    else toast('error', r.message || 'Backup failed');
                                } catch(e) { toast('error', 'Failed to trigger backup'); }
                            }}
                        >
                            Trigger Manual System Backup
                        </StandardButton>
                    </div>
                </GlassCard>

                <GlassCard glowColor="warning">
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                        <Upload size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--color-warning)' }} /> Restore from Backup
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 18 }}>
                        Import student and school data from a previously exported JSON backup file.
                    </p>

                    <div
                        className="flex flex-col items-center gap-4"
                        style={{
                            border: `2px dashed ${importFile ? 'var(--color-primary)' : 'var(--border-default)'}`,
                            borderRadius: 10, padding: 24, textAlign: 'center',
                            cursor: 'pointer', marginBottom: 14,
                            background: importFile ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'transparent',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => document.getElementById('file-input').click()}
                    >
                        <FileJson size={28} style={{ color: importFile ? 'var(--color-primary)' : 'var(--text-tertiary)', marginBottom: 8 }} />
                        {importFile ? (
                            <>
                                <p style={{ fontWeight: 600, fontSize: 13 }}>{importFile.name}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{(importFile.size / 1024).toFixed(1)} KB</p>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Click to select backup JSON</p>
                                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Only valid export JSON files are accepted</p>
                            </>
                        )}
                        <input id="file-input" type="file" accept=".json" style={{ display: 'none' }}
                            onChange={e => setImportFile(e.target.files[0] || null)} />
                    </div>

                    {!schoolsLoaded && (
                        <StandardButton variant="ghost" size="sm" className="w-full justify-center" style={{ marginBottom: 10 }} onClick={loadSchools}>
                            Load school list to select target
                        </StandardButton>
                    )}
                    {schoolsLoaded && (
                        <div className="input-group">
                            <label>Target School</label>
                            <select className="form-select" value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
                                <option value="">Select school to restore into…</option>
                                {schools.map(s => (
                                    <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolId})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="alert-inline alert-inline-warning" style={{ marginBottom: 14 }}>
                        <AlertTriangle size={12} />
                        Import will upsert records — existing data for conflicting IDs will be overwritten.
                    </div>

                    <StandardButton
                        variant="primary"
                        size="md"
                        className="w-full justify-center"
                        icon={Upload}
                        isLoading={importing}
                        disabled={importing || !importFile || !selectedSchool}
                        onClick={handleImport}
                    >
                        Restore from File
                    </StandardButton>

                    {importResult && (
                        <div className={`alert-inline ${importResult.success ? 'alert-inline-success' : 'alert-inline-danger'}`} style={{ marginTop: 14 }}>
                            <CheckCircle size={13} />
                            {importResult.data?.message || importResult.message}
                        </div>
                    )}
                </GlassCard>
            </div>

            <h2 style={{ marginTop: 30, color: 'var(--text)', fontWeight: 600, fontSize: 'var(--text-lg)' }}>System Configuration</h2>
            <GlassCard glowColor="accent" style={{ marginTop: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                    <Database size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--color-primary)' }} /> Geo Data Management
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 18 }}>
                    Download the global Geo Data JSON (Countries, States, Districts), add locations, and upload to sync the backend database.
                </p>

                <div className="flex gap-4">
                    <StandardButton variant="ghost" size="md" icon={Download} onClick={handleGeoExport}>
                        Download geo.json
                    </StandardButton>
                    <div>
                        <input type="file" id="geo-upload" accept=".json" style={{ display: 'none' }} onChange={handleGeoImport} />
                        <StandardButton
                            variant="primary"
                            size="md"
                            icon={Upload}
                            isLoading={importingGeo}
                            onClick={() => document.getElementById('geo-upload').click()}
                        >
                            Upload & Sync Geo Data
                        </StandardButton>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    )
}
