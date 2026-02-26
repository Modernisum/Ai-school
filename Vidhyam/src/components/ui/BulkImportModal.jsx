import React, { useState, useRef, memo } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, UploadCloud, AlertCircle, CheckCircle, X, Trash2, ArrowRight } from 'lucide-react';

const BulkImportModal = memo(({ isOpen, onClose, title, columns, expectedHeaders, onImport }) => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    // State blocks logic: 0 = Upload, 1 = Preview/Validate, 2 = Success
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([expectedHeaders]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_Template.xlsx`);
    };

    const validateRow = (row, index) => {
        const errors = [];

        // This is a dynamic required check. 
        // Real validation can be passed in as a prop function `validateFile(row)`
        expectedHeaders.forEach(header => {
            // For now, assume all expected headers are required text fields
            // In a real app we would pass a validation schema instead
            if (!row[header] || String(row[header]).trim() === '') {
                errors.push(`Missing ${header}`);
            }
        });

        // E.g., if there's a phone number, it must be 10 chars
        if (row['Phone Number'] && String(row['Phone Number']).length < 10) {
            errors.push('Phone Number too short');
        }

        return errors.length > 0 ? { row: index + 2, data: row, errors } : { row: index + 2, data: row, errors: null };
    };

    const handleFileUpload = (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);

            const validatedRows = json.map((row, i) => validateRow(row, i));

            setParsedData(validatedRows);
            setValidationErrors(validatedRows.filter(r => r.errors));
            setStep(1); // Move to preview step
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
            fileInputRef.current.files = e.dataTransfer.files;
            handleFileUpload({ target: { files: [droppedFile] } });
        }
    };

    const closeModal = () => {
        setFile(null);
        setParsedData([]);
        setValidationErrors([]);
        setStep(0);
        onClose();
    };

    const handleImport = async () => {
        if (validationErrors.length > 0) return; // Block submisison
        setImporting(true);

        // Extract just the clean data payloads mapped to DB names
        const cleanPayload = parsedData.map(r => r.data);

        try {
            await onImport(cleanPayload);
            setStep(2); // Success!
        } catch (e) {
            console.error(e);
            alert("Import failed on backend: " + e.message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4
        }}>
            <div style={{
                background: 'var(--surface-color, #1a1b23)',
                width: '100%', maxWidth: '800px',
                borderRadius: '12px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color, #333)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-color, #fff)' }}>{title}</h2>
                    <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {step === 0 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <p style={{ color: '#aaa', margin: 0 }}>Step 1: Download the template, fill it out, and upload it here.</p>
                                <button onClick={downloadTemplate} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: 'var(--accent, #6366f1)', color: 'white',
                                    border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer'
                                }}>
                                    <DownloadCloud size={18} /> Download Template
                                </button>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                style={{
                                    border: `2px dashed ${isDragging ? 'var(--accent, #6366f1)' : '#444'}`,
                                    borderRadius: '12px', padding: '40px', textAlign: 'center',
                                    backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    transition: 'all 0.2s', cursor: 'pointer'
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".xlsx, .csv"
                                    style={{ display: 'none' }}
                                />
                                <UploadCloud size={48} color={isDragging ? 'var(--accent, #6366f1)' : '#666'} style={{ marginBottom: '16px' }} />
                                <h3 style={{ margin: '0 0 8px 0', color: '#ddd' }}>Click or drag file to this area to upload</h3>
                                <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Support for a single .xlsx or .csv upload</p>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>Data Validation Preview</h3>
                                    <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>
                                        Found {parsedData.length} rows. {validationErrors.length} have errors.
                                    </p>
                                </div>
                                <button onClick={() => setStep(0)} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'transparent', color: '#ff4444',
                                    border: '1px solid #ff4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer'
                                }}>
                                    <Trash2 size={16} /> Discard & Try Again
                                </button>
                            </div>

                            {validationErrors.length > 0 ? (
                                <div style={{ background: 'rgba(255, 68, 68, 0.1)', borderLeft: '4px solid #ff4444', padding: '16px', borderRadius: '4px', marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#ff4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <AlertCircle size={20} /> Please fix the following errors in your Excel file
                                    </h4>
                                    <ul style={{ margin: 0, color: '#ff8888', paddingLeft: '20px', fontSize: '14px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {validationErrors.map((err, i) => (
                                            <li key={i} style={{ marginBottom: '4px' }}>
                                                <strong>Row {err.row}:</strong> {err.errors.join(', ')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderLeft: '4px solid #22c55e', padding: '16px', borderRadius: '4px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <CheckCircle size={24} color="#22c55e" />
                                    <p style={{ margin: 0, color: '#22c55e' }}>All {parsedData.length} records look perfect! You are ready to import.</p>
                                </div>
                            )}

                            {/* Data Table Preview */}
                            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #333' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                    <thead style={{ background: '#222' }}>
                                        <tr>
                                            <th style={{ padding: '12px', color: '#888', borderBottom: '1px solid #333' }}>Row</th>
                                            {expectedHeaders.map(h => (
                                                <th key={h} style={{ padding: '12px', color: '#888', borderBottom: '1px solid #333' }}>{h}</th>
                                            ))}
                                            <th style={{ padding: '12px', color: '#888', borderBottom: '1px solid #333' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.slice(0, 10).map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                                                <td style={{ padding: '12px', color: '#ddd' }}>{row.row}</td>
                                                {expectedHeaders.map(h => (
                                                    <td key={h} style={{ padding: '12px', color: '#ddd' }}>{row.data[h] || '-'}</td>
                                                ))}
                                                <td style={{ padding: '12px' }}>
                                                    {row.errors ? (
                                                        <span style={{ color: '#ff4444', fontSize: '12px', background: 'rgba(255, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>Invalid</span>
                                                    ) : (
                                                        <span style={{ color: '#22c55e', fontSize: '12px', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>Valid</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 10 && (
                                    <div style={{ padding: '12px', textAlign: 'center', color: '#888', background: '#1a1a1a', fontSize: '13px' }}>
                                        Showing 10 of {parsedData.length} rows
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <CheckCircle size={64} color="#22c55e" style={{ marginBottom: '16px' }} />
                            <h2 style={{ color: '#fff', margin: '0 0 12px 0' }}>Import Successful!</h2>
                            <p style={{ color: '#888', marginBottom: '32px' }}>You successfully added {parsedData.length} records to the system.</p>
                            <button onClick={closeModal} style={{
                                background: 'var(--accent, #6366f1)', color: 'white',
                                border: 'none', padding: '12px 32px', borderRadius: '8px', cursor: 'pointer',
                                fontSize: '16px', fontWeight: '500'
                            }}>
                                Continue Working
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {step === 1 && (
                    <div style={{ padding: '20px', borderTop: '1px solid var(--border-color, #333)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            onClick={() => setStep(0)}
                            disabled={importing}
                            style={{
                                background: 'transparent', color: '#ddd',
                                border: '1px solid #555', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={validationErrors.length > 0 || importing}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: validationErrors.length > 0 ? '#444' : 'var(--accent, #6366f1)',
                                color: validationErrors.length > 0 ? '#888' : 'white',
                                border: 'none', padding: '10px 20px', borderRadius: '6px',
                                cursor: validationErrors.length > 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {importing ? 'Importing Data...' : 'Confirm Import'} <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});
BulkImportModal.displayName = 'BulkImportModal';
export default BulkImportModal;
