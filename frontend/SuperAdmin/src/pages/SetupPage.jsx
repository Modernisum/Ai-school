 
    }, [form.countryId])

    useEffect(() => {
        if (form.stateId) {
            setDistricts([])
            fetch(`${API_BASE}/geo/districts/${form.stateId}`).then(res => res.json()).then(setDistricts).catch(console.error)
        }
    }, [form.stateId])

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const validateStep = (s) => {
        const errs = {}
        // Validate Step 1
        if (s >= 1) {
            if (!form.schoolName || form.schoolName.trim().length < 3) errs.schoolName = 'Name too short'
            if (!form.addressLine) errs.addressLine = 'Required'
            if (!form.pincode || !/^\d{6}$/.test(form.pincode)) errs.pincode = 'Invalid PIN (6 digits)'
            if (!form.countryId) errs.countryId = 'Required'
            if (!form.stateId) errs.stateId = 'Required'
            if (!form.districtId) errs.districtId = 'Required'
            
            if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
            const phoneDigitsOnly = (form.phone || '').replace(/\D/g, '')
            if (phoneDigitsOnly.length !== 10) errs.phone = 'Should be 10 digits'
        }
        
        // Validate Step 2
        if (s >= 2) {
            if (!form.password || form.password.length < 6) errs.password = 'Min 6 characters'
        }

        // Validate Step 3
        if (s >= 3) {
            if (!form.affiliatedBoard) errs.affiliatedBoard = 'Required'
        }

        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const next = (e) => { 
        if (e) e.preventDefault();
        if (validateStep(step)) {
            setStep(s => s + 1) 
        } else {
            toast('error', 'Please fix the errors before proceeding')
        }
    }
    const back = () => setStep(s => s - 1)

    // Maps class name → 0-based array index in backend's Indian school structure:
    // 0=Pre-Nursery, 1=Nursery, 2=LKG, 3=UKG, 4=Class1 ... 15=Class12
    const classNameToLevel = (name) => {
        const indexMap = {
            'Pre-Nursery': 0,
            'Nursery': 1,
            'LKG': 2,
            'UKG': 3,
        };
        if (indexMap[name] !== undefined) return indexMap[name];
        const match = name.match(/Class (\d+)/);
        if (match) return 3 + parseInt(match[1]); // Class 1 → 4, Class 12 → 15
        return 0;
    };

    const submit = async (e) => {
        if (e) e.preventDefault()
        if (!validateStep(3)) {
            toast('error', 'Please complete all required fields')
            return
        }
        setLoading(true)
        try {
            let finalLogoUrl = form.schoolLogoUrl;

            // Upload pending logo if exists
            if (pendingLogoFile) {
                setLogoLoading(true);
                const uploadRes = await uploadFile(pendingLogoFile);
                if (uploadRes.success) {
                    finalLogoUrl = uploadRes.url;
                } else {
                    toast('error', uploadRes.message || 'Logo upload failed');
                    setLoading(false);
                    setLogoLoading(false);
                    return;
                }
                setLogoLoading(false);
            }

            const country = countries.find(c => c.id == form.countryId);
            const stateName = statesList.find(c => c.id == form.stateId)?.name || '';
            const districtName = districts.find(c => c.id == form.districtId)?.name || '';
            
            // Format phone with country code
            const formattedPhone = `${country?.phone_code || ''} ${form.phone.replace(/\D/g, '')}`.trim();

            const payload = {
                ...form,
                phone: formattedPhone,
                schoolAddress: `${form.addressLine}, ${districtName}, ${stateName}, ${country?.name || ''} - ${form.pincode}`,
                classLevelStart: classNameToLevel(form.classLevelStart),
                classLevel: classNameToLevel(form.classLevelEnd),
                defaultStudents: 30,
                schoolLogoUrl: finalLogoUrl
            }
            const res = await fetch(`${API_BASE}/setup/school`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (data.success || data.schoolId) {
                setSuccess({ ...data, password: form.password, schoolName: form.schoolName })
                setForm({
                    schoolName: '', password: '', principalName: '', addressLine: '', countryId: '', stateId: '', districtId: '', pincode: '',
                    phone: '', email: '', affiliatedBoard: '', medium: 'English',
                    classLevelStart: 'Pre-Nursery', classLevelEnd: 'Class 12', schoolType: 'Co-Ed',
                    schoolLogoUrl: ''
                })
                setLocalLogoPreview('')
                setPendingLogoFile(null)
                setStep(1)
            } else {
                toast('error', data.message || 'Setup failed')
            }
        } catch (err) {
            console.error('Setup error:', err);
            toast('error', `Connection failed: ${err.message}`)
        }
        setLoading(false)
    }

    const classes = ['Pre-Nursery', 'Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)]

    const countryCode = countries.find(c => c.id == form.countryId)?.phone_code || ''

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Plus size={22} style={{ color: 'var(--color-primary)' }} />
                <h1 className="page-title">Add New School</h1>
            </div>
            <p className="page-sub">Step {step} of 3 • {step === 1 ? 'School Details & Address' : step === 2 ? 'Security & Admin' : 'Academic Setup'}</p>

            {/* Stepper Header */}
            <div className="stepper-box">
                {[
                    { n: 1, icon: <School size={14} />, label: 'Details' },
                    { n: 2, icon: <Shield size={14} />, label: 'Security' },
                    { n: 3, icon: <BookOpen size={14} />, label: 'Academic' }
                ].map((s, i) => (
                    <div key={s.n} className={`step-item ${step >= s.n ? 'active' : ''}`}>
                        <div className="step-num">{s.icon}</div>
                        <span>{s.label}</span>
                        {i < 2 && <div className="step-line" />}
                    </div>
                ))}
            </div>

            <form 
                onSubmit={submit} 
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        if (step < 3) {
                            e.preventDefault();
                            next();
                        }
                    }
                }}
                className="setup-form"
            >
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="st1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                            <h3 className="section-title"><School size={16} /> Basic Details & Address</h3>
                            <div className="field-grid">
                                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                                    <label>School Logo</label>
                                    <div className="logo-upload-wrap">
                                        {(localLogoPreview || form.schoolLogoUrl) ? (
                                            <div className="logo-preview">
                                                <img src={localLogoPreview || form.schoolLogoUrl} alt="Logo" />
                                                <button type="button" className="remove-logo" onClick={() => {
                                                    // Only delete from server if it was already a server URL
                                                    if (form.schoolLogoUrl && !localLogoPreview) {
                                                        deleteFileByUrl(form.schoolLogoUrl);
                                                    }
                                                    set('schoolLogoUrl', '');
                                                    setLocalLogoPreview('');
                                                    setPendingLogoFile(null);
                                                }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className={`logo-placeholder ${logoLoading ? 'loading' : ''}`}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        
                                                        // Immediate local preview only
                                                        const localUrl = URL.createObjectURL(file);
                                                        setLocalLogoPreview(localUrl);
                                                        setPendingLogoFile(file);
                                                        
                                                        // We no longer upload immediately here
                                                    }}
                                                    hidden
                                                    disabled={logoLoading}
                                                />
                                                {logoLoading ? (
                                                    <Loader size={20} className="spin" style={{ color: 'var(--color-primary)' }} />
                                                ) : (
                                                    <>
                                                        <Upload size={20} />
                                                        <span>Upload Logo</span>
                                                    </>
                                                )}
                                                {logoLoading && <div className="logo-loading-bar" />}
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <Field form={form} set={set} label="School Name" field="schoolName" required placeholder="e.g. Modern High School" error={errors.schoolName} />
                                <Field form={form} set={set} label="Address Line" field="addressLine" required placeholder="Street, Locality" error={errors.addressLine} />
                                <div className="input-group">
                                    <label>Country *</label>
                                    <select value={form.countryId} onChange={e => set('countryId', e.target.value)} className={errors.countryId ? 'input-error' : ''}>
                                        <option value="">Select country…</option>
                                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>State *</label>
                                    <select value={form.stateId} onChange={e => set('stateId', e.target.value)} disabled={!form.countryId} className={errors.stateId ? 'input-error' : ''}>
                                        <option value="">Select state…</option>
                                        {statesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>District *</label>
                                    <select value={form.districtId} onChange={e => set('districtId', e.target.value)} disabled={!form.stateId} className={errors.districtId ? 'input-error' : ''}>
                                        <option value="">Select district…</option>
                                        {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <Field form={form} set={set} label="Pincode" field="pincode" required placeholder="PIN Code" error={errors.pincode} />
                                <Field form={form} set={set} label="Email Address" field="email" type="email" placeholder="school@example.com" error={errors.email} />
                                <div className="input-group">
                                    <label>Contact Number *</label>
                                    <div className="phone-input-wrap">
                                        <span className="country-code">{countryCode || '+'}</span>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={e => set('phone', e.target.value.replace(/\D/g, '').substring(0, 10))}
                                            placeholder="10 digit number"
                                            required
                                            className={errors.phone ? 'input-error' : ''}
                                        />
                                    </div>
                                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="st2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                            <h3 className="section-title"><Shield size={16} /> Security & Admin</h3>
                            <div className="field-grid">
                                <Field form={form} set={set} label="Principal Name" field="principalName" placeholder="Full name" />
                                <Field form={form} set={set} label="Admin Password" field="password" type="password" required placeholder="Min 6 chars" error={errors.password} />
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="st3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                            <h3 className="section-title"><BookOpen size={16} /> Academic Configuration</h3>
                            <div className="field-grid">
                                <div className="input-group">
                                    <label>Affiliated Board</label>
                                    <select value={form.affiliatedBoard} onChange={e => set('affiliatedBoard', e.target.value)}>
                                        <option value="">Select board…</option>
                                        {['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'].map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Medium of Instruction</label>
                                    <select value={form.medium} onChange={e => set('medium', e.target.value)}>
                                        {['English', 'Hindi', 'Spanish', 'French', 'Standard Arabic', 'Bengali', 'Russian', 'Portuguese', 'Urdu', 'Indonesian', 'German', 'Japanese', 'Marathi', 'Telugu', 'Turkish', 'Tamil'].map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>School Type</label>
                                    <select value={form.schoolType} onChange={e => set('schoolType', e.target.value)}>
                                        {['Co-Ed', 'Boys', 'Girls'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Class Range</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <select value={form.classLevelStart} onChange={e => set('classLevelStart', e.target.value)} style={{ flex: 1 }}>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                                        <select value={form.classLevelEnd} onChange={e => set('classLevelEnd', e.target.value)} style={{ flex: 1 }}>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="setup-footer">
                    {step > 1 ? (
                        <button type="button" className="btn btn-ghost" onClick={back} disabled={loading}>
                            <ChevronLeft size={16} /> Previous
                        </button>
                    ) : <div />}
                    
                    {step < 3 ? (
                        <button type="button" className="btn btn-primary" onClick={next} style={{ minWidth: 120 }}>
                            Next Step <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 160, justifyContent: 'center' }}>
                            {loading ? <Loader size={15} className="spin" /> : <Plus size={15} />}
                            {loading ? 'Finalizing…' : 'Create School'}
                        </button>
                    )}
                </div>
            </form>

            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-bg">
                        <motion.div initial={{ y: 30, scale: 0.95 }} animate={{ y: 0, scale: 1 }} className="modal" style={{ maxWidth: 450 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                                    <h3 style={{ margin: 0, color: 'var(--color-success)', fontSize: 18 }}>School Created</h3>
                                </div>
                                <X size={18} style={{ cursor: 'pointer' }} onClick={() => setSuccess(null)} />
                            </div>
                            <div className="success-box">
                                <div className="row"><span>School ID</span> <strong>{success.schoolId}</strong></div>
                                <div className="row"><span>Password</span> <strong>{success.password}</strong></div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={() => {
                                const text = `School ID: ${success.schoolId}\nPassword: ${success.password}`;
                                navigator.clipboard.writeText(text);
                                toast('success', 'Credentials copied!');
                            }}>
                                <Copy size={16} /> Copy Credentials
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .stepper-box { display: flex; justify-content: space-between; margin: 24px 0 32px; padding: 0 40px; position: relative; }
                .step-item { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 1; color: var(--text-tertiary); }
                .step-item.active { color: var(--color-primary); }
                .step-num { width: 32px; height: 32px; border-radius: 50%; background: var(--bg3); display: flex; align-items: center; justifyContent: center; border: 2px solid transparent; transition: 0.3s; }
                .active .step-num { background: var(--color-primary); color: white; border-color: rgba(255,255,255,0.2); box-shadow: 0 0 15px rgba(99,102,241,0.3); }
                .step-item span { font-size: 12px; font-weight: 600; }
                .step-line { position: absolute; top: 16px; left: 100%; width: calc(200% - 32px); height: 2px; background: var(--bg3); z-index: -1; }
                .active .step-line { background: var(--color-primary); opacity: 0.3; }
                .section-title { display: flex; alignItems: center; gap: 10; margin: 0 0 20px; font-size: 14px; color: var(--color-primary); }
                .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .setup-footer { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--bg3); }
                .phone-input-wrap { display: flex; border: 1px solid var(--bg3); border-radius: 8px; overflow: hidden; background: var(--surface-layer2); }
                .country-code { background: var(--bg3); padding: 0 12px; display: flex; align-items: center; font-size: 13px; color: var(--text-secondary); font-weight: 600; border-right: 1px solid var(--bg3); }
                .phone-input-wrap input { border: none !important; }
                .input-error { border-color: var(--color-danger) !important; }
                .error-text { font-size: 11px; color: var(--color-danger); margin-top: 4px; }
                .success-box { background: color-mix(in srgb, black 20%, transparent); padding: 16px; border-radius: 12px; }
                .success-box .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                .logo-upload-wrap { margin-top: 8px; }
                .logo-preview { position: relative; width: 80px; height: 80px; border-radius: 12px; overflow: hidden; border: 2px solid var(--bg3); }
                .logo-preview img { width: 100%; height: 100%; object-fit: cover; }
                .remove-logo { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); }
                .logo-placeholder { width: 80px; height: 80px; border-radius: 12px; border: 2px dashed var(--bg3); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; transition: 0.3s; color: var(--text-tertiary); }
                .logo-placeholder:hover { border-color: var(--color-primary); color: var(--color-primary); background: rgba(99,102,241,0.05); }
                .logo-placeholder span { font-size: 10px; font-weight: 600; }
                .logo-placeholder.loading { cursor: default; border-style: solid; border-color: var(--bg3); }
                .logo-loading-bar { position: absolute; bottom: 0; left: 0; height: 3px; background: var(--color-primary); animation: loading-shimmer 2s infinite linear; border-radius: 0 0 12px 12px; }
                @keyframes loading-shimmer { 0% { width: 0%; opacity: 0.5; } 50% { width: 100%; opacity: 1; } 100% { width: 100%; opacity: 0; } }
            `}</style>
        </motion.div>
    )
}
