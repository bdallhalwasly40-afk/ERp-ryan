import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Worker, User, WorkerRequest } from '../types';
import { StorageService } from '../services/storage';

interface WorkerHomeProps {
  user: User;
}

export const WorkerHome: React.FC<WorkerHomeProps> = ({ user }) => {
  const [worker, setWorker] = useState<Worker | undefined>(undefined);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState<Partial<WorkerRequest>>({ type: 'LOAN', reason: '', amount: 0 });

  useEffect(() => {
    const data = StorageService.getWorkers().find(w => w.id === user.id);
    setWorker(data);
  }, [user.id]);

  if (!worker) return <div className="p-10 text-center animate-pulse">جاري تحميل بياناتك الآمنة...</div>;

  const today = new Date();
  const daysToPay = worker.payDay - today.getDate() + (today.getDate() > worker.payDay ? 30 : 0);

  const handleSendRequest = () => {
      if (!requestForm.reason) return alert('يرجى توضيح السبب');
      
      const newRequest: WorkerRequest = {
          id: Date.now().toString(),
          type: requestForm.type as any,
          status: 'PENDING',
          date: new Date().toISOString(),
          amount: requestForm.amount,
          reason: requestForm.reason!
      };

      const updated = { ...worker, requests: [...(worker.requests || []), newRequest] };
      StorageService.saveWorker(updated);
      StorageService.addNotification('طلب جديد', `الموظف ${worker.name} قدم طلب ${requestForm.type}`, 'info', 'loan', 'dashboard');
      setShowRequestModal(false);
      setWorker(updated);
      alert('تم إرسال طلبك للإدارة بنجاح');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
       {/* Greeting Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
             <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border-2 border-blue-500/30 overflow-hidden shadow-2xl">
                {worker.photo ? <img src={worker.photo} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user-tie text-4xl text-blue-400 flex items-center justify-center h-full"></i>}
             </div>
             <div>
                <h1 className="text-3xl font-black text-white">أهلاً، {worker.name}</h1>
                <p className="text-blue-400 font-bold text-sm flex items-center mt-1">
                   <i className="fa-solid fa-briefcase ml-2"></i> {worker.jobTitle} في {worker.branch}
                </p>
             </div>
          </div>
          <button 
             onClick={() => setShowRequestModal(true)}
             className="px-8 py-3 bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
          >
             <i className="fa-solid fa-paper-plane ml-2"></i> تقديم طلب جديد
          </button>
       </div>

       {/* Top Metrics */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="border-r-4 border-r-blue-500">
             <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">العد التنازلي للراتب</p>
             <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-white">{daysToPay}</h3>
                <span className="text-xs text-gray-500 mb-1.5 font-bold">أيام متبقية</span>
             </div>
          </GlassCard>

          <GlassCard className="border-r-4 border-r-emerald-500">
             <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">الراتب الأساسي</p>
             <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-white">{worker.baseSalary.toLocaleString()}</h3>
                <span className="text-xs text-gray-500 mb-1.5 font-bold">ريال</span>
             </div>
          </GlassCard>

          <GlassCard className="border-r-4 border-r-amber-500">
             <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1">السلف القائمة</p>
             <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-white">{worker.activeLoan.toLocaleString()}</h3>
                <span className="text-xs text-gray-500 mb-1.5 font-bold">ريال</span>
             </div>
          </GlassCard>

          <GlassCard className="border-r-4 border-r-red-500">
             <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">أيام الغياب (الشهر)</p>
             <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-white">{worker.absencesThisMonth}</h3>
                <span className="text-xs text-gray-500 mb-1.5 font-bold">أيام</span>
             </div>
          </GlassCard>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Payments Section */}
          <div className="lg:col-span-2 space-y-6">
             <GlassCard title="سجل الرواتب الأخيرة">
                <div className="space-y-4 mt-4">
                   {(!worker.payments || worker.payments.length === 0) ? (
                      <div className="p-10 text-center opacity-30"><i className="fa-solid fa-receipt text-5xl mb-4"></i><p>لا توجد دفعات مسجلة بعد</p></div>
                   ) : (
                      worker.payments.slice(-5).reverse().map(p => (
                         <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400">
                                  <i className="fa-solid fa-wallet"></i>
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-white">راتب شهر {new Date(p.date).toLocaleString('ar-SA', {month:'long'})}</p>
                                  <p className="text-[10px] text-gray-500">تم الإيداع في: {new Date(p.date).toLocaleDateString('ar-SA')}</p>
                               </div>
                            </div>
                            <div className="text-left">
                               <p className="text-lg font-black text-emerald-400">{p.amount.toLocaleString()} <span className="text-[10px] text-gray-500">ريال</span></p>
                               <button className="text-[10px] text-blue-400 hover:underline">تحميل القسيمة</button>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </GlassCard>

             <GlassCard title="طلباتي السابقة">
                 <div className="mt-4 space-y-3">
                    {worker.requests?.length === 0 ? (
                        <p className="text-center text-xs text-gray-500 py-6">لم تقدم أي طلبات حتى الآن</p>
                    ) : (
                        worker.requests?.slice(-3).reverse().map(r => (
                            <div key={r.id} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                                        r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 
                                        r.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>{r.status === 'APPROVED' ? 'مقبول' : r.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}</span>
                                    <p className="text-xs font-bold text-white">{r.type === 'LOAN' ? 'سلفة مالية' : r.type === 'VACATION' ? 'إجازة' : 'تعريف راتب'}</p>
                                </div>
                                <span className="text-[10px] text-gray-500">{new Date(r.date).toLocaleDateString('ar-SA')}</span>
                            </div>
                        ))
                    )}
                 </div>
             </GlassCard>
          </div>

          {/* Bank Info Sidebar */}
          <div className="space-y-6">
             <GlassCard title="معلومات الحساب البنكي">
                <div className="mt-4 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-gray-400"><i className="fa-solid fa-building-columns"></i></div>
                      <div>
                         <p className="text-[10px] text-gray-500 uppercase font-bold">اسم البنك</p>
                         <p className="text-sm font-bold text-white">{worker.bankName || 'غير محدد'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-gray-400"><i className="fa-solid fa-credit-card"></i></div>
                      <div className="flex-1 min-w-0">
                         <p className="text-[10px] text-gray-500 uppercase font-bold">رقم الحساب (IBAN)</p>
                         <p className="text-xs font-mono text-white break-all">{worker.accountNumber || 'غير محدد'}</p>
                      </div>
                   </div>
                   <p className="text-[9px] text-amber-500/60 leading-relaxed bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                      <i className="fa-solid fa-circle-info ml-1"></i>
                      في حال رغبتك بتغيير الحساب البنكي، يرجى تقديم "طلب جديد" للإدارة وإرفاق صورة الآيبان الجديد.
                   </p>
                </div>
             </GlassCard>

             <GlassCard title="إضافات الحضور">
                <div className="grid grid-cols-1 gap-4 mt-4">
                   <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-center">
                      <p className="text-[10px] text-emerald-400 font-bold mb-1">الإضافي</p>
                      <p className="text-2xl font-black text-white">{worker.overtimeHours}</p>
                      <p className="text-[9px] text-gray-500 uppercase">ساعة</p>
                   </div>
                </div>
             </GlassCard>
          </div>
       </div>

       {/* Request Modal */}
       {showRequestModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in">
               <div className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
                   <div className="p-6 border-b border-white/5 flex justify-between items-center">
                       <h3 className="text-xl font-bold text-white">إرسال طلب رسمي</h3>
                       <button onClick={() => setShowRequestModal(false)} className="text-gray-500 hover:text-white"><i className="fa-solid fa-times"></i></button>
                   </div>
                   <div className="p-6 space-y-6">
                       <div>
                           <label className="text-xs text-gray-500 font-bold mb-2 block uppercase">نوع الطلب</label>
                           <select 
                             className="w-full glass-input p-3 rounded-xl text-sm"
                             value={requestForm.type}
                             onChange={e => setRequestForm({...requestForm, type: e.target.value as any})}
                           >
                               <option value="LOAN">سلفة مالية</option>
                               <option value="VACATION">طلب إجازة</option>
                               <option value="CERTIFICATE">شهادة تعريف راتب</option>
                           </select>
                       </div>
                       {requestForm.type === 'LOAN' && (
                           <div>
                               <label className="text-xs text-gray-500 font-bold mb-2 block uppercase">المبلغ المطلوب</label>
                               <input 
                                 type="number" 
                                 className="w-full glass-input p-3 rounded-xl text-sm"
                                 value={requestForm.amount || ''}
                                 onChange={e => setRequestForm({...requestForm, amount: Number(e.target.value)})}
                               />
                           </div>
                       )}
                       <div>
                           <label className="text-xs text-gray-500 font-bold mb-2 block uppercase">توضيح السبب / ملاحظات</label>
                           <textarea 
                             className="w-full glass-input p-3 rounded-xl text-sm h-24 resize-none"
                             value={requestForm.reason}
                             onChange={e => setRequestForm({...requestForm, reason: e.target.value})}
                             placeholder="اكتب تفاصيل طلبك هنا..."
                           />
                       </div>
                       <button 
                         onClick={handleSendRequest}
                         className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all"
                       >
                           إرسال الطلب الآن
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};