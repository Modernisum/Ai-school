// Responsibility Section Component
import React from 'react';
import { Loader, Briefcase, DollarSign, TrendingUp, CheckCircle, XCircle, PieChart } from 'lucide-react';
import { formatCurrency } from './employeeprofileUtils';

const ResponsibilitySection = ({ employee, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="animate-spin text-blue-600 mr-2" />
                    <span>Loading responsibilities...</span>
                </div>
            </div>
        );
    }

    if (!employee || !employee.responsibilities) {
        return (
            <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
                    <Briefcase className="mr-2 text-blue-600" size={20} />
                    Responsibilities & Salary
                </h3>
                <div className="text-center py-8">
                    <Briefcase size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No responsibilities assigned</p>
                </div>
            </div>
        );
    }

    const responsibilities = employee.responsibilities || [];
    const totalPerDayPrice = employee.totalPerDayPrice || 0;
    const baseSalary = employee.baseSalary || 0;

    return (
        <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
                <Briefcase className="mr-2 text-blue-600" size={20} />
                Responsibilities & Salary ({responsibilities.length})
            </h3>

            {/* Salary Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <DollarSign className="text-green-600 mr-2" size={20} />
                        <div>
                            <p className="text-green-700 font-medium">Base Salary</p>
                            <p className="text-2xl font-bold text-green-800">{formatCurrency(baseSalary)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <TrendingUp className="text-blue-600 mr-2" size={20} />
                        <div>
                            <p className="text-blue-700 font-medium">Per Day Rate</p>
                            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalPerDayPrice)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <PieChart className="text-purple-600 mr-2" size={20} />
                        <div>
                            <p className="text-purple-700 font-medium">Monthly Estimate</p>
                            <p className="text-2xl font-bold text-purple-800">{formatCurrency(totalPerDayPrice * 30)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Responsibilities List */}
            {responsibilities.length > 0 ? (
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Assigned Responsibilities:</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {responsibilities.map((resp, index) => (
                            <div key={resp.responsibilityId || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-2">
                                            <CheckCircle className="text-green-600 mr-2" size={16} />
                                            <h4 className="font-semibold text-gray-800">{resp.responsibilityName}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-500 font-medium">Type</span>
                                                <p className="text-gray-800">{resp.responsibilityType}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 font-medium">Per Day Price</span>
                                                <p className="text-gray-800 font-medium">{formatCurrency(resp.perDayPrice)}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 font-medium">Status</span>
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${resp.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {resp.status || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                        {resp.description && (
                                            <p className="text-sm text-gray-600 mt-2">{resp.description}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-6">
                    <Briefcase size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No responsibilities assigned to this employee</p>
                </div>
            )}
        </div>
    );
};

export default ResponsibilitySection;