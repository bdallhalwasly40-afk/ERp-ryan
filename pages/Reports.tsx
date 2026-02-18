
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Worker } from '../types';
import { StorageService } from '../services/storage';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportsProps {
  workers: Worker[];
}

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
    const loadedBranches = StorageService.getBranches().map(b => b.name);
    setBranches(loadedBranches);
  }, []);

  const getFilteredPayments = () => {
    let allPayments = workers.flatMap(w => w.payments?.map(p => ({ ...p, workerName: w.name, workerBranch: w.branch })) || []);
    
    if (filterBranch !== 'all') allPayments = allPayments.filter(p => p.workerBranch === filterBranch);
    if (filterWorker !== 'all') allPayments = allPayments.filter(p => p.workerName === filterWorker);
    if (filterPaymentType !== 'all') allPayments = allPayments.filter(p => p.type === filterPaymentType);
    if (dateFrom) allPayments = allPayments.filter(p => new Date(p.date) >= new Date(dateFrom));
    if (dateTo) allPayments = allPayments.filter(p => new Date(p.date) <= new Date(dateTo));
    
    return allPayments;
  };

  const filteredPayments = getFilteredPayments();

  const exportToExcel = () => {
    const data = filteredPayments.map(p => ({
        "التاريخ": new Date(p.date).toLocaleDateString('ar-SA'),
        "الموظف": p.workerName,
        "الفرع": p.workerBranch,
        "النوع": p.type === 'SALARY' ? 'راتب' : p.type === 'ADVANCE' ? 'سلفة' : 'مكافأة',
        "المبلغ": p.amount,
        "ملاحظات": p.details.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, "SamiPro_Financial_Report.xlsx");
  };

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
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">مركز التقارير</h2>
          <button onClick={exportToExcel} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold flex items-center transition-all">
             <i className="fa-solid fa-file-excel ml-2"></i> تصدير Excel
          </button>
      </div>

      <GlassCard className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div>
           <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase">نوع التقرير</label>
           <select value={reportType} onChange={e => setReportType(e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-xs bg-slate-900">
             <option value="financial">البيان المالي</option>
             <option value="detailed">مسير الرواتب</option>
           </select>
        </div>
        <div>
           <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase">نوع الدفعة</label>
           <select value={filterPaymentType} onChange={e => setFilterPaymentType(e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-xs bg-slate-900">
             <option value="all">الكل</option>
             <option value="SALARY">راتب</option>
             <option value="ADVANCE">سلفة</option>
             <option value="BONUS">مكافأة</option>
           </select>
        </div>
        <div>
           <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase">الفرع</label>
           <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-xs bg-slate-900">
             <option value="all">الكل</option>
             {branches.map(b => <option key={b} value={b}>{b}</option>)}
           </select>
        </div>
        <div>
           <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase">الموظف</label>
           <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-xs bg-slate-900">
             <option value="all">الكل</option>
             {Array.from(new Set(workers.map(w => w.name))).map(w => <option key={w} value={w}>{w}</option>)}
           </select>
        </div>
        <div>
           <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase">من</label>
           <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-xs" />
        </div>
        <div>
           <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase">إلى</label>
           <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-xs" />
        </div>
      </GlassCard>

      <div className="glass-panel overflow-hidden rounded-2xl">
         <table className="w-full text-right text-xs">
            <thead className="bg-white/5 border-b border-white/10">
               <tr>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">الموظف</th>
                  <th className="p-4">النوع</th>
                  <th className="p-4">الفرع</th>
                  <th className="p-4">المبلغ الصافي</th>
               </tr>
            </thead>
            <tbody>
               {filteredPayments.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                     <td className="p-4 text-gray-400">{new Date(p.date).toLocaleDateString('ar-SA')}</td>
                     <td className="p-4 font-bold text-white">{p.workerName}</td>
                     <td className="p-4 text-blue-400">{getPaymentTypeLabel(p.type)}</td>
                     <td className="p-4 text-gray-400">{p.workerBranch}</td>
                     <td className="p-4 font-mono font-bold text-emerald-400">{p.amount.toLocaleString()} ريال</td>
                  </tr>
               ))}
               {filteredPayments.length === 0 && (
                  <tr><td colSpan={5} className="p-20 text-center text-gray-500">لا توجد بيانات تطابق البحث</td></tr>
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
};
