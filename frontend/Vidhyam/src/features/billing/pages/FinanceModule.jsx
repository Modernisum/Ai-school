import React, { Suspense, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, CreditCard, UserPlus, Truck, Star, 
    MoreHorizontal, Briefcase, Box, Calendar, ShoppingBag, DollarSign, IndianRupee,
    Utensils, Plane, Zap, Wrench, Film
} from 'lucide-react';
import SecondaryNav from '../../../components/ui/SecondaryNav';
import PageLoader from '../../../components/ui/PageLoader';

// Lazy load pages
const IncomeOverview = React.lazy(() => import('./income/overview'));
const ExpenseOverview = React.lazy(() => import('./expense/overview'));

const FinanceModule = () => {
    const location = useLocation();

    const incomeTabs = useMemo(() => [
        { label: 'Income Overview', path: '/dashboard/finance/income/overview', icon: LayoutDashboard },
        { label: 'Fees', path: '/dashboard/finance/income/fees', icon: CreditCard },
        { label: 'Admission', path: '/dashboard/finance/income/admission', icon: UserPlus },
        { label: 'Transport', path: '/dashboard/finance/income/transport', icon: Truck },
        { label: 'Events', path: '/dashboard/finance/income/events', icon: Star },
        { label: 'Other', path: '/dashboard/finance/income/other', icon: MoreHorizontal },
    ], []);

    const expenseTabs = useMemo(() => [
        { label: 'Expense Overview', path: '/dashboard/finance/expense/overview', icon: LayoutDashboard },
        { label: 'Salary', path: '/dashboard/finance/expense/salary', icon: Briefcase },
        { label: 'Infra', path: '/dashboard/finance/expense/infra', icon: Box },
        { label: 'Food', path: '/dashboard/finance/expense/food', icon: Utensils },
        { label: 'Travel', path: '/dashboard/finance/expense/travel', icon: Plane },
        { label: 'Utilities', path: '/dashboard/finance/expense/utilities', icon: Zap },
        { label: 'Maintenance', path: '/dashboard/finance/expense/maintenance', icon: Wrench },
        { label: 'Entertainment', path: '/dashboard/finance/expense/entertainment', icon: Film },
        { label: 'Transport', path: '/dashboard/finance/expense/transport', icon: Truck },
        { label: 'Events', path: '/dashboard/finance/expense/events', icon: Star },
    ], []);

    // Switch tabs based on path
    const isExpense = location.pathname.includes('/finance/expense');
    const currentTabs = isExpense ? expenseTabs : incomeTabs;

    return (
        <div className="flex h-full min-h-[calc(100vh-64px)] overflow-hidden">
            <SecondaryNav type={isExpense ? 'expense' : 'income'} tabs={currentTabs} />
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900/10">
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Income Section */}
                        <Route path="income/*">
                            <Route path="overview" element={<IncomeOverview />} />
                            {['fees', 'admission', 'transport', 'events', 'other'].map(p => (
                                <Route key={p} path={p} element={
                                    <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                                        Income {p.replace('-', ' ')} Data Coming Soon
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
                                    <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                                        Expense {p.replace('-', ' ')} Data Coming Soon
                                    </div>
                                } />
                            ))}
                            <Route path="*" element={<Navigate to="overview" replace />} />
                        </Route>

                        {/* Default Redirect */}
                        <Route path="*" element={<Navigate to="income/overview" replace />} />
                    </Routes>
                </Suspense>
            </div>
        </div>
    );
};

export default FinanceModule;
