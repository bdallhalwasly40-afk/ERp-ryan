import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { StorageService } from '../services/storage';
import { Worker, Supervisor } from '../types';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'security' | 'backup' | 'system'>('security');
  
  // Security State
  const [userType, setUserType] = useState<'worker' | 'supervisor'>('worker');
  const [users, setUsers] = useState<(Worker | Supervisor)[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // System Health Stats
  const [stats, setStats] = useState({
      workersCount: 0,
      logsCount: 0,
      supervisorsCount: 0,
      dbSizeKb: "0"
  });

  // System State
  const [resetConfirm, setResetConfirm] = useState('');

  useEffect(() => {
    loadUsers();
    setStats(StorageService.getDbStats());
  }, [userType, activeTab]);

  const loadUsers = () => {
    if (userType === 'worker') {
      setUsers(StorageService.getWorkers());
    } else {
      setUsers(StorageService.getSupervisors());
    }
    setSelectedUserId('');
  };

  const handleUpdatePassword = () => {
    if (!selectedUserId || !newPassword) {
      alert('الرجاء اختيار المستخدم وإدخال كلمة المرور الجديدة');
      return;
    }
    const success = StorageService.updateUserPassword(selectedUserId, userType, newPassword);
    if (success) {
      alert('تم تحديث كلمة المرور بنجاح');
      setNewPassword('');
      setSelectedUserId('');
      StorageService.logAction('PASSWORD_RESET', 'manager', `Reset password for ${userType} ID: ${selectedUserId}`);
    } else {
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const handleExport = () => {
    StorageService.exportData();
    StorageService.logAction('BACKUP_DOWNLOAD', 'manager', 'Downloaded full system backup');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm('تحذير: استعادة نسخة احتياطية سيمسح البيانات الحالية ويستبدلها. هل أنت متأكد؟')) {
      const success = await StorageService.importData(file);
      if (success) {
        alert('تمت استعادة البيانات بنجاح! سيتم إعادة تحميل النظام.');
        window.location.reload();
      } else {
        alert('فشل في استعادة البيانات. الملف قد يكون تالفاً أو غير متوافق.');
      }
    }
  };

  const handleClearLogs = () => {
    if (confirm('هل تريد حقاً مسح جميع سجلات الأنشطة؟ هذا الإجراء قد يسرع النظام.')) {
        StorageService.clearLogs();
        setStats(StorageService.getDbStats());
        alert('تم مسح السجلات بنجاح');
    }
  };

  const handleSystemReset = () => {
    if (resetConfirm === 'DELETE') {
      if (confirm('تحذير نهائي: هل أنت متأكد تماماً؟ سيتم فقدان جميع البيانات ولا يمكن استعادتها.')) {
        StorageService.resetSystem();
      }
    } else {
      alert('الرجاء كتابة كلمة DELETE للتأكيد');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
           <h2 className="text-2xl font-bold text-white">إعدادات النظام العليا</h2>
           <p className="text-gray-400 text-sm">مركز التحكم الكامل والنسخ الاحتياطي</p>
        </div>
        <div className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 text-xs flex items-center">
            <i className="fa-solid fa-database ml-2"></i>
            حجم البيانات: {stats.dbSizeKb} KB
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse overflow-x-auto no-scrollbar border-b border-white/10 pb-2 mb-6">
        <button 
          onClick={() => setActiveTab('security')}
          className={`pb-2 px-6 transition-all whitespace-nowrap ${activeTab === 'security' ? 'text-blue-400 border-b-2 border-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-shield-halved ml-2"></i> الأمان والخصوصية
        </button>
        <button 
          onClick={() => setActiveTab('backup')}
          className={`pb-2 px-6 transition-all whitespace-nowrap ${activeTab === 'backup' ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-cloud-arrow-down ml-2"></i> البيانات والنسخ الاحتياطي
        </button>
        <button 
          onClick={() => setActiveTab('system')}
          className={`pb-2 px-6 transition-all whitespace-nowrap ${activeTab === 'system' ? 'text-red-400 border-b-2 border-red-400 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-sliders ml-2"></i> تهيئة النظام
        </button>
      </div>

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GlassCard title="إعادة تعيين كلمات المرور">
              <div className="space-y-6">
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <i className="fa-solid fa-info-circle text-blue-400 mt-1"></i>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    بصفتك المدير العام، تملك الصلاحية الكاملة لتغيير كلمات مرور جميع الحسابات في حال نسيانها أو لأسباب أمنية.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">تحديد الفئة</label>
                  <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setUserType('worker')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${userType === 'worker' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      الموظفين ({stats.workersCount})
                    </button>
                    <button 
                      onClick={() => setUserType('supervisor')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${userType === 'supervisor' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      المشرفين ({stats.supervisorsCount})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 mr-1">المستخدم المستهدف</label>
                    <select 
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className="glass-input w-full p-3 rounded-xl bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- اختر المستخدم --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} (ID: {u.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 mr-1">كلمة المرور الجديدة</label>
                    <div className="relative">
                       <input 
                        type="text" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="أدخل الكلمة الجديدة"
                        className="glass-input w-full p-3 rounded-xl text-sm pr-10"
                      />
                      <i className="fa-solid fa-lock absolute left-3 top-3.5 text-gray-600"></i>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleUpdatePassword}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 transition-all transform active:scale-95"
                >
                  <i className="fa-solid fa-key ml-2"></i>
                  تحديث كلمة المرور فوراً
                </button>
              </div>
            </GlassCard>
          </div>
          
          <div className="space-y-6">
             <GlassCard title="إحصائيات الأمان">
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                      <span className="text-xs text-gray-400">سجل النشاطات</span>
                      <span className="text-sm font-bold text-white">{stats.logsCount} سجل</span>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                      <span className="text-xs text-gray-400">آخر تسجيل دخول</span>
                      <span className="text-sm font-bold text-blue-400">الآن</span>
                   </div>
                   <button 
                      onClick={handleClearLogs}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white rounded-lg text-xs transition-all border border-white/5"
                   >
                      <i className="fa-solid fa-broom ml-2"></i>
                      مسح سجلات النشاطات
                   </button>
                </div>
             </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="border-emerald-500/20">
            <div className="flex flex-col items-center text-center p-4">
               <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fa-solid fa-download text-3xl text-emerald-400"></i>
               </div>
               <h3 className="text-xl font-bold text-white mb-2">تصدير البيانات (Backup)</h3>
               <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  قم بتحميل نسخة احتياطية كاملة من النظام بصيغة JSON. يمكنك استخدام هذا الملف لاستعادة بياناتك في أي وقت أو نقلها لجهاز آخر.
               </p>
               <button 
                 onClick={handleExport}
                 className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center"
               >
                  <i className="fa-solid fa-file-export ml-2"></i>
                  تنزيل النسخة الاحتياطية
               </button>
            </div>
          </GlassCard>

          <GlassCard className="border-blue-500/20">
            <div className="flex flex-col items-center text-center p-4">
               <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fa-solid fa-upload text-3xl text-blue-400"></i>
               </div>
               <h3 className="text-xl font-bold text-white mb-2">استعادة البيانات (Restore)</h3>
               <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  هل تملك نسخة احتياطية سابقة؟ قم برفع الملف هنا لاستبدال البيانات الحالية بالبيانات المخزنة في النسخة.
               </p>
               <label className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center cursor-pointer">
                  <i className="fa-solid fa-file-import ml-2"></i>
                  رفع واستعادة الملف
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
               </label>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-3xl mx-auto">
          <GlassCard className="border-red-500/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <i className="fa-solid fa-triangle-exclamation text-8xl text-red-500"></i>
            </div>
            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-inner">
                <i className="fa-solid fa-biohazard text-4xl text-red-500"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-red-500">تهيئة المصنع (Factory Reset)</h3>
                <p className="text-gray-300 mt-2 max-w-md mx-auto">
                  سيؤدي هذا الإجراء إلى <strong>حذف كافة البيانات</strong> نهائياً. سيتم تصفير الموظفين، الرواتب، الفروع، والمشرفين.
                </p>
              </div>

              <div className="w-full max-w-sm space-y-4">
                <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                   <p className="text-xs text-red-400 font-bold mb-2">للتأكيد، يرجى كتابة الكلمة أدناه:</p>
                   <p className="text-xl font-mono text-white tracking-widest select-none">DELETE</p>
                </div>
                <input 
                  type="text" 
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  placeholder="اكتب هنا للتأكيد..."
                  className="glass-input w-full p-4 rounded-xl text-center border-red-500/30 focus:border-red-500 font-bold"
                />
              </div>

              <button 
                onClick={handleSystemReset}
                disabled={resetConfirm !== 'DELETE'}
                className={`w-full max-w-sm py-4 font-bold rounded-xl transition-all flex items-center justify-center ${
                  resetConfirm === 'DELETE' 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-2xl shadow-red-500/40 cursor-pointer active:scale-95' 
                  : 'bg-slate-800 text-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                <i className="fa-solid fa-fire-extinguisher ml-2"></i>
                تدمير كافة البيانات وإعادة التشغيل
              </button>
              
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sami Pro ERP Security Protocol V7</p>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};