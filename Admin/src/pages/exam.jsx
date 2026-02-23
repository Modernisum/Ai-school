import React, { useState, useEffect } from 'react';

const ExamManager = () => {
  // Get data from localStorage
  const getSchoolId = () => localStorage.getItem('schoolId') || '622079';
  const getSchoolName = () => localStorage.getItem('schoolName') || 'Modern School';
  const getBoard = () => localStorage.getItem('boardName') || 'CBSE';
  const getMedium = () => localStorage.getItem('medium') || 'English';

  // State Management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  // Dynamic Data States
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
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

  // API configurations
  const apiCall = async (endpoint, options = {}) => {
    const url = `${process.env.REACT_APP_API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await response.json();
    return { data, status: response.status };
  };

  const api = {
    get: (url) => apiCall(url, { method: 'GET' }),
    post: (url, body) => apiCall(url, { method: 'POST', body: JSON.stringify(body) }),
  };

  const examApi = api;
  const classApi = api;
  const subjectApi = api;
  const topicApi = api;
  const approveExamApi = api;

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

  // Fetch functions
  const fetchClasses = async () => {
    try {
      const response = await classApi.get(`/academic/${schoolId}/classIds`);
      if (response.data.success) {
        setClasses(response.data.classIds || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async (className) => {
    if (!className) {
      setSubjects([]);
      return;
    }

    try {
      const response = await subjectApi.get(`/academic/${schoolId}/${className}/ids`);
      if (response.data.success) {
        setSubjects(response.data.data || []);
      }
      setChapters([]);
      setSelectedChapters([]);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
    }
  };

  const fetchChapters = async (className, subject) => {
    if (!className || !subject) {
      setChapters([]);
      setSelectedChapters([]);
      return;
    }

    try {
      const response = await topicApi.get(`/academic/topic/${schoolId}/class/${className}/subject/${subject}/chapter/names`);
      setChapters(Array.isArray(response.data) ? response.data : []);
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

    setGenerateLoading(true);
    try {
      const config = {
        board: getBoard(),
        language: getMedium(),
        className: formData.className,
        subject: formData.subject,
        chapters: selectedChapters,
        difficulty: 'Medium',
        counts: formData.questionStructure
      };

      const response = await examApi.post(`/academic/${schoolId}/generate-paper`, config);

      if (response.data.success) {
        const paper = response.data.data;
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
    } finally {
      setGenerateLoading(false);
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

  // Approve and save exam
  const approveExam = async () => {
    try {
      setLoading(true);

      const examData = {
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

      await approveExamApi.post(`/academic/${schoolId}/exams`, examData);
      showMessage('Exam approved and saved successfully!');

      // Export PDF after approval
      exportToPDF();

    } catch (error) {
      console.error('Error approving exam:', error);
      showMessage('Error approving exam. Please try again.', 'error');
    } finally {
      setLoading(false);
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
    fetchClasses();
  }, []);

  useEffect(() => {
    if (formData.className) {
      fetchSubjects(formData.className);
    }
  }, [formData.className]);

  useEffect(() => {
    if (formData.className && formData.subject) {
      fetchChapters(formData.className, formData.subject);
    }
  }, [formData.className, formData.subject]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      fontFamily: 'Arial, sans-serif'
    }}>
      <style jsx>{`
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          color: white;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          height: calc(100vh - 200px);
        }
        
        .left-panel, .right-panel {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          overflow-y: auto;
        }
        
        .form-section {
          margin-bottom: 25px;
        }
        
        .form-section h3 {
          margin-bottom: 15px;
          color: #333;
          font-size: 18px;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 8px;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #444;
        }
        
        .form-control {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        
        .form-control:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .chapters-container {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          max-height: 200px;
          overflow-y: auto;
          background: #f9f9f9;
        }
        
        .chapter-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 8px;
          background: white;
          border-radius: 6px;
          transition: background 0.2s;
        }
        
        .chapter-item:hover {
          background: #f0f0f0;
        }
        
        .chapter-item input {
          margin-right: 10px;
          transform: scale(1.2);
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        
        .btn-success {
          background: linear-gradient(135deg, #4facfe, #00f2fe);
          color: white;
        }
        
        .btn-warning {
          background: linear-gradient(135deg, #fa709a, #fee140);
          color: white;
        }
        
        .btn-danger {
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          color: white;
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .question-list {
          margin-bottom: 20px;
        }
        
        .question-section {
          margin-bottom: 25px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .question-section-header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 12px 15px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .question-item {
          padding: 15px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        
        .question-item:last-child {
          border-bottom: none;
        }
        
        .question-item.selected {
          background: #f8f9ff;
          border-left: 4px solid #667eea;
        }
        
        .question-checkbox {
          margin-top: 4px;
          transform: scale(1.2);
        }
        
        .question-text {
          flex: 1;
          line-height: 1.5;
        }
        
        .question-marks {
          background: #667eea;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .preview-container {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          background: #fafafa;
          font-family: 'Times New Roman', serif;
          min-height: 400px;
        }
        
        .preview-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .preview-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px;
          background: #f0f0f0;
          border-radius: 8px;
        }
        
        .font-size-control {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .total-marks {
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
        }
        
        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
        }
        
        .alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .alert-warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <h1 style={{ fontSize: '36px', margin: '0 0 10px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            📝 Exam Paper Generator
          </h1>
          <p style={{ fontSize: '18px', margin: 0, opacity: 0.9 }}>
            {getSchoolName()} • {getBoard()} Board • {getMedium()} Medium
          </p>
        </div>

        {/* Messages */}
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="main-content">
          {/* Left Panel - Form */}
          <div className="left-panel">
            <div className="form-section">
              <h3>📚 Basic Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Class Name</label>
                  <select
                    className="form-control"
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
                    className="form-control"
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
                    className="form-control"
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
          <div className="right-panel">
            {!generatedPaper ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                <h3>📄 Paper Preview</h3>
                <p>Generate a paper to see preview here</p>
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
                            <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
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

                    <div style={{ background: '#f5f5f5', padding: '15px', margin: '20px 0', borderLeft: '4px solid #007bff' }}>
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
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
                  <button
                    className="btn btn-warning"
                    onClick={generateNewPaper}
                    disabled={generateLoading}
                  >
                    🔄 Generate New Paper
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={approveExam}
                    disabled={loading || calculateTotalMarks() === 0}
                  >
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Approving...
                      </>
                    ) : (
                      '✅ Approve & Export PDF'
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