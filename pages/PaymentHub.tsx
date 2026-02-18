import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Worker, Payment } from '../types';
import { StorageService } from '../services/storage';

interface PaymentHubProps {
  workers: Worker[];
  onUpdate: () => void;
}

export const PaymentHub: React.FC<PaymentHubProps> = ({ workers, onUpdate }) => {
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    absenceAmount: 0,
    loanDeduction: 0,
    bonuses: 0,
    overtimeHours: 0,
    notes: '',
  });

  const today = new Date();
  const currentDay = today.getDate();

  const dueWorkers = workers.filter(w => {
    const lastPayment = w.payments?.[w.payments.length - 1];
    if (lastPayment) {
      const lastDate = new Date(lastPayment.date);
      if (lastDate.getMonth() === today.getMonth() && lastDate.getFullYear() === today.getFullYear()) {
        return false;
      }
    }
    const diff = w.payDay - currentDay;
    return diff <= 5; // Extended window for better visibility
  }).sort((a, b) => a.payDay - b.payDay);

  const handleOpenPayment = (worker: Worker) => {
    setSelectedWorker(worker);
    // Auto-calculate suggested absence deduction
    const dailyRate = worker.baseSalary / 30;
    const suggestedAbsence = worker.absencesThisMonth * dailyRate;

    setPaymentForm({
      absenceAmount: Math.round(suggestedAbsence),
      loanDeduction: worker.activeLoan > 0 ? Math.round(worker.activeLoan * 0.15) : 0, 
      bonuses: 0,
      overtimeHours: worker.overtimeHours,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const calculateTotals = () => {
    if (!selectedWorker) return { earnings: 0, deductions: 0, net: 0, overtimePay: 0 };
    
    const dailyRate = selectedWorker.baseSalary / 30;
    const hourlyRate = dailyRate / 8;
    const overtimePay = paymentForm.overtimeHours * hourlyRate * 1.5;
    
    const earnings = selectedWorker.baseSalary + selectedWorker.housingAllowance + selectedWorker.transportAllowance + overtimePay + paymentForm.bonuses;
    const deductions = paymentForm.absenceAmount + paymentForm.loanDeduction;

    return {
      earnings,
      deductions,
      net: earnings - deductions,
      overtimePay
    };
  };

  const totals = calculateTotals();

  const handleConfirmPayment = () => {
    if (!selectedWorker) return;

    const payment: Payment = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount: totals.net,
      type: 'SALARY',
      details: {
        baseSalary: selectedWorker.baseSalary,
        housing: selectedWorker.housingAllowance,
        transport: selectedWorker.transportAllowance,
        overtime: totals.overtimePay,
        bonuses: paymentForm.bonuses,
        absencesDeduction: paymentForm.absenceAmount,
        loanDeduction: paymentForm.loanDeduction,
        notes: paymentForm.notes
      }
    };

    const updatedWorker = { ...selectedWorker };
    updatedWorker.payments = [...(updatedWorker.payments || []), payment];
    updatedWorker.activeLoan = Math.max(0, updatedWorker.activeLoan - paymentForm.loanDeduction);
    updatedWorker.absencesThisMonth = 0;
    updatedWorker.overtimeHours = 0;

    StorageService.saveWorker(updatedWorker);
    StorageService.logAction('PAYMENT', 'manager', `تم صرف راتب ${updatedWorker.name} بمبلغ ${totals.net.toLocaleString()}`);
    
    setIsModalOpen(false);
    onUpdate();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">نافذة الصرف الذكي</h2>
        <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 text-xs">
           <i className="fa-solid fa-calendar-check ml-2"></i>
           تاريخ اليوم: {today.toLocaleDateString('ar-SA')}
        </div>
      </div>
      
      {dueWorkers.length === 0 ? (
        <GlassCard className="text-center py-20">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
            <i className="fa-solid fa-circle-check text-5xl text-emerald-400 animate-bounce"></i>
          </div>
          <h3 className="text-2xl font-bold text-white">المسير مكتمل تماماً</h3>
          <p className="text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">لا يوجد رواتب مستحقة حالياً. جميع الموظفين استلموا مستحقاتهم لهذا الشهر.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dueWorkers.map(worker => {
             const diff = worker.payDay - currentDay;
             const isLate = diff < 0;
             const statusColor = isLate ? 'text-red-400' : diff === 0 ? 'text-emerald-400' : 'text-blue-400';
             
             return (
               <GlassCard key={worker.id} className={`relative group transition-all duration-300 border-r-4 ${isLate ? 'border-r-red-500' : 'border-r-blue-500'} hover:scale-[1.02]`}>
                 <div className="absolute top-4 left-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 ${statusColor}`}>
                       {isLate ? `متأخر ${Math.abs(diff)} يوم` : diff === 0 ? 'يستحق اليوم' : `متبقي ${diff} أيام`}
                    </span>
                 </div>
                 <div className="flex items-center space-x-4 space-x-reverse mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden shadow-lg">
                     {worker.photo ? <img src={worker.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><i className="fa-solid fa-user-tie text-2xl"></i></div>}
                   </div>
                   <div>
                     <h3 className="font-bold text-white text-lg">{worker.name}</h3>
                     <p className="text-xs text-blue-400 font-medium">{worker.jobTitle}</p>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                    <div className="bg-white/5 p-3 rounded-xl">
                       <p className="text-gray-500 mb-1">الأساسي</p>
                       <p className="text-white font-bold">{worker.baseSalary.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                       <p className="text-gray-500 mb-1">السلف</p>
                       <p className="text-amber-400 font-bold">{worker.activeLoan.toLocaleString()}</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => handleOpenPayment(worker)}
                   className="w-full py-3.5 bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center"
                 >
                   <i className="fa-solid fa-money-check-dollar ml-2"></i>
                   فتح مسير الراتب
                 </button>
               </GlassCard>
             );
          })}
        </div>
      )}

      {/* Modern Payment Modal */}
      {isModalOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-4xl rounded-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border-white/20">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-blue-600/5">
              <div>
                 <h3 className="text-xl font-bold text-white">إعداد مسير راتب: {selectedWorker.name}</h3>
                 <p className="text-xs text-gray-400 mt-1">الموظف في فرع: {selectedWorker.branch}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Left Column: Input */}
                 <div className="space-y-6">
                    <section>
                       <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 border-r-2 border-emerald-500 pr-2">الاستحقاقات والإضافات</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <label className="text-[10px] text-gray-500 block mb-2">إضافي (ساعات)</label>
                             <input 
                               type="number" 
                               value={paymentForm.overtimeHours}
                               onChange={e => setPaymentForm({...paymentForm, overtimeHours: Number(e.target.value)})}
                               className="w-full bg-transparent border-b border-blue-500/30 focus:border-blue-500 text-white font-bold outline-none pb-1"
                             />
                             <p className="text-[10px] text-emerald-500 mt-1">+{totals.overtimePay.toFixed(0)} ريال</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <label className="text-[10px] text-gray-500 block mb-2">مكافآت / أخرى</label>
                             <input 
                               type="number" 
                               value={paymentForm.bonuses}
                               onChange={e => setPaymentForm({...paymentForm, bonuses: Number(e.target.value)})}
                               className="w-full bg-transparent border-b border-blue-500/30 focus:border-blue-500 text-white font-bold outline-none pb-1"
                             />
                          </div>
                       </div>
                    </section>

                    <section>
                       <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 border-r-2 border-red-500 pr-2">الخصومات والاستقطاعات</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <label className="text-[10px] text-gray-500 block mb-2">مبلغ خصم الغياب (ريال)</label>
                             <input 
                               type="number" 
                               value={paymentForm.absenceAmount}
                               onChange={e => setPaymentForm({...paymentForm, absenceAmount: Number(e.target.value)})}
                               className="w-full bg-transparent border-b border-red-500/30 focus:border-red-500 text-white font-bold outline-none pb-1"
                             />
                             <p className="text-[10px] text-gray-500 mt-1">عدد أيام الغياب: {selectedWorker.absencesThisMonth}</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <label className="text-[10px] text-gray-500 block mb-2">سداد سلفة (ريال)</label>
                             <input 
                               type="number" 
                               value={paymentForm.loanDeduction}
                               onChange={e => setPaymentForm({...paymentForm, loanDeduction: Number(e.target.value)})}
                               className="w-full bg-transparent border-b border-red-500/30 focus:border-red-500 text-white font-bold outline-none pb-1"
                             />
                             <p className="text-[10px] text-amber-500 mt-1">المتبقي: {selectedWorker.activeLoan.toLocaleString()}</p>
                          </div>
                       </div>
                    </section>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <label className="text-[10px] text-gray-500 block mb-2">ملاحظات تظهر في القسيمة</label>
                        <textarea 
                          value={paymentForm.notes}
                          onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                          className="w-full bg-transparent text-gray-200 text-sm outline-none resize-none h-16"
                          placeholder="مثال: مكافأة الأداء المتميز لشهر يونيو..."
                        />
                    </div>
                 </div>

                 {/* Right Column: Visual Summary */}
                 <div className="bg-slate-900/60 rounded-3xl p-6 border border-white/10 flex flex-col h-full">
                    <h4 className="text-sm font-bold text-white mb-6 flex items-center">
                       <i className="fa-solid fa-calculator ml-2 text-blue-400"></i>
                       تفصيل الراتب النهائي
                    </h4>
                    
                    <div className="space-y-4 flex-1">
                       <div className="flex justify-between items-center text-sm text-gray-400">
                          <span>الراتب الأساسي</span>
                          <span className="text-white font-mono">{selectedWorker.baseSalary.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm text-gray-400">
                          <span>البدلات (سكن + نقل)</span>
                          <span className="text-white font-mono">{(selectedWorker.housingAllowance + selectedWorker.transportAllowance).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm text-emerald-400">
                          <span>الإضافي والمكافآت</span>
                          <span className="font-mono">+{(totals.overtimePay + paymentForm.bonuses).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm text-red-400 border-b border-white/5 pb-4">
                          <span>إجمالي الخصومات</span>
                          <span className="font-mono">-{(paymentForm.absenceAmount + paymentForm.loanDeduction).toLocaleString()}</span>
                       </div>
                       
                       <div className="pt-6">
                          <p className="text-xs text-blue-400 font-bold mb-1">صافي المبلغ للتحويل</p>
                          <div className="text-5xl font-bold text-white font-mono tracking-tighter">
                             {totals.net.toLocaleString()}
                             <span className="text-sm text-gray-500 mr-2">SAR</span>
                          </div>
                       </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                       <button 
                         onClick={handleConfirmPayment}
                         className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center group"
                       >
                         <i className="fa-solid fa-file-invoice-dollar ml-2 group-hover:scale-110 transition-transform"></i>
                         اعتماد الصرف وإصدار القسيمة
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};