// FeesListAndPayment.jsx
import React, { useState, memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectSchoolId } from '../../auth/authSlice';
import { 
    CreditCard, User, CheckCircle, AlertTriangle, 
    ArrowRight, DollarSign, Zap, X, Calendar, MessageSquare,
    Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateRazorpayOrderMutation, useSendAIReminderMutation } from '../api/billingApi';
import { ReceiptService } from '../utils/ReceiptService';

const FeesListBox = memo(({ feesList, onPaymentClick }) => {
    const [sendAIReminder] = useSendAIReminderMutation();

    if (feesList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                    <CreditCard size={32} className="text-slate-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Students Found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or create some fees records</p>
            </div>
        );
    }

    const handleAIReminder = async (student) => {
        try {
            const schoolId = localStorage.getItem('schoolId') || "";
            const data = await sendAIReminder({ schoolId, studentId: student.studentId }).unwrap();
            if (data.success) {
                alert(data.data?.message || data.message); // For demo, using alert to show the AI text
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDownloadPastReceipt = (student) => {
        ReceiptService.generateReceipt({
            school: { name: "VIDHYAM ERP", address: "Enterprise School Management" },
            student: { id: student.studentId, name: student.name, className: student.class },
            payment: { id: `RCPT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, date: new Date().toISOString(), method: "History", total: student.paid },
            fees: [{ name: "Consolidated Fees", amount: student.paid, penalty: 0 }]
        });
    };

    const getStatusStyles = (status) => ({
        Paid: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
        Partial: 'bg-amber-500/15 border-amber-500/25 text-amber-400',
        Pending: 'bg-rose-500/15 border-rose-500/25 text-rose-400',
    }[status] || 'bg-slate-500/15 border-slate-500/25 text-slate-400');

    return (
        <div className="glass-card overflow-hidden border-none bg-white/[0.02]">
            <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total Fees</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pending</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Collection status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {feesList.map((student) => {
                            const progress = student.amount > 0 ? (student.paid / student.amount) * 100 : 0;
                            return (
                                <tr key={student.studentId} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/10">
                                                <User size={16} className="text-violet-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{student.name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.studentId} • {student.class}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-black text-slate-300">₹{student.amount.toLocaleString()}</p>
                                        <div className="w-24 h-1 bg-white/5 rounded-full mt-2 ml-auto overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-emerald-500/50" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-black text-rose-400">₹{student.pending.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-600 font-bold mt-0.5 uppercase tracking-tighter">Amount Overdue</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest ${getStatusStyles(student.status)}`}>
                                                {student.status}
                                            </span>
                                            {student.paid > 0 && (
                                                <button 
                                                    onClick={() => handleDownloadPastReceipt(student)}
                                                    className="flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-cyan-400 transition-colors"
                                                >
                                                    <CreditCard size={10} /> Receipt
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={() => onPaymentClick(student)}
                                                disabled={student.pending === 0}
                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                                    ${student.pending === 0 
                                                        ? 'bg-emerald-500/10 text-emerald-500 opacity-50 cursor-not-allowed' 
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 ml-auto'}`}
                                            >
                                                <DollarSign size={14} /> {student.pending === 0 ? 'Settled' : 'Collect'}
                                            </button>
                                            {student.pending > 0 && (
                                                <button 
                                                    onClick={() => handleAIReminder(student)}
                                                    className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest ml-auto"
                                                >
                                                    <Zap size={12} className="animate-pulse" /> Send AI Reminder
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
FeesListBox.displayName = 'FeesListBox';

const StudentPaymentModal = memo(({ student, onClose, onSubmit, calculatePenalty }) => {
    const penalty = calculatePenalty ? calculatePenalty(student.dueDate, student.penaltyPerDay, student.status === 'Paid') : 0;
    
    const [paymentData, setPaymentData] = useState({
        amount: student.pending + penalty,
        paymentMethod: 'Cash',
        transactionId: '',
        remarks: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [createOrder] = useCreateRazorpayOrderMutation();

    const triggerReceipt = (transactionId, method) => {
        ReceiptService.generateReceipt({
            school: { name: "VIDHYAM ERP", address: "School Management System" },
            student: { id: student.studentId, name: student.name, className: student.class },
            payment: { id: transactionId, date: paymentData.paymentDate, method: method, total: paymentData.amount },
            fees: [{ name: "Outstanding Fees", amount: student.pending, penalty: penalty }]
        });
    };

    const handleSumbit = (e) => {
        e?.preventDefault();
        const finalId = paymentData.transactionId || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        onSubmit({ schoolId: student.schoolId, studentId: student.studentId, paymentData: { ...paymentData, transactionId: finalId } });
        triggerReceipt(finalId, paymentData.paymentMethod);
    };

    const handleOnlinePayment = async () => {
        if (paymentData.amount <= 0 || paymentData.amount > student.pending) return;
        setIsProcessing(true);
        try {
            const orderRes = await createOrder({ 
                schoolId: student.schoolId, 
                amount: paymentData.amount, 
                studentId: student.studentId 
            }).unwrap();

            const options = {
                key: orderRes.key_id,
                amount: orderRes.amount,
                currency: "INR",
                name: "Vidhyam School Management",
                description: `Fees payment for ${student.name}`,
                order_id: orderRes.order_id,
                handler: function (response) {
                    onSubmit({ 
                        schoolId: student.schoolId, 
                        studentId: student.studentId, 
                        paymentData: { 
                            ...paymentData, 
                            paymentMethod: 'Razorpay', 
                            transactionId: response.razorpay_payment_id,
                            remarks: `Order ID: ${response.razorpay_order_id} | Sig: ${response.razorpay_signature}`
                        } 
                    });
                    triggerReceipt(response.razorpay_payment_id, 'Razorpay');
                },
                prefill: {
                    name: student.name,
                    email: student.email || "",
                    contact: student.phone || ""
                },
                theme: {
                    color: "#4f46e5"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                console.error("Payment Failed:", response.error);
                setIsProcessing(false);
            });
            rzp.open();
        } catch (err) {
            console.error("Order Creation Failed:", err);
            setIsProcessing(false);
        }
    };

    const quickAmounts = [
        { label: 'MIN', value: 0.25 },
        { label: 'HALF', value: 0.5 },
        { label: 'FULL', value: 1.0 },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-xl glass-card p-0 overflow-hidden shadow-2xl shadow-indigo-500/10 border-indigo-500/20">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <CreditCard size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Record Collection</h2>
                            <p className="text-xs text-slate-500 font-medium">Session ID: {new Date().getTime().toString().slice(-8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all outline-none">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="p-8 space-y-8">
                    {/* Student Snapshot */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Student</p>
                            <p className="text-sm font-bold text-white uppercase">{student.name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Due Amount + Penalty</p>
                            <p className="text-base font-black text-rose-400">₹{student.pending?.toLocaleString()} <span className="text-xs text-rose-500 font-bold">+ ₹{penalty.toLocaleString()}</span></p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Total: ₹{(student.pending + penalty).toLocaleString()}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSumbit} className="space-y-6">
                        {/* Amount Entry */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collection Amount (₹)</label>
                                <div className="flex gap-1">
                                    {quickAmounts.map(q => (
                                        <button key={q.label} type="button" onClick={() => setPaymentData(d => ({ ...d, amount: Math.round((student.pending + penalty) * q.value) }))}
                                            className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all uppercase">
                                            {q.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input type="number" value={paymentData.amount} onChange={e => setPaymentData(d => ({ ...d, amount: Number(e.target.value) }))}
                                className="w-full text-2xl font-black bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-800"
                                placeholder="0.00" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             {/* Method */}
                             <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Method</label>
                                <select value={paymentData.paymentMethod} onChange={e => setPaymentData(d => ({ ...d, paymentMethod: e.target.value }))}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs font-bold text-white focus:border-indigo-500/50 outline-none uppercase tracking-widest appearance-none cursor-pointer">
                                    <option className="bg-slate-900" value="Cash">Cash</option>
                                    <option className="bg-slate-900" value="UPI">UPI / Digital</option>
                                    <option className="bg-slate-900" value="Card">Bank Card</option>
                                    <option className="bg-slate-900" value="Cheque">Bank Cheque</option>
                                </select>
                             </div>
                             {/* Date */}
                             <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Value Date</label>
                                <input type="date" value={paymentData.paymentDate} onChange={e => setPaymentData(d => ({ ...d, paymentDate: e.target.value }))}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs font-bold text-white focus:border-indigo-500/50 outline-none uppercase tracking-widest" />
                             </div>
                        </div>

                        {/* Transaction Detail */}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Internal Reference / TXN ID</label>
                            <div className="relative">
                                <MessageSquare size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input type="text" value={paymentData.transactionId} onChange={e => setPaymentData(d => ({ ...d, transactionId: e.target.value }))}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-white focus:border-indigo-500/50 outline-none" placeholder="REF-XXXX..." />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Action Footer */}
                <div className="p-6 bg-indigo-600/5 border-t border-white/10 flex flex-col gap-3">
                    <div className="flex gap-4">
                        <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all bg-white/[0.03] rounded-2xl border border-white/5">
                            Discard
                        </button>
                        <button onClick={handleSumbit} disabled={paymentData.amount <= 0 || paymentData.amount > student.pending || isProcessing}
                            className={`flex-[2] py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]
                                ${paymentData.amount <= 0 || paymentData.amount > (student.pending + penalty) || isProcessing
                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                            {isProcessing ? 'Processing...' : 'Commit & Receipt'}
                        </button>
                    </div>
                    
                    {/* Razorpay Integration */}
                    <button 
                        onClick={handleOnlinePayment}
                        disabled={paymentData.amount <= 0 || paymentData.amount > (student.pending + penalty) || isProcessing}
                        className={`w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center gap-3 group relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-blue-600/20
                            ${paymentData.amount <= 0 || paymentData.amount > (student.pending + penalty) || isProcessing ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                        {isProcessing ? <Loader size={18} className="animate-spin" /> : <Zap size={18} className="text-white animate-pulse" />}
                        <span className="text-xs font-black uppercase tracking-[0.25em]">Online Payment Gateway (Razorpay)</span>
                        <ArrowRight size={16} className="text-white/50 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
});
StudentPaymentModal.displayName = 'StudentPaymentModal';

export { FeesListBox, StudentPaymentModal };
