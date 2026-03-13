import React, { memo } from 'react';
import { Brain, Trophy, Star, Award, Calendar, TrendingUp } from 'lucide-react';
import { formatDate } from '../../../../utils/helpers';

const ExamsSubSection = ({ exams }) => {
  if (!exams || exams.length === 0) return (
    <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
      <Brain size={48} className="text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No exam history available</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {exams.map((exam, i) => (
        <div key={i} className="bg-white border-2 border-purple-100 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-bold text-gray-800">{exam.examName}</h4>
              <p className="text-[10px] text-purple-600 font-bold uppercase">{exam.subjectName}</p>
            </div>
            {exam.result && (
              <div className="text-right">
                <span className="text-lg font-black text-gray-800">{exam.result.percentage}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center"><Calendar size={12} className="mr-1" />{exam.examDate}</span>
            <span className="flex items-center"><TrendingUp size={12} className="mr-1" />{exam.result?.obtainMarks}/{exam.result?.totalMarks}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const AwardsSubSection = ({ awards }) => {
  if (!awards || awards.length === 0) return (
    <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
      <Trophy size={48} className="text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No awards earned yet</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {awards.map((award, i) => (
        <div key={i} className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-100 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-full text-white shadow-sm">
              <Star size={18} fill="currentColor" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 leading-tight">{award.awardName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold">
                  {award.awardType}
                </span>
                <span className="text-[10px] text-gray-500">{formatDate(award.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const PerformanceSection = memo(({ exams, awards }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Exams */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-200 rounded-xl shadow-xl p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Brain className="mr-3 text-purple-600" size={24} />
          Academic Exams
        </h3>
        <ExamsSubSection exams={exams} />
      </div>

      {/* Awards */}
      <div className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 border-2 border-yellow-200 rounded-xl shadow-xl p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Trophy className="mr-3 text-yellow-600" size={24} />
          Achievements
        </h3>
        <AwardsSubSection awards={awards} />
      </div>
    </div>
  );
});

PerformanceSection.displayName = 'PerformanceSection';

export default PerformanceSection;
