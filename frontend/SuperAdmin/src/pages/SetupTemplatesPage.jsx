import { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import { 
    FileText, Plus, Edit, Trash2, Check, X, Copy, Settings, 
    Layers, Database, School, BookOpen, Shield, Users, DollarSign,
    ChevronRight, ChevronDown, Eye, EyeOff, Save, RefreshCw
} from 'lucide-react'
import { ToastCtx } from '../App.jsx'

import { API_ADMIN as API_BASE } from '../config.js'

const authFetch = async (path, opts = {}) => {
    const token = localStorage.getItem("sa_token");
    const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(opts.headers || {}),
        },
    });
    return res.json();
};

const SectionConfig = ({ section, config, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [localConfig, setLocalConfig] = useState(config || { enabled: true, fields: [] });

    const fieldTypes = [
        { value: 'text', label: 'Text Field' },
        { value: 'number', label: 'Number' },
        { value: 'select', label: 'Dropdown' },
        { value: 'checkbox', label: 'Checkbox' },
        { value: 'date', label: 'Date' },
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' },
        { value: 'textarea', label: 'Text Area' },
    ];

    const addField = () => {
        const newField = {
            id: `field_${Date.now()}`,
            name: '',
            label: '',
            type: 'text',
            required: false,
            defaultValue: '',
            options: [],
            autoFill: true,
            validation: ''
        };
        setLocalConfig(prev => ({
            ...prev,
            fields: [...prev.fields, newField]
        }));
    };

    const updateField = (fieldId, key, value) => {
        setLocalConfig(prev => ({
            ...prev,
            fields: prev.fields.map(f => 
                f.id === fieldId ? { ...f, [key]: value } : f
            )
        }));
    };

    const removeField = (fieldId) => {
        setLocalConfig(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.id !== fieldId)
        }));
    };

    const saveChanges = () => {
        onUpdate(section, localConfig);
    };

    return (
        <div className="config-section">
            <div 
                className="config-header" 
                onClick={() => setExpanded(!expanded)}
                style={{ cursor: 'pointer', padding: '12px 16px', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '8px' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '6px', 
                        background: 'var(--accent)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        {section === 'academic' && <BookOpen size={14} color="white" />}
                        {section === 'infrastructure' && <Layers size={14} color="white" />}
                        {section === 'administration' && <Shield size={14} color="white" />}
                        {section === 'fees' && <DollarSign size={14} color="white" />}
                        {section === 'students' && <Users size={14} color="white" />}
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                            {section === 'academic' && 'Academic Setup'}
                            {section === 'infrastructure' && 'Infrastructure'}
                            {section === 'administration' && 'Administration'}
                            {section === 'fees' && 'Fee Structure'}
                            {section === 'students' && 'Student Management'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-light)' }}>
                            {localConfig.fields.length} fields • {localConfig.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={localConfig.enabled}
                            onChange={(e) => setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        />
                        <span className="slider"></span>
                    </label>
                    <button 
                        className="btn btn-sm btn-primary"
                        onClick={(e) => { e.stopPropagation(); saveChanges(); }}
                        style={{ padding: '6px 12px' }}
                    >
                        <Save size={14} /> Save
                    </button>
                </div>
            </div>

            {expanded && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="config-content"
                    style={{ padding: '16px', background: 'var(--bg-lighter)', borderRadius: '8px', marginBottom: '16px' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Field Configuration</h5>
                        <button className="btn btn-sm btn-outline" onClick={addField}>
                            <Plus size={14} /> Add Field
                        </button>
                    </div>

                    {localConfig.fields.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)' }}>
                            <FileText size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                            <p>No fields configured. Add fields to define what data gets auto-filled.</p>
                        </div>
                    ) : (
                        <div className="fields-grid">
                            {localConfig.fields.map((field, index) => (
                                <div key={field.id} className="field-card" style={{ 
                                    padding: '12px', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '8px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ 
                                                fontSize: '12px', 
                                                fontWeight: '600', 
                                                background: 'var(--accent-light)', 
                                                color: 'var(--accent)',
                                                padding: '2px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                Field #{index + 1}
                                            </span>
                                            <input
                                                type="text"
                                                value={field.name}
                                                onChange={(e) => updateField(field.id, 'name', e.target.value)}
                                                placeholder="Field name (API key)"
                                                style={{ 
                                                    padding: '6px 10px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    width: '180px'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                                placeholder="Display label"
                                                style={{ 
                                                    padding: '6px 10px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    width: '180px'
                                                }}
                                            />
                                        </div>
                                        <button 
                                            className="btn btn-sm btn-danger"
                                            onClick={() => removeField(field.id)}
                                            style={{ padding: '4px 8px' }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Type</label>
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateField(field.id, 'type', e.target.value)}
                                                style={{ 
                                                    width: '100%',
                                                    padding: '6px 10px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {fieldTypes.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Default Value</label>
                                            <input
                                                type="text"
                                                value={field.defaultValue}
                                                onChange={(e) => updateField(field.id, 'defaultValue', e.target.value)}
                                                placeholder="Auto-fill value"
                                                style={{ 
                                                    width: '100%',
                                                    padding: '6px 10px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Required</label>
                                                <label className="switch small">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={field.required}
                                                        onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Auto-fill</label>
                                                <label className="switch small">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={field.autoFill}
                                                        onChange={(e) => updateField(field.id, 'autoFill', e.target.checked)}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {field.type === 'select' && (
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Options (comma-separated)</label>
                                            <input
                                                type="text"
                                                value={field.options.join(', ')}
                                                onChange={(e) => updateField(field.id, 'options', e.target.value.split(',').map(o => o.trim()))}
                                                placeholder="Option 1, Option 2, Option 3"
                                                style={{ 
                                                    width: '100%',
                                                    padding: '6px 10px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ marginTop: '12px' }}>
                                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Validation Rule (optional)</label>
                                        <input
                                            type="text"
                                            value={field.validation}
                                            onChange={(e) => updateField(field.id, 'validation', e.target.value)}
                                            placeholder="e.g., email, phone, min:6, regex:^[A-Z]"
                                            style={{ 
                                                width: '100%',
                                                padding: '6px 10px',
                                                border: '1px solid var(--border)',
                                                borderRadius: '4px',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

function SetupTemplatesPage() {
    const toast = useContext(ToastCtx);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: '', description: '', isDefault: false });
    const [config, setConfig] = useState({
        academic: { enabled: true, fields: [] },
        infrastructure: { enabled: true, fields: [] },
        administration: { enabled: true, fields: [] },
        fees: { enabled: true, fields: [] },
        students: { enabled: true, fields: [] }
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await authFetch('/setup-templates');
            if (data.success) {
                setTemplates(data.templates || []);
                if (data.templates?.length > 0) {
                    // Load the first template's config
                    loadTemplateConfig(data.templates[0].id);
                    setSelectedTemplate(data.templates[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to load templates:', err);
            toast('error', 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const loadTemplateConfig = async (templateId) => {
        try {
            const data = await authFetch(`/setup-templates/${templateId}/config`);
            if (data.success && data.config) {
                setConfig(data.config);
            }
        } catch (err) {
            console.error('Failed to load template config:', err);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplate.name.trim()) {
            toast('error', 'Template name is required');
            return;
        }

        try {
            const data = await authFetch('/setup-templates', {
                method: 'POST',
                body: JSON.stringify({
                    name: newTemplate.name,
                    description: newTemplate.description,
                    isDefault: newTemplate.isDefault
                })
            });

            if (data.success) {
                toast('success', `Template "${newTemplate.name}" created`);
                setShowCreateModal(false);
                setNewTemplate({ name: '', description: '', isDefault: false });
                loadTemplates();
            } else {
                toast('error', data.message || 'Failed to create template');
            }
        } catch (err) {
            console.error('Failed to create template:', err);
            toast('error', 'Failed to create template');
        }
    };

    const handleUpdateConfig = async (section, sectionConfig) => {
        if (!selectedTemplate) {
            toast('error', 'No template selected');
            return;
        }

        const updatedConfig = { ...config, [section]: sectionConfig };
        setConfig(updatedConfig);

        try {
            const data = await authFetch(`/setup-templates/${selectedTemplate}/config`, {
                method: 'PUT',
                body: JSON.stringify({ config: updatedConfig })
            });

            if (data.success) {
                toast('success', `${section} configuration updated`);
            } else {
                toast('error', data.message || 'Failed to update config');
            }
        } catch (err) {
            console.error('Failed to update config:', err);
            toast('error', 'Failed to update configuration');
        }
    };

    const handleSetDefault = async (templateId) => {
        try {
            const data = await authFetch(`/setup-templates/${templateId}`, {
                method: 'PUT',
                body: JSON.stringify({ isDefault: true })
            });

            if (data.success) {
                toast('success', 'Default template updated');
                loadTemplates();
            }
        } catch (err) {
            console.error('Failed to set default:', err);
            toast('error', 'Failed to set default template');
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
            return;
        }

        try {
            const data = await authFetch(`/setup-templates/${templateId}`, {
                method: 'DELETE'
            });

            if (data.success) {
                toast('success', 'Template deleted');
                loadTemplates();
                if (selectedTemplate === templateId) {
                    setSelectedTemplate(null);
                    setConfig({
                        academic: { enabled: true, fields: [] },
                        infrastructure: { enabled: true, fields: [] },
                        administration: { enabled: true, fields: [] },
                        fees: { enabled: true, fields: [] },
                        students: { enabled: true, fields: [] }
                    });
                }
            }
        } catch (err) {
            console.error('Failed to delete template:', err);
            toast('error', 'Failed to delete template');
        }
    };

    const handleDuplicateTemplate = async (templateId) => {
        try {
            const template = templates.find(t => t.id === templateId);
            if (!template) return;

            const data = await authFetch('/setup-templates', {
                method: 'POST',
                body: JSON.stringify({
                    name: `${template.name} (Copy)`,
                    description: template.description,
                    isDefault: false,
                    metadata: template.metadata
                })
            });

            if (data.success) {
                toast('success', `Template duplicated`);
                loadTemplates();
            } else {
                toast('error', data.message || 'Failed to duplicate template');
            }
        } catch (err) {
            console.error('Failed to duplicate template:', err);
            toast('error', 'Failed to duplicate template');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Settings size={22} style={{ color: 'var(--accent)' }} />
                <h1 className="page-title">Setup Templates</h1>
            </div>
            <p className="page-sub">Manage school setup templates for automatic data filling</p>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                {/* Templates List */}
                <div style={{ flex: '0 0 300px', background: 'var(--bg-light)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Templates</h3>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                            style={{ padding: '8px 16px' }}
                        >
                            <Plus size={16} /> New Template
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div className="spinner"></div>
                            <p style={{ marginTop: '12px', color: 'var(--text-light)' }}>Loading templates...</p>
                        </div>
                    ) : templates.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                            <FileText size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <p>No templates found. Create your first template to get started.</p>
                        </div>
                    ) : (
                        <div className="templates-list">
                            {templates.map(template => (
                                <div
                                    key={template.id}
                                    className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedTemplate(template.id);
                                        loadTemplateConfig(template.id);
                                    }}
                                    style={{
                                        padding: '16px',
                                        border: selectedTemplate === template.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        borderRadius: '8px',
                                        marginBottom: '12px',
                                        cursor: 'pointer',
                                        background: selectedTemplate === template.id ? 'var(--accent-light)' : 'var(--bg-lighter)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{template.name}</h4>
                                                {template.is_default && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: '700',
                                                        background: 'var(--accent)',
                                                        color: 'white',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px' }}>
                                                {template.description || 'No description'}
                                            </p>
                                            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-light)' }}>
                                                <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>Schools: {template.school_count || 0}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {!template.is_default && (
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSetDefault(template.id);
                                                    }}
                                                    style={{ padding: '4px 8px' }}
                                                    title="Set as default"
                                                >
                                                    <Check size={12} />
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDuplicateTemplate(template.id);
                                                }}
                                                style={{ padding: '4px 8px' }}
                                                title="Duplicate"
                                            >
                                                <Copy size={12} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTemplate(template.id);
                                                }}
                                                style={{ padding: '4px 8px' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Configuration Panel */}
                <div style={{ flex: 1, background: 'var(--bg-light)', borderRadius: '12px', padding: '20px' }}>
                    {selectedTemplate ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                                        {templates.find(t => t.id === selectedTemplate)?.name || 'Template'} Configuration
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-light)' }}>
                                        Configure what data gets auto-filled during school setup
                                    </p>
                                </div>
                                <button
                                    className="btn btn-outline"
                                    onClick={loadTemplates}
                                    style={{ padding: '8px 16px' }}
                                >
                                    <RefreshCw size={16} /> Refresh
                                </button>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Auto-fill Sections</h4>
                                <p style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-light)' }}>
                                    Enable/disable sections and configure fields that should be automatically filled when creating a new school.
                                </p>

                                {Object.entries(config).map(([section, sectionConfig]) => (
                                    <SectionConfig
                                        key={section}
                                        section={section}
                                        config={sectionConfig}
                                        onUpdate={handleUpdateConfig}
                                    />
                                ))}
                            </div>

                            <div style={{
                                padding: '20px',
                                background: 'var(--bg-lighter)',
                                borderRadius: '8px',
                                border: '1px solid var(--border)'
                            }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Template Usage</h4>
                                <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-light)' }}>
                                    This template will be used when:
                                </p>
                                <ul style={{
                                    margin: 0,
                                    paddingLeft: '20px',
                                    fontSize: '14px',
                                    color: 'var(--text-light)'
                                }}>
                                    <li>Creating a new school via SuperAdmin (if set as default)</li>
                                    <li>Manually assigned to a specific school during setup</li>
                                    <li>Used as a reference for data standardization</li>
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <Settings size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <h4 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '600' }}>Select a Template</h4>
                            <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
                                Choose a template from the left panel to configure its auto-fill settings.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Plus size={16} /> Create Your First Template
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Template Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="modal"
                        style={{ maxWidth: '500px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Create New Template</h3>
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Template Name *</label>
                            <input
                                type="text"
                                value={newTemplate.name}
                                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                placeholder="e.g., Standard Indian School, International School, Minimal Setup"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
                            <textarea
                                value={newTemplate.description}
                                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                placeholder="Describe what this template includes..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={newTemplate.isDefault}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, isDefault: e.target.checked })}
                                />
                                <span>Set as default template for new schools</span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateTemplate}
                                disabled={!newTemplate.name.trim()}
                            >
                                Create Template
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <style jsx>{`
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                }
                .switch.small {
                    width: 32px;
                    height: 16px;
                }
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--border);
                    transition: .2s;
                    border-radius: 20px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .2s;
                    border-radius: 50%;
                }
                .switch.small .slider:before {
                    height: 12px;
                    width: 12px;
                }
                input:checked + .slider {
                    background-color: var(--accent);
                }
                input:checked + .slider:before {
                    transform: translateX(20px);
                }
                .switch.small input:checked + .slider:before {
                    transform: translateX(16px);
                }
                .checkbox {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                .checkbox input {
                    width: 18px;
                    height: 18px;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .modal {
                    background: var(--bg-light);
                    border-radius: 12px;
                    padding: 24px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .spinner {
                    border: 3px solid var(--border);
                    border-top: 3px solid var(--accent);
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </motion.div>
    );
};

export default SetupTemplatesPage;
