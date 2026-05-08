import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, CreditCard, UserPlus, Truck, Star, 
    MoreHorizontal, Briefcase, Box, Calendar, ShoppingBag, DollarSign, IndianRupee,
    Utensils, Plane, Zap, Wrench, Film
} from 'lucide-react';

import IncomeOverview from './income/overview';
import ExpenseOverview from './expense/overview';
import FeesManagement from './fees';

const FinanceModule = () => {
    return (
        <div className="h-full overflow-y-auto p-1 bg-slate-900/10">
            <Routes>
                    {/* Income Section */}
                    <Route path="income/*">
                        <Route path="overview" element={<IncomeOverview />} />
                        <Route path="fees" element={<FeesManagement />} />
                        {['admission', 'transport', 'events', 'other'].map(p => (
                            <Route key={p} path={p} element={
                                <div className="p-2 text-center text-slate-700 font-black uppercase tracking-[0.2em] text-micro italic">
                                    INCOME_{p.replace('-', '_').toUpperCase()}_SYNC_PENDING
                                </div>
                            } />
                        ))}
                        <Route path="*" element={<Navigate to="overview" replace />} />
                    </Route>

                    {/* Expense Section */}
                    <Route path="expense/*">
                        <Route path="overview" element={<ExpenseOverview />} />
                        {['salary', 'infra', 'food', 'travel', 'utilities', 'maintenance', 'entertainment', 'transport', 'events'].map(p => (
                            <Route key={p} path={p} element={
                                <div className="p-2 text-center text-slate-700 font-black uppercase tracking-[0.2em] text-micro italic">
                                    EXPENSE_{p.replace('-', '_').toUpperCase()}_SYNC_PENDING
                                </div>
                            } />
                        ))}
                        <Route path="*" element={<Navigate to="overview" replace />} />
                    </Route>

                    {/* Default Redirect */}
                    <Route path="*" element={<Navigate to="income/overview" replace />} />
            </Routes>
        </div>
    );
};

export default FinanceModule;
