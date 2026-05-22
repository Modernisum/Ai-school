import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  IndianRupee, TrendingUp, Users, Calendar, Search, Filter,
  Download, Upload, CheckCircle, AlertTriangle, CreditCard,
  DollarSign, Banknote, Wallet, PieChart, Loader, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useGetEmployeesQuery } from '../api/employeeApi';
import GlassCard from '../../../components/ui/GlassCard';
import KPITile from '../../../components/ui/KPITile';
import StandardButton from '../../../components/ui/StandardButton';
import DropdownWidget from '../../../components/ui/DropdownWidget';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function SalaryPage() {
  const { schoolId } = useAuth();
  
  const { data: eData, isLoading: employeesLoading } = useGetEmployeesQuery(schoolId);
  const employees = useMemo(() => eData?.data || eData?.employees || [], [eData]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const departments = useMemo(() => {
    const deptSet = new Set();
    employees.forEach(emp => {
      const dept = emp.department || emp.role;
      if (dept) deptSet.add(dept);
    });
    return ['All', ...Array.from(deptSet).sort()];
  }, [employees]);
  
  const salaryData = useMemo(() => {
    return employees.map(employee => {
      const baseSalary = employee.salary || 35000;
      const allowances = Math.floor(baseSalary * 0.3);
      const deductions = Math.floor(baseSalary * 0.1);
      const netSalary = baseSalary + allowances - deductions;
      return {
        id: employee.employeeId || employee.id,
        name: employee.name || employee.employeeName,
        department: employee.department || 'General',
        baseSalary, allowances, deductions, netSalary,
        status: Math.random() > 0.2 ? 'Paid' : 'Pending',
        paymentDate: '2024-11-30'
      };
    });
  }, [employees]);
  
  const totals = useMemo(() => {
    let totalNet = 0;
    salaryData.forEach(s => totalNet += s.netSalary);
    return { totalNet };
  }, [salaryData]);
  
  if (employeesLoading) return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader className="animate-spin text-amber-500" />
      </div>
  );

  return (
    <div className="max-w-full p-1 space-y-2 text-slate-400">
      <div className="space-y-2">
        <header className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shadow-md">
                <IndianRupee size={14} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-widest uppercase italic leading-none">
                Salary Computation
              </h1>
              <p className="text-micro font-black text-slate-700 uppercase tracking-widest mt-0.5">Active • {employees.length} Staff</p>
            </div>
          </div>
          <div className="flex gap-1">
              <StandardButton
                variant="ghost"
                size="xs"
                icon={RefreshCw}
              />
          </div>
        </header>
        
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-1">
          <KPITile dense label="Total Salary Pool" value={`₹${totals.totalNet.toLocaleString('en-IN')}`} icon={IndianRupee} color="warning" />
          <KPITile dense label="Active Staff" value={employees.length} icon={Users} color="primary" />
        </motion.div>
        
        <div className="space-y-1">
          <div className="flex flex-col md:flex-row gap-1 items-center">
            <div className="relative flex-1 group w-full">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-amber-500 transition-colors" />
              <input className="w-full bg-white/[0.03] border border-white/10 rounded-lg h-8 pl-9 pr-3 text-micro text-white focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all placeholder:text-slate-800 font-black uppercase tracking-widest" 
                placeholder="Search salary..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-1 w-full md:w-auto">
              <DropdownWidget
                dense
                options={departments.map(dept => ({
                    label: dept === 'All' ? 'All Departments' : dept.toUpperCase(),
                    value: dept
                }))}
                value={filterDepartment}
                onChange={setFilterDepartment}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}