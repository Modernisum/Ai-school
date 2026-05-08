import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { selectPollingInterval } from '../../settings/settingsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2,
  Trash2,
  ChevronRight,
  Printer,
  BookOpen,
  Layout,
  Clock,
  Activity,
  Award,
  Zap,
  Book,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';

import { academicApi } from '../api/academicApi';
import GlassCard from '../../../components/ui/GlassCard';
import FormWidget from '../../../components/ui/FormWidget';
import PageHeader from '../../../components/ui/PageHeader';
import KPIWidget from '../../../components/ui/KPIWidget';
import KPITile from '../../../components/ui/KPITile';
import StandardButton from '../../../components/ui/StandardButton';

const {
  useGetClassIdsQuery,
  useLazyGetSubjectIdsQuery,
  useLazyGetChapterNamesQuery,
  useGeneratePaperMutation,
  useApproveExamMutation
} = academicApi;

const ExamManager = () => {
  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      className: '',
      subject: '',
      examType: 'Mid-Term',
      examDuration: 180,
      totalQuestions: 20,
      shortCount: 5,
      shortMarks: 2,
      longCount: 3,
      longMarks: 5,
      mcqCount: 12,
      mcqMarks: 1,
      chapters: [],
      examDate: new Date().toISOString().split('T')[0],
      examTime: '09:00'
    }
  });

  const formValues = watch();

  const getSchoolId = () => localStorage.getItem('schoolId') || "";
  const getSchoolName = () => localStorage.getItem('schoolName') || 'Vidhyam';
  const getBoard = () => localStorage.getItem('boardName') || 'CBSE';
  const getMedium = () => localStorage.getItem('medium') || 'English';

  const [chapters, setChapters] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState([]);

  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState({ short: [], long: [], mcq: [] });
  const [marksPerQuestion, setMarksPerQuestion] = useState({ short: 2, long: 5, mcq: 1 });
  const [pdfFontSize, setPdfFontSize] = useState(12);

  const schoolId = getSchoolId();
  const pollingInterval = useSelector(selectPollingInterval);
  const { data: classes = [] } = useGetClassIdsQuery(schoolId, { pollingInterval });
  const [fetchSubjects, { data: subjects = [] }] = useLazyGetSubjectIdsQuery();
  const [fetchChapterNames] = useLazyGetChapterNamesQuery();
  const [generatePaperMut, { isLoading: generateLoading }] = useGeneratePaperMutation();
  const [approveExamMut, { isLoading: loading }] = useApproveExamMutation();

  const loadSubjects = async (className) => {
    if (!className) return;
    try {
      await fetchSubjects({ schoolId, className }).unwrap();
      setChapters([]);
      setSelectedChapters([]);
    } catch (error) { console.error(error); }
  };

  const loadChapters = async (className, subject) => {
    if (!className || !subject) {
      setChapters([]);
      setSelectedChapters([]);
      return;
    }
    try {
      const data = await fetchChapterNames({ schoolId, className, subject }).unwrap();
      setChapters(data);
      setSelectedChapters([]);
    } catch (error) {
      console.error(error);
      setChapters([]);
    }
  };

  const generatePaper = async (values) => {
    if (selectedChapters.length === 0) {
      toast.warning('Sequence interrupted: Select targeting chapters');
      return;
    }

    try {
      const config = {
        schoolId,
        board: getBoard(),
        language: getMedium(),
        className: values.className,
        subject: values.subject,
        chapters: selectedChapters,
        difficulty: 'Medium',
        counts: {
           short: values.shortCount,
           long: values.longCount,
           mcq: values.mcqCount
        }
      };

      const response = await generatePaperMut(config).unwrap();

      if (response.success) {
        const paper = response.data;
        setGeneratedPaper(paper);
        setSelectedQuestions({
          short: paper.questions.short.map((_, index) => index),
          long: paper.questions.long.map((_, index) => index),
          mcq: paper.questions.mcq.map((_, index) => index)
        });
        toast.success('AI Core: Assessment paper synthesized');
      }
    } catch (error) {
      setGeneratedPaper(generateFallbackPaper(values));
      toast.info('AI offline: Fallback template deployed');
    }
  };

  const generateFallbackPaper = (values) => {
    const qStruct = { short: values.shortCount, long: values.longCount, mcq: values.mcqCount };
    const sampleQuestions = {
      short: Array.from({ length: qStruct.short || 5 }, (_, i) => ({
        id: `S${i + 1}`,
        chapter: selectedChapters[0] || 'General',
        text: `Short answer question ${i + 1} about ${values.subject}. Explain the key concepts and their applications.`,
        answer: `Sample answer for short question ${i + 1}.`
      })),
      long: Array.from({ length: qStruct.long || 3 }, (_, i) => ({
        id: `L${i + 1}`,
        chapter: selectedChapters[0] || 'General',
        text: `Long answer question ${i + 1} about ${values.subject}. Discuss in detail the concepts, theories, and practical applications.`,
        answer: `Sample detailed answer for long question ${i + 1}.`
      })),
      mcq: Array.from({ length: qStruct.mcq || 12 }, (_, i) => ({
        id: `M${i + 1}`,
        chapter: selectedChapters[0] || 'General',
        text: `Multiple choice question ${i + 1} about ${values.subject}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        explanation: `Explanation for MCQ ${i + 1}.`
      }))
    };

    return {
      meta: { board: getBoard(), language: getMedium(), className: values.className, subject: values.subject, chapters: selectedChapters, generatedAt: new Date().toISOString() },
      questions: sampleQuestions
    };
  };

  const calculateTotalMarks = () => {
    const shortMarks = selectedQuestions.short.length * (formValues.shortMarks || 2);
    const longMarks = selectedQuestions.long.length * (formValues.longMarks || 5);
    const mcqMarks = selectedQuestions.mcq.length * (formValues.mcqMarks || 1);
    return shortMarks + longMarks + mcqMarks;
  };

  const handleQuestionToggle = (type, index) => {
    setSelectedQuestions(prev => ({
      ...prev,
      [type]: prev[type].includes(index) ? prev[type].filter(i => i !== index) : [...prev[type], index]
    }));
  };

  const approveExam = async () => {
    try {
      const examData = {
        schoolId, classroom: formValues.className,
        examName: `${formValues.subject} ${formValues.examType} Exam`,
        examType: formValues.examType,
        subjectName: formValues.subject,
        chapters: selectedChapters,
        examDate: new Date(formValues.examDate).toISOString(),
        examTime: formValues.examTime,
        examDuration: formValues.examDuration,
        announcementDate: new Date().toISOString(),
        reason: formValues.reason || `${formValues.examType} evaluation`,
        conductTeacher: formValues.conductTeacher || 'Staff Teacher',
        className: formValues.className
      };

      await approveExamMut(examData).unwrap();
      toast.success('Exam ledger finalized');
      exportToPDF();
    } catch (error) { toast.error('Finalization failure'); }
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const pdfContent = generatePDFContent();
    printWindow.document.write(`<html><head><title>Exam Paper</title><style>body { font-family: sans-serif; font-size: ${pdfFontSize}px; padding: 40px; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; } .section { margin-top: 30px; font-weight: bold; border-bottom: 1px solid #ccc; }</style></head><body>${pdfContent}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const generatePDFContent = () => {
    const totalMarks = calculateTotalMarks();
    let content = `<div class="header"><h1>${getSchoolName()}</h1><h2>${formValues.subject} - ${formValues.examType}</h2><p>Class: ${formValues.className} | Duration: ${formValues.examDuration}m | Marks: ${totalMarks}</p></div>`;
    if (generatedPaper) {
      ['short', 'long', 'mcq'].forEach(type => {
        if (selectedQuestions[type].length > 0) {
          content += `<div class="section">${type.toUpperCase()} QUESTIONS</div>`;
          selectedQuestions[type].forEach((idx, i) => {
            const q = generatedPaper.questions[type][idx];
            content += `<p><b>Q${i+1}.</b> ${q.text} [${formValues[`${type}Marks`] || 1}M]</p>`;
            if (type === 'mcq') content += `<p>${q.options.map((o, j) => `(${String.fromCharCode(65+j)}) ${o}`).join(' &nbsp; ')}</p>`;
          });
        }
      });
    }
    return content;
  };

  useEffect(() => { if (formValues.className) loadSubjects(formValues.className); }, [formValues.className]);
  useEffect(() => { if (formValues.className && formValues.subject) loadChapters(formValues.className, formValues.subject); }, [formValues.className, formValues.subject]);

  return (
    <div className="max-w-full p-1 space-y-2">
       <PageHeader
        title="EXAM AI"
        accentTitle="LABORATORY"
        subtitle="Assessment Synthesis & Node Validation"
        icon={Zap}
        actions={[
          {
            label: "FINAL_ARCHIVE",
            onClick: approveExam,
            variant: "primary",
            size: "xs",
            icon: Award,
            disabled: !generatedPaper || loading
          }
        ]}
      />

      <KPIWidget columns={4}>
         <KPITile label="Assessment Load" value="Normal" sub="AI Throughput Active" icon={Zap} color="primary" />
         <KPITile label="Target Unit" value={formValues.className || 'NONE'} sub="Active Sector" icon={Layout} color="accent" />
         <KPITile label="Total Marks" value={calculateTotalMarks()} sub="Protocol Weight" icon={Award} color="success" />
         <KPITile label="Temporal Limit" value={`${formValues.examDuration}M`} sub="Duration Lock" icon={Clock} color="warning" />
      </KPIWidget>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-2 items-start text-xxs">
        <GlassCard className="p-2" glowColor="primary" dense>
          <FormWidget
            title="EXAM_ARCH"
            description="Configure assessment parameters"
            sections={[
              {
                id: 'basic', label: 'Unit Identification', icon: BookOpen,
                fields: [
                  { name: 'className', label: 'Sector Unit', type: 'select', options: classes.map(c => ({ value: c, label: c.toUpperCase() })), required: true, labelIcon: Layout },
                  { name: 'subject', label: 'Knowledge Base', type: 'select', options: subjects.map(s => ({ value: s, label: s })), required: true, labelIcon: Book },
                  { name: 'chapters', label: 'Temporal Chapters', type: 'select', multiple: true, options: chapters.map(c => ({ value: c, label: c })), value: selectedChapters, onChange: setSelectedChapters, labelIcon: Activity }
                ]
              },
              {
                id: 'config', label: 'Protocol Settings', icon: Settings,
                fields: [
                  { name: 'examType', label: 'Assessment Class', type: 'select', options: ['Mid-Term', 'Final', 'Unit Test', 'Mock'], required: true, labelIcon: Zap },
                  { name: 'examDuration', label: 'Temporal Limit (M)', type: 'number', required: true, labelIcon: Clock },
                  { name: 'examDate', label: 'Launch Vector', type: 'date', required: true, labelIcon: Calendar },
                  { name: 'examTime', label: 'Zero Hour', type: 'time', required: true, labelIcon: Clock }
                ]
              },
              {
                id: 'structure', label: 'Neural Weighting', icon: Award,
                fields: [
                  { name: 'shortCount', label: 'Short Quants', type: 'number', labelIcon: Activity },
                  { name: 'shortMarks', label: 'Short Weight', type: 'number', labelIcon: Award },
                  { name: 'longCount', label: 'Long Quants', type: 'number', labelIcon: Activity },
                  { name: 'longMarks', label: 'Long Weight', type: 'number', labelIcon: Award },
                  { name: 'mcqCount', label: 'MCQ Quants', type: 'number', labelIcon: Activity },
                  { name: 'mcqMarks', label: 'MCQ Weight', type: 'number', labelIcon: Award }
                ]
              }
            ]}
            control={control}
            onSubmit={handleSubmit(generatePaper)}
            submitLabel="SYNTHESIZE_PAPER"
            isLoading={generateLoading}
            dense
          />
        </GlassCard>

        <GlassCard className="p-2 h-fit min-h-[500px] flex flex-col" glowColor="accent" dense>
          {!generatedPaper ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-20 space-y-2">
                <Printer size={32} />
                <p className="text-micro font-black uppercase tracking-[0.4em]">AWAITING_DATA</p>
             </div>
          ) : (
            <div className="space-y-4 h-full">
               <div className="pb-2 border-b border-white/5">
                  <h3 className="text-micro font-black text-white uppercase tracking-widest italic mb-0.5">SYNTHESIS_PREVIEW</h3>
                  <p className="text-micro text-slate-700 font-bold uppercase">Manual overrides active</p>
               </div>

               <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
                  {['short', 'long', 'mcq'].map(type => (
                    generatedPaper.questions[type]?.length > 0 && (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                           <h4 className="text-micro font-black text-primary uppercase tracking-widest leading-none">{type}_PROTOCOL</h4>
                           <span className="text-micro font-black text-slate-700">{selectedQuestions[type].length} UNIT</span>
                        </div>
                        <div className="space-y-1">
                           {generatedPaper.questions[type].map((q, idx) => (
                             <div key={idx} onClick={() => handleQuestionToggle(type, idx)} className={`p-2 rounded-lg border transition-all cursor-pointer group ${selectedQuestions[type].includes(idx) ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                <div className="flex gap-2">
                                   <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${selectedQuestions[type].includes(idx) ? 'bg-primary border-primary' : 'border-slate-800'}`}>
                                      {selectedQuestions[type].includes(idx) && <CheckCircle size={8} className="text-white" />}
                                   </div>
                                   <div className="flex-1">
                                      <p className="text-micro font-bold text-slate-400 group-hover:text-white leading-tight">{q.text}</p>
                                      {type === 'mcq' && q.options && (
                                        <div className="grid grid-cols-2 gap-1 mt-2">
                                           {q.options.map((o, i) => <div key={i} className="text-micro font-black text-slate-700 truncate leading-none">( {String.fromCharCode(65+i)} ) {o}</div>)}
                                        </div>
                                      )}
                                   </div>
                                   <span className="text-micro font-black text-primary/40">{formValues[`${type}Marks`] || 1}M</span>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )
                  ))}
               </div>

               <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                  <StandardButton variant="ghost" size="xs" onClick={() => setGeneratedPaper(null)} icon={Trash2}>TERMINATE</StandardButton>
                  <StandardButton variant="primary" size="xs" onClick={exportToPDF} icon={Printer}>PRINT_LEDGER</StandardButton>
               </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default ExamManager;
