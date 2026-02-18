import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Worker, User } from '../types';
import { StorageService } from '../services/storage';
import { PERMISSIONS, BANKS } from '../constants';

interface WorkersProps {
  workers: Worker[];
  onUpdate: () => void;
  currentUser?: User;
}

export const Workers: React.FC<WorkersProps> = ({ workers, onUpdate, currentUser }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Partial<Worker>>({});
  const [branches, setBranches] = useState<{name: string}[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
     setBranches(StorageService.getBranches());
  }, []);

  // Manager is the only one who can add/delete. Supervisors can only view/edit if permitted.
  const isManager = currentUser?.role === 'manager';
  const canEdit = isManager || (currentUser?.role === 'supervisor' && currentUser?.permissions?.includes(PERMISSIONS.MANAGE_WORKERS));

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!editingWorker.name) newErrors.name = "يجب إدخال اسم الموظف";
    if (!editingWorker.iqama) newErrors.iqama = "يجب إدخال رقم الإقامة";
    if (!editingWorker.mobile) newErrors.mobile = "يجب إدخال رقم الجوال";
    if (!editingWorker.branch) newErrors.branch = "يجب تحديد الفرع";
    if (!editingWorker.baseSalary || editingWorker.baseSalary <= 0) newErrors.baseSalary = "الراتب الأساسي مطلوب";
    if (!editingWorker.payDay || editingWorker.payDay < 1 || editingWorker.payDay > 30) newErrors.payDay = "يجب تحديد يوم الصرف (1-30)";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
        const firstError = Object.values(errors)[0] || "يرجى إكمال البيانات المطلوبة";
        StorageService.addNotification('خطأ في البيانات', `فشل حفظ الموظف: ${firstError}`, 'warning', 'system');
        return;
    }

    if (StorageService.isUsernameTaken(editingWorker.iqama!, editingWorker.id)) {
        alert("اسم المستخدم (رقم الإقامة) هذا مستخدم مسبقاً في النظام");
        return;
    }

    const newWorker: Worker = {
        id: editingWorker.id || Date.now().toString(),
        name: editingWorker.name!,
        branch: editingWorker.branch || (branches[0]?.name || 'Main'),
        jobTitle: editingWorker.jobTitle || 'موظف',
        iqama: editingWorker.iqama!,
        iqamaExpiryDate: editingWorker.iqamaExpiryDate || '',
        mobile: editingWorker.mobile!,
        password: editingWorker.password || (editingWorker.id ? undefined : editingWorker.mobile!), 
        bankName: editingWorker.bankName || '',
        accountNumber: editingWorker.accountNumber || '',
        joinDate: editingWorker.joinDate || new Date().toISOString(),
        payDay: Number(editingWorker.payDay) || 28,
        baseSalary: Number(editingWorker.baseSalary) || 3000,
        housingAllowance: Number(editingWorker.housingAllowance) || 0,
        transportAllowance: Number(editingWorker.transportAllowance) || 0,
        photo: editingWorker.photo || '',
        activeLoan: Number(editingWorker.activeLoan) || 0,
        absencesThisMonth: editingWorker.absencesThisMonth || 0,
        overtimeHours: editingWorker.overtimeHours || 0,
        payments: editingWorker.payments || []
    };
    
    StorageService.saveWorker(newWorker);
    StorageService.logAction(editingWorker.id ? 'UPDATE_WORKER' : 'CREATE_WORKER', currentUser?.id || 'system', `تم حفظ بيانات الموظف ${newWorker.name} بواسطة ${currentUser?.name}`);
    setIsFormOpen(false);
    setEditingWorker({});
    setErrors({});
    onUpdate();
  };

  const handleDelete = (id: string, name: string) => {
    if (!isManager) return;
    if (confirm(`هل أنت متأكد من حذف الموظف ${name} نهائياً؟`)) {
        StorageService.deleteWorker(id);
        StorageService.logAction('DELETE_WORKER', currentUser?.id || 'system', `حذف الموظف ${name}`);
        onUpdate();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingWorker({...editingWorker, photo: reader.result as string});
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-3xl font-black text-white">إدارة القوى العاملة</h2>
            <p className="text-gray-400 text-sm">إدارة السجلات، الرواتب، والبيانات البنكية</p>
         </div>
         {isManager && (
             <button 
               onClick={() => { setEditingWorker({ branch: branches[0]?.name }); setIsFormOpen(true); setErrors({}); }}
               className="px-8 py-3 bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-2xl text-white font-bold flex items-center shadow-xl shadow-blue-500/30 transition-all active:scale-95"
             >
               <i className="fa-solid fa-user-plus ml-2"></i> 
               <span>إضافة موظف جديد</span>
             </button>
         )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {workers.map(worker => (
             <GlassCard key={worker.id} className="relative group border-white/5 hover:border-blue-500/40 transition-all duration-300 overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                    {canEdit && (
                        <button 
                          onClick={() => { setEditingWorker(worker); setIsFormOpen(true); setErrors({}); }}
                          className="p-2.5 bg-blue-500/20 hover:bg-blue-500 text-white rounded-xl backdrop-blur-md"
                        >
                            <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                    )}
                    {isManager && (
                        <button 
                          onClick={() => handleDelete(worker.id, worker.name)}
                          className="p-2.5 bg-red-500/20 hover:bg-red-500 text-white rounded-xl backdrop-blur-md"
                        >
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                    )}
                </div>
                
                <div className="w-24 h-24 rounded-3xl bg-slate-800 overflow-hidden mb-4 border-2 border-white/10 shadow-2xl group-hover:border-blue-500/50 transition-colors">
                  {worker.photo ? <img src={worker.photo} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user-astronaut text-4xl text-gray-700 mt-6 block"></i>}
                </div>
                <h3 className="font-bold text-white text-lg truncate w-full px-2">{worker.name}</h3>
                <p className="text-blue-400 text-xs font-bold mb-4 uppercase tracking-tighter">{worker.jobTitle}</p>
                
                <div className="w-full space-y-2 mb-4">
                   <div className="bg-white/5 p-2 rounded-xl flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">اسم المستخدم:</span>
                      <span className="text-white font-mono">{worker.iqama}</span>
                   </div>
                   <div className="bg-white/5 p-2 rounded-xl flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">الفرع:</span>
                      <span className="text-white truncate max-w-[100px]">{worker.branch}</span>
                   </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 w-full">
                   <p className="text-[10px] text-emerald-400 font-bold">الأساسي: {worker.baseSalary.toLocaleString()} ريال</p>
                </div>
             </GlassCard>
          ))}
       </div>

       {isFormOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in">
               <div className="glass-panel w-full max-w-4xl rounded-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border-white/20">
                   <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0f172a]/95">
                       <div>
                          <h3 className="text-xl font-bold text-white tracking-tight">{editingWorker.id ? 'تحديث ملف الموظف' : 'إنشاء سجل موظف جديد'}</h3>
                          <p className="text-xs text-gray-500 mt-1">تنبيه: الحقول المميزة باللون الأزرق ضرورية لحفظ الملف</p>
                       </div>
                       <button onClick={() => setIsFormOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-500 transition-all">
                           <i className="fa-solid fa-times text-xl"></i>
                       </button>
                   </div>
                   
                   <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                       {/* Basic Info */}
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest border-r-2 border-blue-500 pr-2">البيانات الأساسية</h4>
                          
                          <div className="space-y-1">
                            <label className={`text-[10px] mb-1.5 block font-bold ${errors.name ? 'text-red-400' : 'text-gray-500'}`}>الاسم الكامل *</label>
                            <input 
                              className={`glass-input w-full p-3 rounded-xl text-sm ${errors.name ? 'border-red-500/50 bg-red-500/5' : ''}`} 
                              value={editingWorker.name || ''} 
                              onChange={e => { setEditingWorker({...editingWorker, name: e.target.value}); if(errors.name) setErrors({...errors, name: ''}); }} 
                            />
                            {errors.name && <p className="text-[9px] text-red-400 mt-1">{errors.name}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className={`text-[10px] mb-1.5 block font-bold ${errors.iqama ? 'text-red-400' : 'text-emerald-400'}`}>رقم الإقامة (اسم المستخدم) *</label>
                            <input 
                              className={`glass-input w-full p-3 rounded-xl text-sm border-emerald-500/20 ${errors.iqama ? 'border-red-500/50 bg-red-500/5' : ''}`} 
                              value={editingWorker.iqama || ''} 
                              onChange={e => { setEditingWorker({...editingWorker, iqama: e.target.value}); if(errors.iqama) setErrors({...errors, iqama: ''}); }} 
                            />
                            {errors.iqama && <p className="text-[9px] text-red-400 mt-1">{errors.iqama}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className={`text-[10px] mb-1.5 block font-bold ${errors.mobile ? 'text-red-400' : 'text-gray-500'}`}>رقم الجوال *</label>
                            <input 
                              className={`glass-input w-full p-3 rounded-xl text-sm ${errors.mobile ? 'border-red-500/50 bg-red-500/5' : ''}`} 
                              value={editingWorker.mobile || ''} 
                              onChange={e => { setEditingWorker({...editingWorker, mobile: e.target.value}); if(errors.mobile) setErrors({...errors, mobile: ''}); }} 
                            />
                            {errors.mobile && <p className="text-[9px] text-red-400 mt-1">{errors.mobile}</p>}
                          </div>

                          <div>
                            <label className="text-[10px] text-gray-500 mb-1.5 block font-bold">المسمى الوظيفي</label>
                            <input className="glass-input w-full p-3 rounded-xl text-sm" value={editingWorker.jobTitle || ''} onChange={e => setEditingWorker({...editingWorker, jobTitle: e.target.value})} />
                          </div>
                       </div>

                       {/* Employment Details */}
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest border-r-2 border-amber-500 pr-2">بيانات العمل والمالية</h4>
                          
                          <div className="space-y-1">
                            <label className={`text-[10px] mb-1.5 block font-bold ${errors.branch ? 'text-red-400' : 'text-gray-500'}`}>الفرع *</label>
                             <select 
                               className={`glass-input w-full p-3 rounded-xl bg-slate-900 text-sm ${errors.branch ? 'border-red-500/50 bg-red-500/5' : ''}`} 
                               value={editingWorker.branch} 
                               onChange={e => { setEditingWorker({...editingWorker, branch: e.target.value}); if(errors.branch) setErrors({...errors, branch: ''}); }}
                             >
                                 <option value="">-- اختر الفرع --</option>
                                 {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                             </select>
                             {errors.branch && <p className="text-[9px] text-red-400 mt-1">{errors.branch}</p>}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                               <label className={`text-[10px] mb-1.5 block font-bold ${errors.baseSalary ? 'text-red-400' : 'text-gray-500'}`}>الراتب الأساسي *</label>
                               <input 
                                 type="number" 
                                 className={`glass-input w-full p-3 rounded-xl text-sm ${errors.baseSalary ? 'border-red-500/50 bg-red-500/5' : ''}`} 
                                 value={editingWorker.baseSalary || ''} 
                                 onChange={e => { setEditingWorker({...editingWorker, baseSalary: Number(e.target.value)}); if(errors.baseSalary) setErrors({...errors, baseSalary: ''}); }} 
                               />
                             </div>
                             <div className="space-y-1">
                               <label className={`text-[10px] mb-1.5 block font-bold ${errors.payDay ? 'text-red-400' : 'text-gray-500'}`}>يوم الراتب *</label>
                               <input 
                                 type="number" 
                                 placeholder="1-30"
                                 className={`glass-input w-full p-3 rounded-xl text-sm ${errors.payDay ? 'border-red-500/50 bg-red-500/5' : ''}`} 
                                 value={editingWorker.payDay || ''} 
                                 onChange={e => { setEditingWorker({...editingWorker, payDay: Number(e.target.value)}); if(errors.payDay) setErrors({...errors, payDay: ''}); }} 
                               />
                             </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-gray-500 mb-1.5 block font-bold">تاريخ انتهاء الإقامة</label>
                            <input type="date" className="glass-input w-full p-3 rounded-xl text-sm" value={editingWorker.iqamaExpiryDate || ''} onChange={e => setEditingWorker({...editingWorker, iqamaExpiryDate: e.target.value})} />
                          </div>

                          <div className="pt-2">
                            <label className="text-[10px] text-gray-500 mb-2 block font-bold">صورة الموظف</label>
                            <label className="flex items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-2xl hover:bg-white/5 cursor-pointer transition-all">
                                <i className="fa-solid fa-cloud-arrow-up text-xl text-gray-600 ml-3"></i>
                                <span className="text-xs text-gray-400">انقر لرفع صورة</span>
                                <input type="file" onChange={handleFileUpload} className="hidden" />
                            </label>
                          </div>
                       </div>
                       
                       {/* Bank & Allowances */}
                       <div className="md:col-span-2 border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest border-r-2 border-emerald-500 pr-2">البنك والتحويل (اختياري)</h4>
                              <div><label className="text-[10px] text-gray-500 mb-1.5 block font-bold">اسم البنك</label>
                                 <select className="glass-input w-full p-3 rounded-xl bg-slate-900 text-sm" value={editingWorker.bankName} onChange={e => setEditingWorker({...editingWorker, bankName: e.target.value})}>
                                    <option value="">-- اختر البنك --</option>
                                    {BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                                 </select>
                              </div>
                              <div><label className="text-[10px] text-gray-500 mb-1.5 block font-bold">رقم الحساب (IBAN)</label><input className="glass-input w-full p-3 rounded-xl text-sm font-mono" value={editingWorker.accountNumber || ''} onChange={e => setEditingWorker({...editingWorker, accountNumber: e.target.value})} placeholder="SA..." /></div>
                          </div>
                          <div className="space-y-6">
                              <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest border-r-2 border-purple-500 pr-2">البدلات الثابتة</h4>
                              <div className="grid grid-cols-2 gap-4">
                                 <div><label className="text-[10px] text-gray-500 mb-1.5 block font-bold">بدل سكن</label><input type="number" className="glass-input w-full p-3 rounded-xl text-sm" value={editingWorker.housingAllowance || ''} onChange={e => setEditingWorker({...editingWorker, housingAllowance: Number(e.target.value)})} /></div>
                                 <div><label className="text-[10px] text-gray-500 mb-1.5 block font-bold">بدل نقل</label><input type="number" className="glass-input w-full p-3 rounded-xl text-sm" value={editingWorker.transportAllowance || ''} onChange={e => setEditingWorker({...editingWorker, transportAllowance: Number(e.target.value)})} /></div>
                              </div>
                          </div>
                       </div>
                   </div>
                   
                   {/* Footer Actions */}
                   <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0f172a]/95">
                       <button 
                         onClick={() => setIsFormOpen(false)} 
                         className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 font-bold transition-all"
                       >
                         إلغاء التعديل
                       </button>
                       <button 
                         onClick={handleSave} 
                         className="px-12 py-4 bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-2xl text-white font-black shadow-2xl shadow-blue-500/20 transition-all transform active:scale-95 flex items-center"
                       >
                          <i className="fa-solid fa-cloud-arrow-up ml-3 text-lg"></i>
                          حفظ الملف الشخصي
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};