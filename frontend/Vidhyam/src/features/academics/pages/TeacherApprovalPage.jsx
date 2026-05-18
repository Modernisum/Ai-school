import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Eye, ChevronLeft, BookOpen, Trophy,
  Send, AlertTriangle, RefreshCw, User, Clock, FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import { academicApi } from '../api/academicApi';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import StandardButton from '../../../components/ui/StandardButton';

const {
  useListExamsQuery,
  useGetExamSubmissionsForCheckerQuery,
  useTeacherApproveSubmissionMutation,
  useTeacherRejectSubmissionMutation,
  usePublishExamResultsMutation,
} = academicApi;

const getSchoolId = () => localStorage.getItem('schoolId') || '';

export default function TeacherApprovalPage() {
  const schoolId = getSchoolId();
  const { data: exams = [], isLoading: examsLoading, refetch: refetchExams } = useListExamsQuery(schoolId);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [publishing, setPublishing] = useState(null);

  const {
    data: submissions = [],
    isLoading: subsLoading,
    refetch: refetchSubs,
  } = useGetExamSubmissionsForCheckerQuery(
    { schoolId, examId: selectedExamId || '' },
    { skip: !selectedExamId }
  );

  const [approveSubmission] = useTeacherApproveSubmissionMutation();
  const [rejectSubmission] = useTeacherRejectSubmissionMutation();
  const [publishResults] = usePublishExamResultsMutation();

  const selectedExam = exams.find(e => String(e.id) === String(selectedExamId));

  const handleApprove = async (submissionId, teacherNotes = '') => {
    if (!selectedExamId) return;
    setApprovingId(submissionId);
    try {
      const res = await approveSubmission({
        schoolId,
        examId: selectedExamId,
        submissionId,
        teacherNotes,
      }).unwrap();
      toast.success('Submission approved');
      refetchSubs();
    } catch (e) {
      toast.error(e?.data?.message || 'Approval failed');
    }
    setApprovingId(null);
  };

  const handleReject = async (submissionId, teacherNotes = '') => {
    if (!selectedExamId) return;
    setRejectingId(submissionId);
    try {
      const res = await rejectSubmission({
        schoolId,
        examId: selectedExamId,
        submissionId,
        teacherNotes,
      }).unwrap();
      toast.info('Submission rejected');
      refetchSubs();
    } catch (e) {
      toast.error(e?.data?.message || 'Rejection failed');
    }
    setRejectingId(null);
  };

  const handlePublish = async () => {
    if (!selectedExamId) return;
    setPublishing(true);
    try {
      await publishResults({ schoolId, examId: selectedExamId }).unwrap();
      toast.success('Results published — students can now view their scores');
      refetchExams();
    } catch (e) {
      toast.error(e?.data?.message || 'Publish failed');
    }
    setPublishing(false);
  };

  const pendingApproval = submissions.filter(s => s.status === 'checker_reviewed');
  const approvedCount = submissions.filter(s => s.status === 'teacher_approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'teacher_rejected').length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page">
      <PageHeader
        title="Exam Approval"
        subtitle={selectedExamId ? `Reviewing: ${selectedExam?.name || ''}` : 'Select an exam to review checker submissions'}
        icon={CheckCircle}
      />

      {!selectedExamId ? (
        /* ---- Exam List ---- */
        <>
          {examsLoading ? (
            <GlassCard><div className="p-8 text-center text-slate-400">Loading exams...</div></GlassCard>
          ) : exams.length === 0 ? (
            <GlassCard><div className="p-8 text-center text-slate-400">No exams found</div></GlassCard>
          ) : (
            <div className="mt-4 space-y-3">
              {exams.map(exam => (
                <GlassCard key={exam.id}>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-indigo-400" />
                        <span className="font-semibold text-white">{exam.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                          exam.resultsPublished ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {exam.resultsPublished ? 'PUBLISHED' : exam.status || 'PENDING'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {exam.quarter && `Q${exam.quarter} · `}
                        {exam.examType || 'MAIN'} · {exam.endDate || exam.startDate || 'TBD'}
                      </div>
                    </div>
                    <StandardButton
                      onClick={() => setSelectedExamId(String(exam.id))}
                      icon={Eye}
                      variant="primary"
                      size="sm"
                    >
                      Review
                    </StandardButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ---- Submissions for selected exam ---- */
        <div className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <StandardButton onClick={() => setSelectedExamId(null)} icon={ChevronLeft} variant="ghost" size="sm">
              Back
            </StandardButton>
            <div className="flex gap-2 text-sm">
              <span className="text-amber-400">{pendingApproval.length} pending</span>
              <span className="text-green-400">{approvedCount} approved</span>
              <span className="text-red-400">{rejectedCount} rejected</span>
            </div>
            <div className="flex-1" />
            <StandardButton
              onClick={handlePublish}
              icon={Send}
              variant="primary"
              size="sm"
              isLoading={publishing}
              disabled={!selectedExam || selectedExam.resultsPublished !== false}
            >
              {publishing ? 'Publishing...' : 'Publish Results'}
            </StandardButton>
            <StandardButton onClick={() => { refetchSubs(); refetchExams(); }} icon={RefreshCw} variant="ghost" size="sm" />
          </div>

          {subsLoading ? (
            <GlassCard><div className="p-8 text-center text-slate-400">Loading submissions...</div></GlassCard>
          ) : submissions.length === 0 ? (
            <GlassCard><div className="p-8 text-center text-slate-400">No submissions for this exam</div></GlassCard>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {submissions.map(sub => (
                  <motion.div key={sub.submissionId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <GlassCard>
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User size={14} className="text-slate-400" />
                              <span className="font-mono text-sm text-white">{sub.studentId}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                                sub.status === 'teacher_approved' ? 'bg-green-500/20 text-green-400' :
                                sub.status === 'teacher_rejected' ? 'bg-red-500/20 text-red-400' :
                                sub.status === 'checker_reviewed' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}>
                                {sub.status?.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-2">
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Score</div>
                                <div className="text-lg font-bold text-indigo-300">{sub.overallScore ?? '—'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Grade</div>
                                <div className="text-lg font-bold text-white">{sub.grade || '—'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Confidence</div>
                                <div className="text-sm text-slate-400">{sub.confidenceScore}%</div>
                              </div>
                            </div>
                            {sub.feedback && (
                              <div className="text-xs text-slate-400 mb-2 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                {sub.feedback}
                              </div>
                            )}
                            {sub.checkedBy && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Clock size={10} />
                                Checked by: {sub.checkedBy} at {sub.checkedAt}
                              </div>
                            )}
                          </div>

                          {sub.status === 'checker_reviewed' && (
                            <div className="flex flex-col gap-2 ml-4">
                              <StandardButton
                                onClick={() => handleApprove(sub.submissionId, teacherNotes)}
                                icon={CheckCircle}
                                variant="primary"
                                size="sm"
                                isLoading={approvingId === sub.submissionId}
                              >
                                Approve
                              </StandardButton>
                              <StandardButton
                                onClick={() => handleReject(sub.submissionId, teacherNotes)}
                                icon={XCircle}
                                variant="danger"
                                size="sm"
                                isLoading={rejectingId === sub.submissionId}
                              >
                                Reject
                              </StandardButton>
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
}
