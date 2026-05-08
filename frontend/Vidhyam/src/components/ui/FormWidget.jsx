import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Controller } from 'react-hook-form';
import DropdownWidget from './DropdownWidget';
import GlassCard from './GlassCard';
import StandardButton from './StandardButton';
import SwitchButton from './SwitchButton';
import { CheckCircle, MoreHorizontal } from 'lucide-react';

/**
 * Common Form Widget for all input forms in Vidhyam
 * Now upgraded to be completely schema-driven.
 */

// ─── Input Styling Helper ──────────────────────────────────────────────────────
export const inp = (error = false, className = '', dense = false) => {
  return `w-full bg-white/5 border ${error ? 'border-accent/60' : 'border-white/10'} ${dense ? 'rounded-lg px-2 py-1 text-micro' : 'rounded-xl px-4 py-2 text-xs'} text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 focus:bg-white/[0.08] transition-all duration-300 ${className}`;
};

// ─── Field Layout Component ───────────────────────────────────────────────────
export const Field = ({ label, children, error, required = false, className = '', helperText, labelIcon: LabelIcon, dense = false }) => {
  return (
    <div className={`${dense ? 'space-y-0.5' : 'space-y-1.5'} ${className}`}>
      {label && (
        <label className={`flex items-center gap-1.5 ${dense ? 'text-micro' : 'text-[9px]'} font-bold text-slate-500 uppercase tracking-widest ml-0.5`}>
          {LabelIcon && <LabelIcon size={dense ? 8 : 10} className="text-primary" />}
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      {children}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[10px] font-semibold text-red-400 mt-1 ml-1"
          >
            {error}
          </motion.p>
        ) : helperText ? (
          <p className="text-[10px] text-slate-500 mt-1 ml-1 leading-relaxed">{helperText}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

// ─── Form Section Component ────────────────────────────────────────────────────
export const FormSection = ({ title, description, icon: Icon, children, columns = 2, className = '', dense = false, hideHeader = false }) => {
  const getGridClass = () => {
    const gap = dense ? 'gap-2' : 'gap-6';
    if (columns === 1) return `grid grid-cols-1 ${gap}`;
    if (columns === 2) return `grid grid-cols-1 md:grid-cols-2 ${gap}`;
    if (columns === 3) return `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${gap}`;
    if (columns === 4) return `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${gap}`;
    return `grid grid-cols-1 md:grid-cols-2 ${gap}`;
  };

  return (
    <div className={`${dense ? 'space-y-2' : 'space-y-6'} ${className}`}>
      {!hideHeader && (title || Icon) && (
        <div className={`flex items-center gap-3 ${dense ? 'mb-2' : 'mb-8'}`}>
          {Icon && (
            <div className={`${dense ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-2xl'} bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5`}>
              <Icon size={dense ? 14 : 22} className="text-primary" />
            </div>
          )}
          <div>
            <h3 className={`${dense ? 'text-xs' : 'text-lg'} font-black text-white tracking-tight italic uppercase`}>{title}</h3>
            {description && <p className={`${dense ? 'text-micro' : 'text-xs'} text-slate-500 mt-0.5`}>{description}</p>}
          </div>
        </div>
      )}

      <div className={getGridClass()}>{children}</div>
    </div>
  );
};

// ─── Field Components ─────────────────────────────────────────────────────────

export const TextInput = ({ name, control, rules, label, placeholder, disabled, type = 'text', icon: Icon, className, helperText, dense = false, onChange: onValueChange }) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field, fieldState: { error } }) => (
      <Field label={label} error={error?.message} required={!!rules?.required} className={className} helperText={helperText} dense={dense}>
        <div className="relative">
          {Icon && <Icon size={dense ? 14 : 18} className={`absolute ${dense ? 'left-2.5' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-600`} />}
          <input
            {...field}
            type={type}
            className={inp(!!error, `${Icon ? (dense ? 'pl-9' : 'pl-11') : ''}`, dense)}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => {
              field.onChange(e);
              onValueChange?.(e.target.value);
            }}
          />
        </div>
      </Field>
    )}
  />
);

export const SelectInput = ({ name, control, rules, label, options = [], placeholder = 'Select...', disabled, icon: Icon, className, helperText, searchable = true, onChange: onValueChange }) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field, fieldState: { error } }) => (
      <DropdownWidget
        label={label}
        options={options}
        value={field.value}
        onChange={(val) => {
          field.onChange(val);
          onValueChange?.(val);
        }}
        placeholder={placeholder}
        disabled={disabled}
        error={error?.message}
        icon={Icon}
        className={className}
        searchable={searchable}
      />
    )}
  />
);

export const TextAreaInput = ({ name, control, rules, label, placeholder, rows = 3, disabled, className, helperText }) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field, fieldState: { error } }) => (
      <Field label={label} error={error?.message} required={!!rules?.required} className={className} helperText={helperText}>
        <textarea
          {...field}
          className={inp(!!error, 'resize-none min-h-[100px]')}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
        />
      </Field>
    )}
  />
);

export const CheckboxInput = ({ name, control, rules, label, disabled, className, onChange: onValueChange }) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field, fieldState: { error } }) => (
      <div className={`flex flex-col gap-1 ${className}`}>
        <label className="flex items-center gap-3 group cursor-pointer p-1">
          <div className="relative flex items-center justify-center text-xs">
            <input 
              type="checkbox" 
              checked={field.value} 
              onChange={(e) => {
                const val = e.target.checked;
                field.onChange(val);
                onValueChange?.(val);
              }} 
              className="peer sr-only" 
              disabled={disabled} 
            />
            <div className="w-4 h-4 border-2 border-white/10 rounded bg-white/5 transition-all peer-checked:bg-primary peer-checked:border-primary group-hover:border-primary/50" />
            <svg className="absolute w-3 h-3 text-white scale-0 transition-transform peer-checked:scale-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">{label}</span>
        </label>
        {error && <p className="text-[10px] text-red-400 font-semibold">{error.message}</p>}
      </div>
    )}
  />
);

export const CheckboxGroup = ({ name, control, rules, label, options = [], disabled, className }) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field, fieldState: { error } }) => (
      <Field label={label} error={error?.message} required={!!rules?.required} className={`${className} md:col-span-2`}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl max-h-[200px] overflow-y-auto custom-scrollbar">
          {options.map((opt) => {
            const isChecked = (field.value || []).includes(opt.value);
            return (
              <label key={opt.value} className="flex items-center gap-3 group cursor-pointer p-1">
                <div className="relative flex items-center justify-center text-xs flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    className="peer sr-only"
                    disabled={disabled}
                    onChange={() => {
                      const newVal = isChecked
                        ? (field.value || []).filter(v => v !== opt.value)
                        : [...(field.value || []), opt.value];
                      field.onChange(newVal);
                    }}
                  />
                  <div className="w-4 h-4 border-2 border-white/10 rounded bg-white/5 transition-all peer-checked:bg-primary peer-checked:border-primary group-hover:border-primary/50" />
                  <svg className="absolute w-3 h-3 text-white scale-0 transition-transform peer-checked:scale-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors truncate">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </Field>
    )}
  />
);

export const FileUpload = ({ name, control, rules, label, multiple, accept = "*", disabled, className, helperText }) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field: { value, onChange }, fieldState: { error } }) => (
      <Field label={label} error={error?.message} required={!!rules?.required} className={className} helperText={helperText}>
        <div className="relative group/file">
          <input
            type="file"
            multiple={multiple}
            accept={accept}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            onChange={(e) => onChange(multiple ? Array.from(e.target.files) : e.target.files[0])}
          />
          <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all duration-300 ${error ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5 group-hover/file:border-primary/30 group-hover/file:bg-primary/5'}`}>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-slate-400 group-hover/file:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <p className="text-xs font-bold text-slate-300">{value ? (multiple ? `${value.length} files selected` : value.name) : 'Upload Documents'}</p>
          </div>
        </div>
      </Field>
    )}
  />
);

// ─── SCHEMA-DRIVEN ENGINE ──────────────────────────────────────────────────

/**
 * FieldFactory renders a single field based on its configuration
 */
export const FieldFactory = ({ field, control, mode = 'add' }) => {
  const commonProps = {
    name: field.name,
    control,
    label: field.label,
    placeholder: field.placeholder,
    disabled: mode === 'view' || field.disabled,
    rules: field.rules || (field.required ? { required: `${field.label} is required` } : undefined),
    icon: field.icon,
    className: field.className,
    helperText: field.helperText,
  };

  if (field.type === 'custom') {
    return field.render ? field.render({ control, mode }) : null;
  }

  const props = { ...commonProps, onChange: field.onChange };

  switch (field.type) {
    case 'select': return <SelectInput {...props} options={field.options} searchable={field.searchable} />;
    case 'textarea': return <TextAreaInput {...props} rows={field.rows} />;
    case 'checkbox': return <CheckboxInput {...props} />;
    case 'checkbox-group': return <CheckboxGroup {...props} options={field.options} />;
    case 'file': return <FileUpload {...props} multiple={field.multiple} accept={field.accept} />;
    case 'date': return <TextInput {...props} type="date" />;
    case 'time': return <TextInput {...props} type="time" />;
    case 'range': return <TextInput {...props} type="range" />;
    case 'number': return <TextInput {...props} type="number" />;
    case 'tel': return <TextInput {...props} type="tel" />;
    case 'email': return <TextInput {...props} type="email" />;
    case 'password': return <TextInput {...props} type="password" />;
    default: return <TextInput {...props} />;
  }
};

/**
 * CollectionRenderer renders a list of records in a table format (matching the reference image)
 */
export const CollectionRenderer = ({ section, control, mode, isActive, dense = false }) => {
  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`${dense ? 'text-xs' : 'text-lg'} font-black text-white italic uppercase`}>{section.title || section.label}</h3>
          <p className="text-micro text-slate-500 uppercase tracking-widest">{section.description}</p>
        </div>
        <StandardButton variant="primary" size="xs" label="ADD_RECORD" />
      </div>

      <div className="overflow-x-auto border border-white/5 rounded-2xl bg-white/[0.02]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              {section.fields?.map(f => (
                <th key={f.name} className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">{f.label}</th>
              ))}
              <th className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-white/[0.01]">
               {section.fields?.map(f => (
                 <td key={f.name} className="px-4 py-2">
                   <input 
                     placeholder={f.placeholder} 
                     className="w-full bg-transparent border-none text-xs text-white placeholder:text-slate-800 focus:outline-none"
                   />
                 </td>
               ))}
               <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button className="p-1.5 text-slate-600 hover:text-white transition-colors"><MoreHorizontal size={14} /></button>
                  </div>
               </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * SectionRenderer renders a group of fields within a FormSection
 */
export const SectionRenderer = ({ section, control, mode, isActive, columns, dense = false, hideHeader = false }) => {
  if (!isActive) return null;
  
  if (section.type === 'table') {
    return <CollectionRenderer section={section} control={control} mode={mode} isActive={isActive} dense={dense} />;
  }

  return (
    <FormSection
      title={section.title || section.label || ''}
      description={section.description}
      icon={section.icon}
      columns={columns}
      dense={dense}
      hideHeader={hideHeader}
    >
      {section.fields?.map((field, idx) => (
        <FieldFactory key={field.name || idx} field={field} control={control} mode={mode} dense={dense} />
      ))}
      {section.customContent && <div className={dense ? "md:col-span-2 mt-1" : "md:col-span-2"}>{section.customContent}</div>}
    </FormSection>
  );
};

// ─── Main Form Widget Component (The Single Widget) ──────────────────────────

const FormWidget = ({
  title,
  description,
  sections = [],
  activeSection: externalActiveSection,
  onSectionChange: externalOnSectionChange,
  control,
  onSubmit,
  onCancel,
  submitLabel = 'Save Record',
  cancelLabel = 'Discard',
  isLoading = false,
  mode = 'add',
  showNavigation = true,
  showActions = true,
  className = '',
  // ── Layout Control Props ────────────────────────────────────────────────
  layout = 'default',    // 'default' (tabs) or 'sidebar' (modern stepper)
  size = 'large',        // 'large' (workspace) or 'small' (compact)
  noCard = false,        // true → skip GlassCard wrapper
  columns: gridColumns = 2, // Default to 2 columns
  singleColumn = false,  // true → render all fields in a single column
  hideCancel = false,    // true → hide Cancel button
  dense = false,         // true → high density IDE style
  // Children allowed for backward compatibility
  children,
}) => {
  const [internalActiveSection, setInternalActiveSection] = React.useState(sections[0]?.id);
  const activeSection = externalActiveSection !== undefined ? externalActiveSection : internalActiveSection;
  const onSectionChange = externalOnSectionChange || setInternalActiveSection;

  const currentSectionIdx = sections.findIndex(s => s.id === activeSection);
  const currentSectionObj = sections[currentSectionIdx] || sections[0];
  const columns = (size === 'small' || singleColumn) ? 1 : gridColumns;
  const showCancel = !hideCancel && !!onCancel;

  const handleNext = () => {
    if (currentSectionIdx < sections.length - 1) {
      onSectionChange(sections[currentSectionIdx + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentSectionIdx > 0) {
      onSectionChange(sections[currentSectionIdx - 1].id);
    }
  };

  const formContent = (
    <div key={activeSection} className={dense ? "space-y-2" : "space-y-5"}>
      <form onSubmit={onSubmit} className="contents">
        {sections.length > 0 ? (
          <SectionRenderer
            section={currentSectionObj}
            control={control}
            mode={mode}
            isActive={true}
            columns={columns}
            dense={dense}
            hideHeader={layout === 'sidebar'}
          />
        ) : (
          children
        )}

        {/* Bottom Actions Bar (only for default layout or if explicitly needed) */}
        {layout === 'default' && showActions && mode !== 'view' && (
          <div
            className={`${dense ? 'pt-2' : 'pt-5'} border-t border-white/5 flex items-center gap-2 ${
              showCancel ? '' : 'justify-stretch'
            }`}
          >
            {showCancel && (
              <StandardButton variant="secondary" onClick={onCancel} size={dense ? "xs" : "md"}>
                {cancelLabel}
              </StandardButton>
            )}
            <StandardButton
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className={showCancel ? '' : 'w-full'}
              size={dense ? "xs" : "md"}
            >
              {submitLabel}
            </StandardButton>
          </div>
        )}
      </form>
    </div>
  );

  // ─── COMPACT / SMALL FORM RENDER ─────────────────────────────────────────────
  if (size === 'small') {
     return (
       <div className={`w-full max-w-2xl mx-auto py-10 px-4 ${className}`}>
         <div className="glass-card overflow-hidden border border-white/10 shadow-2xl animate-fade-in">
            <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
               <h2 className="text-xl font-black text-white italic uppercase tracking-tight">{title}</h2>
               {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
            </div>

            {/* Section Switcher for Multi-Section Small Forms */}
            {sections.length > 1 && (
              <div className="px-8 py-4 border-b border-white/5 bg-white/[0.01]">
                <SwitchButton
                    tabs={sections}
                    activeTab={activeSection}
                    onChange={onSectionChange}
                />
              </div>
            )}
            
            <div className="p-8">
               {formContent}
            </div>

            {showActions && mode !== 'view' && (
               <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-end gap-3">
                  {showCancel && (
                    <button onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
                      {cancelLabel}
                    </button>
                  )}
                  <StandardButton
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    onClick={onSubmit}
                  >
                    {submitLabel}
                  </StandardButton>
               </div>
            )}
         </div>
       </div>
     );
  }


  if (noCard) return <div className={className}>{formContent}</div>;

  // ─── SIDEBAR LAYOUT (MODERN STEPPER / BOXED) ──────────────────────────────────
  if (layout === 'sidebar') {
    return (
      <div className={`flex flex-col lg:flex-row min-h-screen bg-[#0a0c10] ${className}`}>
        {/* Left Sidebar Navigation */}
        <div className="w-full lg:w-52 shrink-0 bg-[#0d0f17] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col relative z-20">
          <div className="flex flex-row lg:flex-col lg:h-full lg:divide-y divide-white/5">
            {sections.map((section, idx) => {
              const isActive = section.id === activeSection;
              const isCompleted = sections.findIndex(s => s.id === activeSection) > idx;
              
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={`flex-1 lg:flex-none flex items-center lg:items-start gap-4 p-4 lg:p-6 transition-all duration-300 group relative border-r lg:border-r-0 border-white/5 last:border-r-0 ${
                    isActive ? 'bg-primary/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Vertical Center Line logic (desktop) */}
                  {idx < sections.length - 1 && (
                     <div className="hidden lg:block absolute left-9 top-14 bottom-0 w-[1px] bg-white/5 z-0" />
                  )}

                  <div className="relative z-10 flex flex-col items-center gap-1">
                    {/* Checkbox Style Indicator */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-500 ${
                      isActive 
                        ? 'border-primary bg-primary/20 bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' 
                        : isCompleted 
                          ? 'border-emerald-500 bg-emerald-500' 
                          : 'border-slate-800 bg-transparent group-hover:border-slate-600'
                    }`}>
                      {isCompleted && <CheckCircle size={12} className="text-white" />}
                      {isActive && <div className="w-1.5 h-1.5 bg-white rounded-sm animate-pulse" />}
                    </div>
                  </div>

                  <div className="text-left py-0.5 relative z-10 hidden sm:block">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {section.label || section.title}
                    </p>
  
                  </div>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex p-6 border-t border-white/5 mt-auto">
             <div className="flex items-center gap-2 opacity-20">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Module_Integrated_v5.2</span>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-transparent relative h-screen overflow-hidden">
          {/* Form Fields Area (Scrollable) */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto">
               {/* Form Content Bordered Wrapper */}

               <div className="p-8 rounded-[2.5rem] border border-white/10 bg-white/[0.01] shadow-2xl relative overflow-hidden group/form">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/form:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10">
                    {formContent}
                  </div>
               </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between z-20 backdrop-blur-xl">
            <div className="flex items-center gap-4">
               <div className="text-[8px] font-bold text-slate-700 uppercase tracking-widest leading-none">Workflow Control Node</div>
               <div className="h-4 w-[1px] bg-white/5" />
               <div className="flex gap-4">
                  <button onClick={handlePrev} disabled={currentSectionIdx === 0} className="text-[8px] font-black text-slate-600 hover:text-white uppercase disabled:opacity-10 transition-all">← Back</button>
                  <button onClick={handleNext} disabled={currentSectionIdx === sections.length - 1} className="text-[8px] font-black text-primary hover:text-white uppercase disabled:opacity-10 transition-all">Next →</button>
               </div>
            </div>

            <div className="flex items-center gap-2">
              {showCancel && (
                <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
                  {cancelLabel}
                </button>
              )}
              <div className="flex items-center p-1 bg-white/[0.03] border border-white/10 rounded-xl gap-1">
                <button 
                  type="submit" 
                  onClick={onSubmit} 
                  className="px-6 py-2.5 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
                  {submitLabel}
                </button>
              </div>
            </div>
          </div>

          {/* Minimal Footer */}
          <div className="px-8 py-2 border-t border-white/5 bg-black/20 flex justify-between items-center text-[7px] font-bold text-slate-800 uppercase tracking-[0.4em]">
             <div>Global Workspace v5.2</div>
             <div>Secure Registration Protocol Enabled</div>
          </div>
        </div>
      </div>
    );

  }

  // ─── DEFAULT LAYOUT (TABS) ────────────────────────────────────────────────────
  return (
    <div className={`w-full ${className}`}>
      <GlassCard className={dense ? "p-3" : "p-8 md:p-10"} dense={dense}>
        {/* Container Header */}
        {(title || description) && (
          <div className={`${dense ? 'mb-4' : 'mb-10'} flex flex-col md:flex-row md:items-end justify-between gap-2`}>
            <div>
              <h2 className={`${dense ? 'text-sm font-black italic uppercase' : 'text-xl font-black'} text-white tracking-tight mb-0.5`}>{title}</h2>
              {description && <p className={`text-slate-500 ${dense ? 'text-micro' : 'text-xs'} max-w-2xl`}>{description}</p>}
            </div>
          </div>
        )}

        {/* Navigation */}
        {showNavigation && sections.length > 1 && (
          <div className="mb-10">
            <SwitchButton
              tabs={sections}
              activeTab={activeSection}
              onChange={onSectionChange}
            />
          </div>
        )}

        {/* Dynamic Content Area */}
        <div className="min-h-[300px]">
          {formContent}
        </div>
      </GlassCard>
    </div>
  );
};

export default FormWidget;