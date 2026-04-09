// Awards Section Component
import React from 'react';
import { Loader, Award, Medal, Star, Trophy } from 'lucide-react';
import { formatDateTime } from './employeeprofileUtils';

const AwardsSection = ({ awards, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white border-2 border-yellow-200 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="animate-spin text-yellow-600 mr-2" />
                    <span>Loading awards...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-yellow-200 rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
                <Award className="mr-2 text-yellow-600" size={20} />
                Awards & Achievements ({awards.length})
            </h3>

            {awards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {awards.map((award, index) => (
                        <div key={award.awardId || index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center mb-2">
                                        <Medal className="text-yellow-600 mr-2" size={18} />
                                        <h4 className="font-semibold text-gray-800">{award.awardName}</h4>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-gray-500">Type:</span> <span className="text-gray-700">{award.awardType}</span></p>
                                        <p><span className="text-gray-500">Position:</span> <span className="font-medium text-yellow-600">{award.position}</span></p>
                                        {award.description && (
                                            <p><span className="text-gray-500">Description:</span> <span className="text-gray-700">{award.description}</span></p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            Awarded: {formatDateTime(award.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    {award.position === '1st' && <Trophy className="text-yellow-500" size={24} />}
                                    {award.position === '2nd' && <Star className="text-gray-400" size={24} />}
                                    {award.position === '3rd' && <Medal className="text-amber-700" size={24} />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Award size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No awards found</p>
                </div>
            )}
        </div>
    );
};

export default AwardsSection;