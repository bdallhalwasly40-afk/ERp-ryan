import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Worker } from '../types';
import { StorageService } from '../services/storage';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportsProps {
  workers: Worker[];
}

// Helper to safely access html2pdf
declare const window: any;

export const Reports: React.FC<ReportsProps> = ({ workers }) => {
  const [reportType, setReportType] = useState('financial');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterWorker, setFilterWorker] = useState('all');
  const [filterPaymentType, setFilterPaymentType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load branches dynamically instead of from constants
    const loadedBranches = StorageService.getBranches().map(b => b.name);
    setBranches(loadedBranches);
  }, []);

  // Filter Data
  const getFilteredPayments = () => {
    let allPayments = workers.flatMap(w => w.payments?.map(p => ({ ...p, workerName: w.name, workerBranch: w.branch })) || []);
    
    if (filterBranch !== 'all') {
      allPayments = allPayments.filter(p => p.workerBranch === filterBranch);
    }
    if (filterWorker !== 'all') {
      allPayments = allPayments.filter(p => p.workerName === filterWorker);
    }
    if (filterPaymentType !== 'all') {
      allPayments = allPayments.filter(p => p.type === filterPaymentType);
    }
    if (dateFrom) {
      allPayments = allPayments.filter(p => new Date(p.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      allPayments = allPayments.filter(p => new Date(p.date) <= new Date(dateTo));
    }
    return allPayments;
  };

  const filteredPayments = getFilteredPayments();

  // Chart Data Preparation for Employee Statement
  const getWorkerChartData = () => {
      if (filterWorker === 'all') return [];
      const worker = workers.find(w => w.name === filterWorker);
      if (!worker) return [];

      const last6Months = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          last6Months.push({
              name: d.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
              month: d.getMonth(),
              year: d.getFullYear(),
              earnings: 0,
              deductions: 0,
              net: 0
          });
      }

      // Aggregate
      const payments = worker.payments || [];
      payments.forEach(p => {
          const pDate = new Date(p.date);
          const monthData = last6Months.find(m => m.month === pDate.getMonth() && m.year === pDate.getFullYear());
          if (monthData) {
              const deductions = (p.details?.absencesDeduction || 0) + (p.details?.loanDeduction || 0);
              const net = p.amount;
              const earnings = net + deductions;
              
              monthData.earnings += earnings;
              monthData.deductions += deductions;
              monthData.net += net;
          }
      });
      return last6Months;
  };

  // Export Functions
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredPayments.map(p => ({
        ID: p.id,
        Date: new Date(p.date).toLocaleDateString('ar-SA'),
        Worker: p.workerName,
        Branch: p.workerBranch,
        Type: p.type === 'SALARY' ? 'راتب' : p.type === 'ADVANCE' ? 'سلفة' : 'مكافأة',
        Amount: p.amount,
        Base: p.details.baseSalary,
        Deductions: p.details.absencesDeduction + p.details.loanDeduction,
        Notes: p.details.notes || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "SamiPro_Report.xlsx");
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 10,
      filename: 'SamiPro_Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    if (window.html2pdf) {
        window.html2pdf().set(opt).from(reportRef.current).save();
    } else {
        alert("PDF Generator script not loaded.");
    }
  };

  const exportWhatsApp = () => {
    const total = filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const deductions = filteredPayments.reduce((acc, curr) => acc + (curr.details.absencesDeduction + curr.details.loanDeduction), 0);
    const typeLabel = filterPaymentType === 'all' ? 'الكل' : (filterPaymentType === 'SALARY' ? 'الرواتب' : filterPaymentType === 'ADVANCE' ? 'السلف' : 'المكافآت');
    
    const text = `*تقرير مالي سامي برو*%0a` +
                 `الفئة: ${typeLabel}%0a` +
                 `التاريخ: ${dateFrom || 'الكل'} إلى ${dateTo || 'الآن'}%0a` +
                 `إجمالي المدفوعات: ${total.toLocaleString()} ريال%0a` +
                 `إجمالي الخصومات: ${deductions.toLocaleString()} ريال%0a` +
                 `شكراً لاستخدامكم نظامنا.`;
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const uniqueWorkers = Array.from(new Set(workers.map(w => w.name)));

  const getPaymentTypeLabel = (type: string) => {
    switch(type) {
      case 'SALARY': return 'راتب';
      case 'ADVANCE': return 'سلفة';
      case 'BONUS': return 'مكافأة';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-white">مركز التقارير المتقدم</h2>
          <div className="flex space-x-2 space-x-reverse">
             <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold flex items-center transition-colors"><i className="fa-solid fa-file-excel ml-2"></i> Excel</button>
             <button onClick={exportToPDF} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-bold flex items-center transition-colors"><i className="fa-solid fa-file-pdf ml-2"></i> PDF</button>
             <button onClick={exportWhatsApp} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-white text-sm font-bold flex items-center transition-colors"><i className="fa-brands fa-whatsapp ml-2"></i> WhatsApp</button>
          </div>
      </div>

      {/* Filters */}
      <GlassCard className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div>
           <label className="block text-xs text-gray-400 mb-1">نوع التقرير</label>
           <select value={reportType} onChange={e => setReportType(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm bg-slate-800">
             <option value="financial">البيان المالي الشامل</option>
             <option value="detailed">مسير الرواتب المفصل</option>
             <option value="statement">كشف حساب موظف</option>
             <option value="loans">تقرير السلف والمديونيات</option>
           </select>
        </div>
        <div>
           <label className="block text-xs text-gray-400 mb-1">نوع الدفعة</label>
           <select value={filterPaymentType} onChange={e => setFilterPaymentType(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm bg-slate-800">
             <option value="all">الكل</option>
             <option value="SALARY">راتب</option>
             <option value="ADVANCE">سلفة</option>
             <option value="BONUS">مكافأة</option>
           </select>
        </div>
        <div>
           <label className="block text-xs text-gray-400 mb-1">الفرع</label>
           <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm bg-slate-800">
             <option value="all">الكل</option>
             {branches.map(b => <option key={b} value={b}>{b}</option>)}
           </select>
        </div>
        <div>
           <label className="block text-xs text-gray-400 mb-1">الموظف</label>
           <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm bg-slate-800">
             <option value="all">الكل</option>
             {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
           </select>
        </div>
        <div>
           <label className="block text-xs text-gray-400 mb-1">من تاريخ</label>
           <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm" />
        </div>
         <div>
           <label className="block text-xs text-gray-400 mb-1">إلى تاريخ</label>
           <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="glass-input w-full p-2 rounded-lg text-sm" />
        </div>
      </GlassCard>

      {/* Report Rendering */}
      <div id="report-content" ref={reportRef} className="glass-panel p-8 bg-white text-black rounded-xl">
         {/* Printable Header */}
         <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-center">
            <div>
               <h1 className="text-3xl font-bold text-slate-800">Sami Pro ERP</h1>
               <p className="text-sm text-slate-500">تقرير رسمي معتمد</p>
            </div>
            <div className="text-left text-sm text-slate-600">
               <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
               <p>المستخدم: مدير النظام</p>
            </div>
         </div>

         {reportType === 'financial' && (
           <div className="space-y-6">
              <h2 className="text-xl font-bold border-r-4 border-blue-600 pr-3">البيان المالي الشامل</h2>
              <div className="grid grid-cols-3 gap-6 text-center">
                 <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-bold">إجمالي المدفوعات</p>
                    <p className="text-2xl font-bold text-slate-800">{filteredPayments.reduce((a,b)=>a+b.amount,0).toLocaleString()} ريال</p>
                 </div>
                 <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-bold">إجمالي الخصومات</p>
                    <p className="text-2xl font-bold text-slate-800">{filteredPayments.reduce((a,b)=>a+(b.details.absencesDeduction+b.details.loanDeduction),0).toLocaleString()} ريال</p>
                 </div>
                 <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-600 font-bold">صافي التشغيل</p>
                    <p className="text-2xl font-bold text-slate-800">{(filteredPayments.reduce((a,b)=>a+b.amount,0) * 1.15).toLocaleString()} ريال</p>
                 </div>
              </div>
              <div className="mt-8">
                 <h3 className="font-bold mb-4">تفاصيل العمليات المختارة</h3>
                 <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100">
                       <tr>
                          <th className="p-2">التاريخ</th>
                          <th className="p-2">الموظف</th>
                          <th className="p-2">النوع</th>
                          <th className="p-2">المبلغ</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredPayments.slice(0,10).map((p, i) => (
                          <tr key={i} className="border-b">
                             <td className="p-2">{new Date(p.date).toLocaleDateString('ar-SA')}</td>
                             <td className="p-2">{p.workerName}</td>
                             <td className="p-2 text-xs text-slate-500">{getPaymentTypeLabel(p.type)}</td>
                             <td className="p-2 font-mono">{p.amount.toLocaleString()}</td>
                          </tr>
                       ))}
                       {filteredPayments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">لا توجد عمليات تطابق هذه المعايير</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
         )}

         {reportType === 'detailed' && (
             <div>
                <h2 className="text-xl font-bold mb-4">مسير الرواتب المفصل</h2>
                <table className="w-full text-right text-xs">
                   <thead className="bg-slate-800 text-white">
                      <tr>
                         <th className="p-2">التاريخ</th>
                         <th className="p-2">الموظف</th>
                         <th className="p-2">النوع</th>
                         <th className="p-2">الفرع</th>
                         <th className="p-2">أساسي</th>
                         <th className="p-2">بدلات</th>
                         <th className="p-2">إضافي</th>
                         <th className="p-2">خصم</th>
                         <th className="p-2">الصافي</th>
                      </tr>
                   </thead>
                   <tbody>
                       {filteredPayments.map((p, i) => (
                          <tr key={i} className="border-b hover:bg-slate-50">
                             <td className="p-2 whitespace-nowrap">{new Date(p.date).toLocaleDateString('ar-SA')}</td>
                             <td className="p-2 font-bold">{p.workerName}</td>
                             <td className="p-2 text-[10px]">{getPaymentTypeLabel(p.type)}</td>
                             <td className="p-2">{p.workerBranch}</td>
                             <td className="p-2">{p.details.baseSalary}</td>
                             <td className="p-2">{p.details.housing + p.details.transport}</td>
                             <td className="p-2">{p.details.overtime.toFixed(0)}</td>
                             <td className="p-2 text-red-600">{(p.details.absencesDeduction + p.details.loanDeduction).toFixed(0)}</td>
                             <td className="p-2 font-bold text-green-700">{p.amount.toLocaleString()}</td>
                          </tr>
                       ))}
                   </tbody>
                </table>
             </div>
         )}

         {reportType === 'statement' && (
            <div>
               <h2 className="text-xl font-bold mb-4 border-r-4 border-emerald-600 pr-3">كشف حساب موظف</h2>
               {filterWorker === 'all' ? (
                   <div className="p-8 text-center bg-slate-100 rounded-lg">
                       <p className="text-slate-500">الرجاء اختيار موظف من القائمة أعلاه لعرض كشف الحساب والرسوم البيانية.</p>
                   </div>
               ) : (
                   <div className="space-y-8">
                       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
                           <div>
                               <h3 className="text-lg font-bold text-slate-800">{filterWorker}</h3>
                               <p className="text-sm text-slate-500">تقرير مفصل للرواتب والمدفوعات</p>
                           </div>
                           <div className="text-left">
                               <p className="text-xs text-slate-400">إجمالي المقبوضات (الفترة المحددة)</p>
                               <p className="text-2xl font-bold text-emerald-600">{filteredPayments.reduce((a,b)=>a+b.amount,0).toLocaleString()} <span className="text-sm text-slate-500">ريال</span></p>
                           </div>
                       </div>

                       {/* Chart Section */}
                       <div className="h-64 w-full bg-white border border-slate-200 rounded-lg p-2">
                          <h4 className="text-xs font-bold text-slate-400 mb-2 text-center">تحليل الاستحقاقات والاستقطاعات (آخر 6 أشهر)</h4>
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={getWorkerChartData()}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} />
                                <YAxis tick={{fontSize: 10}} />
                                <Tooltip 
                                   contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b'}} 
                                   formatter={(value: number) => value.toLocaleString()}
                                />
                                <Legend />
                                <Bar dataKey="earnings" name="الاستحقاقات" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="deductions" name="الخصومات" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>

                       {/* Transactions Table */}
                       <div>
                          <h4 className="font-bold mb-2 text-slate-700">سجل العمليات</h4>
                          <table className="w-full text-right text-sm border">
                              <thead className="bg-slate-100">
                                 <tr>
                                    <th className="p-2 border">التاريخ</th>
                                    <th className="p-2 border">النوع</th>
                                    <th className="p-2 border">البيان</th>
                                    <th className="p-2 border">استحقاق</th>
                                    <th className="p-2 border">خصم</th>
                                    <th className="p-2 border">صافي</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {filteredPayments.map((p, i) => (
                                    <tr key={i} className="border-b hover:bg-slate-50">
                                       <td className="p-2 border-l">{new Date(p.date).toLocaleDateString('ar-SA')}</td>
                                       <td className="p-2 border-l text-xs">{getPaymentTypeLabel(p.type)}</td>
                                       <td className="p-2 border-l">راتب شهر {new Date(p.date).getMonth() + 1}</td>
                                       <td className="p-2 border-l font-mono text-emerald-600">{(p.amount + p.details.absencesDeduction + p.details.loanDeduction).toLocaleString()}</td>
                                       <td className="p-2 border-l font-mono text-red-500">{(p.details.absencesDeduction + p.details.loanDeduction).toLocaleString()}</td>
                                       <td className="p-2 font-bold font-mono">{p.amount.toLocaleString()}</td>
                                    </tr>
                                 ))}
                                 {filteredPayments.length === 0 && <tr><td colSpan={6} className="p-4 text-center">لا توجد بيانات</td></tr>}
                              </tbody>
                          </table>
                       </div>
                   </div>
               )}
            </div>
         )}

         {reportType === 'loans' && (
             <div>
                <h2 className="text-xl font-bold mb-4 text-red-600">تقرير المديونيات المستحقة</h2>
                 <table className="w-full text-right text-sm">
                   <thead className="bg-red-50 text-red-900">
                      <tr>
                         <th className="p-2">الموظف</th>
                         <th className="p-2">الفرع</th>
                         <th className="p-2">الجوال</th>
                         <th className="p-2">قيمة السلفة المتبقية</th>
                      </tr>
                   </thead>
                   <tbody>
                       {workers.filter(w => w.activeLoan > 0).map((w, i) => (
                          <tr key={i} className="border-b">
                             <td className="p-2 font-bold">{w.name}</td>
                             <td className="p-2">{w.branch}</td>
                             <td className="p-2">{w.mobile}</td>
                             <td className="p-2 font-bold text-red-600">{w.activeLoan.toLocaleString()} ريال</td>
                          </tr>
                       ))}
                       {workers.filter(w => w.activeLoan > 0).length === 0 && (
                           <tr><td colSpan={4} className="p-4 text-center">لا توجد سلف نشطة</td></tr>
                       )}
                   </tbody>
                </table>
             </div>
         )}
      </div>
    </div>
  );
};