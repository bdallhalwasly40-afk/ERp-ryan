import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Supervisor } from '../types';
import { StorageService } from '../services/storage';
import { PERMISSIONS } from '../constants';

export const UserManagement: React.FC = () => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSupervisors(StorageService.getSupervisors());
  };

  const handleApprove = (id: string, currentStatus: boolean) => {
    StorageService.approveSupervisor(id, !currentStatus);
    StorageService.logAction('USER_MGMT', 'manager', `${!currentStatus ? 'Approved' : 'Suspended'} supervisor ${id}`);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المشرف نهائياً؟')) {
      StorageService.deleteSupervisor(id);
      loadData();
    }
  };

  const togglePermission = (supervisor: Supervisor, perm: string) => {
    const currentPerms = supervisor.permissions || [];
    let newPerms = [];
    if (currentPerms.includes(perm)) {
        newPerms = currentPerms.filter(p => p !== perm);
    } else {
        newPerms = [...currentPerms, perm];
    }
    StorageService.updateSupervisorPermissions(supervisor.id, newPerms);
    loadData();
  };

  const permissionLabels: Record<string, { label: string, icon: string, color: string }> = {
      [PERMISSIONS.MANAGE_WORKERS]: { label: 'إدارة الموظفين (إضافة/تعديل/حذف)', icon: 'fa-user-gear', color: 'text-blue-400' },
      [PERMISSIONS.PROCESS_PAYMENTS]: { label: 'إصدار الرواتب والمدفوعات', icon: 'fa-money-bill-transfer', color: 'text-emerald-400' },
      [PERMISSIONS.VIEW_REPORTS]: { label: 'الوصول لمركز التقارير المتقدم', icon: 'fa-file-invoice-dollar', color: 'text-purple-400' },
      [PERMISSIONS.MANAGE_BRANCHES]: { label: 'إدارة الفروع والمواقع', icon: 'fa-building-circle-check', color: 'text-amber-400' }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white">إدارة المشرفين والصلاحيات</h2>
           <p className="text-gray-400 text-sm mt-1">التحكم في وصول المشرفين وتخصيص مهامهم الإدارية</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <GlassCard className="border-dashed border-2 border-white/5 bg-white/2 flex flex-col items-center justify-center text-center p-8 min-h-[280px]">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <i className="fa-solid fa-shield-halved text-2xl text-blue-500"></i>
            </div>
            <h4 className="text-white font-bold mb-2">كيفية الإضافة</h4>
            <p className="text-gray-500 text-xs leading-relaxed">
              يقوم المشرف بالتسجيل من شاشة الدخول أولاً، ثم يظهر هنا بانتظار موافقتك وتعيين صلاحياته الخاصة.
            </p>
         </GlassCard>

         {supervisors.map(sup => (
           <GlassCard key={sup.id} className="relative overflow-hidden flex flex-col border-white/10 group">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${sup.approved ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
              
              <div className="flex items-center justify-between mb-6 pl-2">
                 <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold border border-white/10 shadow-lg">
                       {sup.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="font-bold text-white text-lg">{sup.name}</h3>
                       <p className="text-xs text-gray-500 font-mono">@{sup.username}</p>
                    </div>
                 </div>
                 <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${sup.approved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {sup.approved ? 'نشط' : 'معلق'}
                 </span>
              </div>

              {sup.approved && (
                  <div className="mb-6 bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden transition-all">
                      <button 
                        className="w-full flex justify-between items-center p-4 hover:bg-white/5 transition-colors"
                        onClick={() => setExpandedId(expandedId === sup.id ? null : sup.id)}
                      >
                          <div className="flex items-center">
                             <i className="fa-solid fa-key text-blue-400 ml-2"></i>
                             <span className="text-xs text-white font-bold">صلاحيات النظام</span>
                             <span className="mr-2 text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{sup.permissions?.length || 0}</span>
                          </div>
                          <i className={`fa-solid fa-chevron-down text-xs text-gray-500 transition-transform duration-300 ${expandedId === sup.id ? 'rotate-180' : ''}`}></i>
                      </button>
                      
                      {expandedId === sup.id && (
                          <div className="p-4 pt-0 space-y-3 animate-fade-in-up border-t border-white/5">
                              {Object.entries(permissionLabels).map(([key, data]) => (
                                  <label key={key} className="flex items-center p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group/item">
                                      <div className="relative flex items-center">
                                          <input 
                                            type="checkbox" 
                                            checked={sup.permissions?.includes(key)}
                                            onChange={() => togglePermission(sup, key)}
                                            className="appearance-none h-5 w-5 bg-slate-800 border border-slate-700 rounded-md checked:bg-blue-600 checked:border-blue-500 focus:ring-0 cursor-pointer transition-all"
                                          />
                                          {sup.permissions?.includes(key) && <i className="fa-solid fa-check absolute left-1 text-[10px] text-white"></i>}
                                      </div>
                                      <div className="mr-3">
                                         <div className="flex items-center">
                                            <i className={`fa-solid ${data.icon} text-xs ml-2 ${data.color}`}></i>
                                            <span className="text-xs text-gray-300 group-hover/item:text-white transition-colors">{data.label}</span>
                                         </div>
                                      </div>
                                  </label>
                              ))}
                          </div>
                      )}
                  </div>
              )}

              <div className="mt-auto grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => handleApprove(sup.id, sup.approved)}
                   className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                     sup.approved 
                     ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20' 
                     : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                   }`}
                 >
                   <i className={`fa-solid ${sup.approved ? 'fa-user-slash' : 'fa-user-check'} ml-2`}></i>
                   {sup.approved ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                 </button>
                 <button 
                   onClick={() => handleDelete(sup.id)}
                   className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold border border-red-500/10 transition-all flex items-center justify-center"
                 >
                   <i className="fa-solid fa-trash-can ml-2"></i>
                   حذف نهائي
                 </button>
              </div>
           </GlassCard>
         ))}
      </div>
    </div>
  );
};