import React from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Worker, ActivityLog } from '../types';
import { StorageService } from '../services/storage';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

interface DashboardProps {
  workers: Worker[];
  onNavigate?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ workers, onNavigate }) => {
  const totalWorkers = workers.length;
  const totalLoan = workers.reduce((sum, w) => sum + (w.activeLoan || 0), 0);
  
  const allPayments = workers.flatMap(w => w.payments || []);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();
  
  const thisMonthPayments = allPayments.filter(p => {
    const d = new Date(p.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalPaidThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // Urgent Payrolls: 0-3 days remaining (Enhanced Logic)
  const urgentPayrolls = workers.filter(w => {
      const lastPayment = w.payments?.[w.payments.length - 1];
      const isPaidThisMonth = lastPayment && new Date(lastPayment.date).getMonth() === currentMonth;
      if (isPaidThisMonth) return false;

      let diff = w.payDay - currentDay;
      if (diff < -25) diff += 30; // Handle cycle wrap
      return diff >= 0 && diff <= 3;
  }).sort((a, b) => {
      let dA = a.payDay - currentDay; if(dA < 0) dA += 30;
      let dB = b.payDay - currentDay; if(dB < 0) dB += 30;
      return dA - dB;
  });

  const unpaidWorkers = workers.filter(w => {
      const lastPayment = w.payments?.[w.payments.length - 1];
      if (!lastPayment) return true;
      const lastDate = new Date(lastPayment.date);
      return !(lastDate.getMonth() === currentMonth && lastDate.getFullYear() === currentYear);
  });
  
  const estimatedRemainingSalaries = unpaidWorkers.reduce((sum, w) => sum + w.baseSalary + w.housingAllowance + w.transportAllowance, 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const logs = StorageService.getLogs().slice(0, 5);

  const shortcuts = [
    { id: 'workers', label: 'إدارة الموظفين', icon: 'fa-user-plus', color: 'bg-blue-600', desc: 'إضافة وتعديل البيانات' },
    { id: 'payment-hub', label: 'صرف الرواتب', icon: 'fa-money-bill-transfer', color: 'bg-emerald-600', desc: 'مسير الرواتب الذكي' },
    { id: 'reports', label: 'التقارير', icon: 'fa-chart-pie', color: 'bg-purple-600', desc: 'تحليل البيانات والمالية' },
    { id: 'branches', label: 'الفروع', icon: 'fa-map-location-dot', color: 'bg-amber-600', desc: 'المواقع وتوزيع العمالة' }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Urgent Payroll Alert Banner */}
      {urgentPayrolls.length > 0 && (
          <div 
            onClick={() => onNavigate?.('payment-hub')}
            className="group cursor-pointer bg-gradient-to-r from-amber-600/20 via-amber-600/10 to-transparent border border-amber-500/30 p-4 rounded-3xl flex items-center justify-between animate-pulse-slow hover:bg-amber-600/30 transition-all backdrop-blur-md"
          >
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div>
                      <p className="text-sm font-bold text-white">تنبيه: {urgentPayrolls.length} رواتب تستحق الصرف قريباً</p>
                      <p className="text-[11px] text-amber-300">هناك موظفون يستحقون الصرف خلال الـ 72 ساعة القادمة. انقر للمتابعة.</p>
                  </div>
              </div>
              <i className="fa-solid fa-arrow-left text-amber-500 group-hover:translate-x-1 transition-transform"></i>
          </div>
      )}

      {/* Dynamic Welcome Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="relative">
              <h1 className="text-4xl font-black text-white tracking-tight">
                مركز العمليات
                <span className="block text-sm font-normal text-gray-400 mt-2">مرحباً بك مجدداً، إليك ملخص نشاط المؤسسة لليوم</span>
              </h1>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
             <div className="text-center px-4">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">صافي المدفوعات</p>
                <p className="text-xl font-bold text-white">{totalPaidThisMonth.toLocaleString()} <span className="text-[10px] text-blue-400">ريال</span></p>
             </div>
             <div className="h-10 w-[1px] bg-white/10"></div>
             <div className="text-center px-4">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">النمو العمالي</p>
                <p className="text-xl font-bold text-emerald-400">+{Math.ceil(totalWorkers * 0.05)}%</p>
             </div>
          </div>
      </div>

      {/* Modern Shortcuts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map(item => (
            <button 
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className="group flex items-center p-5 glass-panel rounded-3xl border-white/5 hover:border-blue-500/40 hover:bg-blue-600/5 transition-all duration-300 text-right"
            >
              <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                 <i className={`fa-solid ${item.icon} text-xl text-white`}></i>
              </div>
              <div className="mr-4">
                 <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{item.label}</p>
                 <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <i className="fa-solid fa-chevron-left mr-auto text-gray-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-xs"></i>
            </button>
          ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Financial Pulse */}
          <div className="xl:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCard className="border-r-4 border-r-blue-500 bg-blue-500/5">
                      <p className="text-xs text-blue-400 font-bold mb-1 uppercase tracking-wider">إجمالي الموظفين</p>
                      <h3 className="text-3xl font-black text-white">{totalWorkers}</h3>
                      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500" style={{width: '75%'}}></div>
                      </div>
                  </GlassCard>

                  <GlassCard className="border-r-4 border-r-emerald-500 bg-emerald-500/5">
                      <p className="text-xs text-emerald-400 font-bold mb-1 uppercase tracking-wider">الرواتب المعالجة</p>
                      <h3 className="text-3xl font-black text-white">{thisMonthPayments.length} <span className="text-sm text-gray-500">من {totalWorkers}</span></h3>
                      <p className="text-[10px] text-gray-500 mt-2">نسبة الإنجاز: {Math.round((thisMonthPayments.length / (totalWorkers || 1)) * 100)}%</p>
                  </GlassCard>

                  <GlassCard className="border-r-4 border-r-amber-500 bg-amber-500/5">
                      <p className="text-xs text-amber-400 font-bold mb-1 uppercase tracking-wider">السلف القائمة</p>
                      <h3 className="text-3xl font-black text-white">{totalLoan.toLocaleString()} <span className="text-sm text-gray-500">ريال</span></h3>
                      <p className="text-[10px] text-gray-500 mt-2">تتطلب تحصيل هذا الشهر</p>
                  </GlassCard>
              </div>

              {/* Chart Section */}
              <GlassCard title="مؤشر الأداء المالي (نصف سنوي)">
                  <div className="h-[300px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'يناير', value: 42000 },
                        { name: 'فبراير', value: 45000 },
                        { name: 'مارس', value: 41000 },
                        { name: 'أبريل', value: 48000 },
                        { name: 'مايو', value: 46000 },
                        { name: 'يونيو', value: totalPaidThisMonth || 35000 },
                      ]}>
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis dataKey="name" stroke="#475569" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#475569" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </GlassCard>
          </div>

          {/* Urgent Salaries Sidebar (The Request) */}
          <div className="space-y-6">
              <GlassCard title="رواتب وشيكة (خلال 1-3 أيام)" className="border-amber-500/30">
                  <div className="space-y-3 mt-4">
                    {urgentPayrolls.length === 0 ? (
                      <div className="text-center py-12 opacity-40">
                         <i className="fa-solid fa-calendar-check text-4xl mb-4"></i>
                         <p className="text-xs">لا يوجد رواتب مستحقة في الأيام الثلاثة القادمة</p>
                      </div>
                    ) : (
                      urgentPayrolls.map(w => {
                        let diff = w.payDay - currentDay;
                        if (diff < 0) diff += 30;
                        return (
                          <div key={w.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${diff === 0 ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                   {w.payDay}
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white">{w.name}</p>
                                   <p className="text-[10px] text-gray-500">{diff === 0 ? 'يستحق اليوم!' : `خلال ${diff} أيام`}</p>
                                </div>
                             </div>
                             <button 
                               onClick={() => onNavigate?.('payment-hub')}
                               className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                             >
                                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                             </button>
                          </div>
                        );
                      })
                    )}
                  </div>
              </GlassCard>

              <GlassCard title="سجل الأنشطة">
                  <div className="space-y-4 mt-4">
                     {logs.map(log => (
                       <div key={log.id} className="flex gap-3 items-start p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                             <i className="fa-solid fa-bolt-lightning text-xs"></i>
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] text-white font-bold truncate leading-tight">{log.details || log.action}</p>
                             <div className="flex justify-between items-center mt-1">
                                <span className="text-[9px] text-gray-500">{new Date(log.timestamp).toLocaleTimeString('ar-SA')}</span>
                                <span className="text-[9px] font-bold text-blue-300">{log.user}</span>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
              </GlassCard>
          </div>
      </div>
    </div>
  );
};
