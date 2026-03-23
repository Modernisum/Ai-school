import React, { useState, useEffect } from 'react';
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
  Printer
} from 'lucide-react';
import { academicApi } from '../api/academicApi';
const {
  useGetClassIdsQuery,
  useLazyGetSubjectIdsQuery,
  useLazyGetChapterNamesQuery,
  useGeneratePaperMutation,
  useApproveExamMutation
} = academicApi;

const ExamManager = () => {
  // Get data from localStorage
  const getSchoolId = () => localStorage.getItem('schoolId') || "";
  const getSchoolName = () => localStorage.getItem('schoolName') || 'Vidhyam';
  const getBoard = () => localStorage.getItem('boardName') || 'CBSE';
  const getMedium = () => localStorage.getItem('medium') || 'English';

  // State Management
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dynamic Data States
  const [chapters, setChapters] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState([]);

  // Form States
  const [formData, setFormData] = useState({
    className: '',
    subject: '',
    examType: 'Mid-Term',
    examDuration: 180,
    totalQuestions: 20,
    questionStructure: {
      short: 5,
      long: 3,
      mcq: 12
    },
    examDate: '',
    examTime: '09:00',
    announcementDate: '',
    conductTeacher: '',
    reason: ''
  });

  // Generated Paper State
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState({
    short: [],
    long: [],
    mcq: []
  });
  const [marksPerQuestion, setMarksPerQuestion] = useState({
    short: 2,
    long: 5,
    mcq: 1
  });
  const [pdfFontSize, setPdfFontSize] = useState(12);

  // Current school ID
  const schoolId = getSchoolId();

  // RTK Query hooks
  const pollingInterval = useSelector(selectPollingInterval);
  const { data: classes = [] } = useGetClassIdsQuery(schoolId, { pollingInterval });
  const [fetchSubjects, { data: subjects = [] }] = useLazyGetSubjectIdsQuery();
  const [fetchChapterNames] = useLazyGetChapterNamesQuery();
  const [generatePaperMut, { isLoading: generateLoading }] = useGeneratePaperMutation();
  const [approveExamMut, { isLoading: loading }] = useApproveExamMutation();

  // Utility Functions
  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  };

  const loadSubjects = async (className) => {
    if (!className) return;
    try {
      await fetchSubjects({ schoolId, className }).unwrap();
      setChapters([]);
      setSelectedChapters([]);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
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
      console.error('Error fetching chapters:', error);
      setChapters([]);
      setSelectedChapters([]);
    }
  };

  // Generate Paper Function
  const generatePaper = async () => {
    if (selectedChapters.length === 0) {
      showMessage('Please select at least one chapter', 'error');
      return;
    }

    try {
      const config = {
        schoolId,
        board: getBoard(),
        language: getMedium(),
        className: formData.className,
        subject: formData.subject,
        chapters: selectedChapters,
        difficulty: 'Medium',
        counts: formData.questionStructure
      };

      const response = await generatePaperMut(config).unwrap();

      if (response.success) {
        const paper = response.data;
        setGeneratedPaper(paper);

        // Initialize selected questions with all questions
        setSelectedQuestions({
          short: paper.questions.short.map((_, index) => index),
          long: paper.questions.long.map((_, index) => index),
          mcq: paper.questions.mcq.map((_, index) => index)
        });

        showMessage('Paper generated successfully!');
      }
    } catch (error) {
      // Fallback to manual paper generation
      const fallbackPaper = generateFallbackPaper();
      setGeneratedPaper(fallbackPaper);

      setSelectedQuestions({
        short: fallbackPaper.questions.short.map((_, index) => index),
        long: fallbackPaper.questions.long.map((_, index) => index),
        mcq: fallbackPaper.questions.mcq.map((_, index) => index)
      });

      showMessage('Template paper generated (AI service unavailable)', 'warning');
    }
  };

  // Fallback paper generation
  const generateFallbackPaper = () => {
    const sampleQuestions = {
      short: Array.from({ length: formData.questionStructure.short }, (_, i) => ({
        id: `S${i + 1}`,
        chapter: selectedChapters[0] || 'General',
        text: `Short answer question ${i + 1} about ${formData.subject}. Explain the key concepts and their applications.`,
        answer: `Sample answer for short question ${i + 1}.`
      })),
      long: Array.from({ length: formData.questionStructure.long }, (_, i) => ({
        id: `L${i + 1}`,
        chapter: selectedChapters[0] || 'General',
        text: `Long answer question ${i + 1} about ${formData.subject}. Discuss in detail the concepts, theories, and practical applications.`,
        answer: `Sample detailed answer for long question ${i + 1}.`
      })),
      mcq: Array.from({ length: formData.questionStructure.mcq }, (_, i) => ({
        id: `M${i + 1}`,
        chapter: selectedChapters[0] || 'General',
        text: `Multiple choice question ${i + 1} about ${formData.subject}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        explanation: `Explanation for MCQ ${i + 1}.`
      }))
    };

    return {
      meta: {
        board: getBoard(),
        language: getMedium(),
        className: formData.className,
        subject: formData.subject,
        chapters: selectedChapters,
        generatedAt: new Date().toISOString()
      },
      questions: sampleQuestions
    };
  };

  // Calculate total marks
  const calculateTotalMarks = () => {
    const shortMarks = selectedQuestions.short.length * marksPerQuestion.short;
    const longMarks = selectedQuestions.long.length * marksPerQuestion.long;
    const mcqMarks = selectedQuestions.mcq.length * marksPerQuestion.mcq;
    return shortMarks + longMarks + mcqMarks;
  };

  // Handle question selection
  const handleQuestionToggle = (type, index) => {
    setSelectedQuestions(prev => ({
      ...prev,
      [type]: prev[type].includes(index)
        ? prev[type].filter(i => i !== index)
        : [...prev[type], index]
    }));
  };

  // Generate new paper
  const generateNewPaper = () => {
    setGeneratedPaper(null);
    setSelectedQuestions({ short: [], long: [], mcq: [] });
    generatePaper();
  };

  const approveExam = async () => {
    try {
      const examData = {
        schoolId,
        examName: `${formData.subject} ${formData.examType} Exam`,
        examType: formData.examType,
        subjectName: formData.subject,
        chapters: selectedChapters,
        examDate: formData.examDate ? new Date(formData.examDate).toISOString() : new Date().toISOString(),
        examTime: formData.examTime,
        examDuration: formData.examDuration,
        announcementDate: formData.announcementDate ? new Date(formData.announcementDate).toISOString() : new Date().toISOString(),
        reason: formData.reason || `${formData.examType} evaluation for ${formData.className}`,
        conductTeacher: formData.conductTeacher || 'Staff Teacher',
        className: formData.className
      };

      await approveExamMut(examData).unwrap();
      showMessage('Exam approved and saved successfully!');

      // Export PDF after approval
      exportToPDF();

    } catch (error) {
      console.error('Error approving exam:', error);
      showMessage('Error approving exam. Please try again.', 'error');
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const pdfContent = generatePDFContent();

    printWindow.document.write(`
      <html>
        <head>
          <title>${formData.subject} Exam Paper</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: ${pdfFontSize}px; margin: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .school-name { font-size: ${pdfFontSize + 4}px; font-weight: bold; margin-bottom: 5px; }
            .exam-info { display: flex; justify-content: space-between; margin: 10px 0; }
            .section { margin: 20px 0; }
            .section-header { font-weight: bold; font-size: ${pdfFontSize + 2}px; margin: 15px 0 10px 0; border-bottom: 1px solid #ccc; }
            .question { margin: 15px 0; display: flex; align-items: flex-start; }
            .question-text { flex: 1; }
            .marks { margin-left: 10px; font-weight: bold; border: 1px solid #000; padding: 2px 8px; min-width: 30px; text-align: center; }
            .instructions { background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${pdfContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // Generate PDF content
  const generatePDFContent = () => {
    const totalMarks = calculateTotalMarks();

    let content = `
      <div class="header">
        <div class="school-name">${getSchoolName()}</div>
        <h2>${formData.subject} - ${formData.examType} Examination</h2>
        <div class="exam-info">
          <div>Class: ${formData.className}</div>
          <div>Duration: ${formData.examDuration} minutes</div>
          <div>Total Marks: ${totalMarks}</div>
        </div>
        <div>Date: ${formData.examDate || new Date().toLocaleDateString()}</div>
      </div>
      
      <div class="instructions">
        <strong>Instructions:</strong><br>
        1. All questions are compulsory.<br>
        2. Write your answers clearly and legibly.<br>
        3. Time allowed: ${formData.examDuration} minutes.<br>
        4. Total marks: ${totalMarks}
      </div>
    `;

    if (generatedPaper) {
      let sectionA = '';
      if (selectedQuestions.short.length > 0) {
        sectionA = '<div class="section"><div class="section-header">Section A - Short Answer Questions</div>';
        selectedQuestions.short.forEach((qIndex, i) => {
          const question = generatedPaper.questions.short[qIndex];
          sectionA += `
            <div class="question">
              <div class="question-text">
                <strong>${i + 1}.</strong> ${question.text}
              </div>
              <div class="marks">${marksPerQuestion.short}</div>
            </div>
          `;
        });
        sectionA += '</div>';
      }

      let sectionB = '';
      if (selectedQuestions.long.length > 0) {
        sectionB = '<div class="section"><div class="section-header">Section B - Long Answer Questions</div>';
        selectedQuestions.long.forEach((qIndex, i) => {
          const question = generatedPaper.questions.long[qIndex];
          sectionB += `
            <div class="question">
              <div class="question-text">
                <strong>${i + 1}.</strong> ${question.text}
              </div>
              <div class="marks">${marksPerQuestion.long}</div>
            </div>
          `;
        });
        sectionB += '</div>';
      }

      let sectionC = '';
      if (selectedQuestions.mcq.length > 0) {
        sectionC = '<div class="section"><div class="section-header">Section C - Multiple Choice Questions</div>';
        selectedQuestions.mcq.forEach((qIndex, i) => {
          const question = generatedPaper.questions.mcq[qIndex];
          sectionC += `
            <div class="question">
              <div class="question-text">
                <strong>${i + 1}.</strong> ${question.text}<br>
                ${question.options.map((opt, idx) => `<span style="margin-right: 20px;">${String.fromCharCode(65 + idx)}. ${opt}</span>`).join('<br>')}
              </div>
              <div class="marks">${marksPerQuestion.mcq}</div>
            </div>
          `;
        });
        sectionC += '</div>';
      }

      content += sectionA + sectionB + sectionC;
    }

    return content;
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionStructureChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      questionStructure: {
        ...prev.questionStructure,
        [type]: parseInt(value) || 0
      }
    }));
  };

  const handleChapterToggle = (chapter) => {
    setSelectedChapters(prev =>
      prev.includes(chapter)
        ? prev.filter(c => c !== chapter)
        : [...prev, chapter]
    );
  };

  // Effects
  useEffect(() => {
    if (formData.className) {
      loadSubjects(formData.className);
    }
  }, [formData.className]);

  useEffect(() => {
    if (formData.className && formData.subject) {
      loadChapters(formData.className, formData.subject);
    }
  }, [formData.className, formData.subject]);

  return (
    <div className="min-h-full page-bg text-slate-300">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <FileText size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Exam AI Laboratory</h1>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em] mt-1">Generate & Approve Assessment Papers</p>
            </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6 flex items-center gap-3">
              <CheckCircle size={18} /> {success}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-6 flex items-center gap-3">
              <AlertTriangle size={18} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* Left Panel - Form */}
          <div className="glass-card p-8 space-y-8 animate-fade-in overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="section-header flex items-center gap-3 border-b border-white/[0.05] pb-4 mb-6">
                <Settings size={18} className="text-slate-400" />
                <h3 className="text-lg font-bold text-white">Basic Information</h3>
            </div>
            <div className="form-section">
              <h3>📚 Basic Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Class Name</label>
                   <select
                    className="input-standard bg-slate-900"
                    value={formData.className}
                    onChange={(e) => handleFormChange('className', e.target.value)}
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((classId) => (
                      <option key={classId} value={classId}>
                        {classId.replace('class-', 'Class ').replace('-', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Subject Name</label>
                   <select
                    className="input-standard bg-slate-900"
                    value={formData.subject}
                    onChange={(e) => handleFormChange('subject', e.target.value)}
                    disabled={!formData.className}
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Chapters (Select Multiple)</label>
                {chapters.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>
                    {formData.subject ? 'No chapters found' : 'Please select class and subject first'}
                  </p>
                ) : (
                  <div className="chapters-container">
                    {chapters.map((chapter) => (
                      <div key={chapter} className="chapter-item">
                        <input
                          type="checkbox"
                          id={`chapter-${chapter}`}
                          checked={selectedChapters.includes(chapter)}
                          onChange={() => handleChapterToggle(chapter)}
                        />
                        <label htmlFor={`chapter-${chapter}`} style={{ margin: 0, cursor: 'pointer' }}>
                          {chapter}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>⚙️ Exam Configuration</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Exam Type</label>
                   <select
                    className="input-standard bg-slate-900"
                    value={formData.examType}
                    onChange={(e) => handleFormChange('examType', e.target.value)}
                  >
                    <option value="Mid-Term">Mid-Term</option>
                    <option value="Final">Final</option>
                    <option value="Unit Test">Unit Test</option>
                    <option value="Mock Test">Mock Test</option>
                    <option value="Assignment">Assignment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.examDuration}
                    onChange={(e) => handleFormChange('examDuration', e.target.value)}
                    min="30"
                    max="300"
                  />
                </div>

                <div className="form-group">
                  <label>Exam Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.examDate}
                    onChange={(e) => handleFormChange('examDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Exam Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.examTime}
                    onChange={(e) => handleFormChange('examTime', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Announcement Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.announcementDate}
                    onChange={(e) => handleFormChange('announcementDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Conduct Teacher</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.conductTeacher}
                    onChange={(e) => handleFormChange('conductTeacher', e.target.value)}
                    placeholder="Teacher Name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason/Description</label>
                <textarea
                  className="form-control"
                  value={formData.reason}
                  onChange={(e) => handleFormChange('reason', e.target.value)}
                  rows="3"
                  placeholder="Exam description or reason"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>📝 Question Structure</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Short Questions</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.questionStructure.short}
                    onChange={(e) => handleQuestionStructureChange('short', e.target.value)}
                    min="0"
                    max="20"
                  />
                </div>

                <div className="form-group">
                  <label>Long Questions</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.questionStructure.long}
                    onChange={(e) => handleQuestionStructureChange('long', e.target.value)}
                    min="0"
                    max="15"
                  />
                </div>

                <div className="form-group">
                  <label>MCQ Questions</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.questionStructure.mcq}
                    onChange={(e) => handleQuestionStructureChange('mcq', e.target.value)}
                    min="0"
                    max="30"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Marks per Short Question</label>
                  <input
                    type="number"
                    className="form-control"
                    value={marksPerQuestion.short}
                    onChange={(e) => setMarksPerQuestion(prev => ({ ...prev, short: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="10"
                  />
                </div>

                <div className="form-group">
                  <label>Marks per Long Question</label>
                  <input
                    type="number"
                    className="form-control"
                    value={marksPerQuestion.long}
                    onChange={(e) => setMarksPerQuestion(prev => ({ ...prev, long: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="15"
                  />
                </div>

                <div className="form-group">
                  <label>Marks per MCQ</label>
                  <input
                    type="number"
                    className="form-control"
                    value={marksPerQuestion.mcq}
                    onChange={(e) => setMarksPerQuestion(prev => ({ ...prev, mcq: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="5"
                  />
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                className="btn btn-primary"
                onClick={generatePaper}
                disabled={generateLoading || selectedChapters.length === 0}
                style={{ fontSize: '16px', padding: '15px 30px' }}
              >
                {generateLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Generating Paper...
                  </>
                ) : (
                  '🚀 Generate Paper'
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Questions and Preview */}
          <div className="glass-card p-8 space-y-8 animate-fade-in overflow-y-auto max-h-[calc(100vh-200px)]">
            {!generatedPaper ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                <Printer size={48} className="opacity-20" />
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-400">Paper Preview</h3>
                    <p className="text-sm">Configure and generate a paper to see the preview here</p>
                </div>
              </div>
            ) : (
              <>
                {/* Question Selection */}
                <div className="question-list">
                  <h3>📋 Question Selection</h3>

                  {generatedPaper.questions.short.length > 0 && (
                    <div className="question-section">
                      <div className="question-section-header">
                        <span>Short Answer Questions</span>
                        <span>{selectedQuestions.short.length} / {generatedPaper.questions.short.length}</span>
                      </div>
                      {generatedPaper.questions.short.map((question, index) => (
                        <div key={question.id} className={`question-item ${selectedQuestions.short.includes(index) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            className="question-checkbox"
                            checked={selectedQuestions.short.includes(index)}
                            onChange={() => handleQuestionToggle('short', index)}
                          />
                          <div className="question-text">{question.text}</div>
                          <div className="question-marks">{marksPerQuestion.short} marks</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {generatedPaper.questions.long.length > 0 && (
                    <div className="question-section">
                      <div className="question-section-header">
                        <span>Long Answer Questions</span>
                        <span>{selectedQuestions.long.length} / {generatedPaper.questions.long.length}</span>
                      </div>
                      {generatedPaper.questions.long.map((question, index) => (
                        <div key={question.id} className={`question-item ${selectedQuestions.long.includes(index) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            className="question-checkbox"
                            checked={selectedQuestions.long.includes(index)}
                            onChange={() => handleQuestionToggle('long', index)}
                          />
                          <div className="question-text">{question.text}</div>
                          <div className="question-marks">{marksPerQuestion.long} marks</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {generatedPaper.questions.mcq.length > 0 && (
                    <div className="question-section">
                      <div className="question-section-header">
                        <span>Multiple Choice Questions</span>
                        <span>{selectedQuestions.mcq.length} / {generatedPaper.questions.mcq.length}</span>
                      </div>
                      {generatedPaper.questions.mcq.map((question, index) => (
                        <div key={question.id} className={`question-item ${selectedQuestions.mcq.includes(index) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            className="question-checkbox"
                            checked={selectedQuestions.mcq.includes(index)}
                            onChange={() => handleQuestionToggle('mcq', index)}
                          />
                          <div className="question-text">
                            {question.text}
                            <div style={{ marginTop: '5px', fontSize: '12px', color: 'var(--slate-500)' }}>
                              {question.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join(' | ')}
                            </div>
                          </div>
                          <div className="question-marks">{marksPerQuestion.mcq} marks</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Paper Preview */}
                <div style={{ marginTop: '30px' }}>
                  <div className="preview-controls">
                    <div className="font-size-control">
                      <label>Font Size:</label>
                      <input
                        type="range"
                        min="10"
                        max="16"
                        value={pdfFontSize}
                        onChange={(e) => setPdfFontSize(parseInt(e.target.value))}
                      />
                      <span>{pdfFontSize}px</span>
                    </div>
                    <div className="total-marks">
                      Total Marks: {calculateTotalMarks()}
                    </div>
                  </div>

                  <div className="preview-container" style={{ fontSize: `${pdfFontSize}px` }}>
                    <div className="preview-header">
                      <div style={{ fontSize: `${pdfFontSize + 4}px`, fontWeight: 'bold', marginBottom: '10px' }}>
                        {getSchoolName()}
                      </div>
                      <div style={{ fontSize: `${pdfFontSize + 2}px`, fontWeight: 'bold' }}>
                        {formData.subject} - {formData.examType} Examination
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                        <span>Class: {formData.className}</span>
                        <span>Duration: {formData.examDuration} minutes</span>
                        <span>Total Marks: {calculateTotalMarks()}</span>
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        Date: {formData.examDate || new Date().toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', margin: '20px 0', borderLeft: '4px solid var(--primary-color)', borderRadius: '8px' }}>
                      <strong>Instructions:</strong><br />
                      1. All questions are compulsory.<br />
                      2. Write your answers clearly and legibly.<br />
                      3. Time allowed: {formData.examDuration} minutes.<br />
                      4. Total marks: {calculateTotalMarks()}
                    </div>

                    {/* Render selected questions */}
                    {selectedQuestions.short.length > 0 && (
                      <div style={{ margin: '20px 0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: `${pdfFontSize + 2}px`, marginBottom: '15px', borderBottom: '1px solid #ccc' }}>
                          Section A - Short Answer Questions
                        </div>
                        {selectedQuestions.short.map((qIndex, i) => {
                          const question = generatedPaper.questions.short[qIndex];
                          return (
                            <div key={question.id} style={{ margin: '15px 0', display: 'flex', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <strong>{i + 1}.</strong> {question.text}
                              </div>
                              <div style={{ marginLeft: '10px', fontWeight: 'bold', border: '1px solid #000', padding: '2px 8px', minWidth: '30px', textAlign: 'center' }}>
                                {marksPerQuestion.short}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedQuestions.long.length > 0 && (
                      <div style={{ margin: '20px 0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: `${pdfFontSize + 2}px`, marginBottom: '15px', borderBottom: '1px solid #ccc' }}>
                          Section B - Long Answer Questions
                        </div>
                        {selectedQuestions.long.map((qIndex, i) => {
                          const question = generatedPaper.questions.long[qIndex];
                          return (
                            <div key={question.id} style={{ margin: '15px 0', display: 'flex', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <strong>{i + 1}.</strong> {question.text}
                              </div>
                              <div style={{ marginLeft: '10px', fontWeight: 'bold', border: '1px solid #000', padding: '2px 8px', minWidth: '30px', textAlign: 'center' }}>
                                {marksPerQuestion.long}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedQuestions.mcq.length > 0 && (
                      <div style={{ margin: '20px 0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: `${pdfFontSize + 2}px`, marginBottom: '15px', borderBottom: '1px solid #ccc' }}>
                          Section C - Multiple Choice Questions
                        </div>
                        {selectedQuestions.mcq.map((qIndex, i) => {
                          const question = generatedPaper.questions.mcq[qIndex];
                          return (
                            <div key={question.id} style={{ margin: '15px 0', display: 'flex', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <strong>{i + 1}.</strong> {question.text}<br />
                                <div style={{ marginTop: '5px' }}>
                                  {question.options.map((opt, idx) => (
                                    <div key={idx} style={{ marginLeft: '20px' }}>
                                      {String.fromCharCode(65 + idx)}. {opt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div style={{ marginLeft: '10px', fontWeight: 'bold', border: '1px solid #000', padding: '2px 8px', minWidth: '30px', textAlign: 'center' }}>
                                {marksPerQuestion.mcq}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-white/[0.05]">
                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all duration-300 active:scale-95"
                    onClick={generateNewPaper}
                    disabled={generateLoading}
                  >
                    <RefreshCw size={18} className={generateLoading ? 'animate-spin' : ''} />
                    Regenerate Paper
                  </button>

                  <button
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    onClick={approveExam}
                    disabled={loading || calculateTotalMarks() === 0}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Approve & Export PDF
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamManager;
