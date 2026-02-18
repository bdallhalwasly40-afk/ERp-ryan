import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Branch, Worker } from '../types';
import { StorageService } from '../services/storage';

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLoc, setNewBranchLoc] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBranches(StorageService.getBranches());
    setWorkers(StorageService.getWorkers());
  };

  const handleAdd = () => {
    if(!newBranchName) return;
    StorageService.addBranch(newBranchName, newBranchLoc);
    setNewBranchName('');
    setNewBranchLoc('');
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
      if(window.confirm('حذف الفرع؟ تأكد من نقل الموظفين أولاً.')) {
          StorageService.deleteBranch(id);
          loadData();
      }
  }

  // Statistics Calculation
  const getBranchStats = (branchName: string) => {
      const branchWorkers = workers.filter(w => w.branch === branchName);
      const count = branchWorkers.length;
      const totalSalaries = branchWorkers.reduce((sum, w) => sum + w.baseSalary + w.housingAllowance + w.transportAllowance, 0);
      return { count, totalSalaries };
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">إدارة الفروع</h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center">
              <i className="fa-solid fa-plus ml-2"></i> إضافة فرع
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map(branch => {
              const stats = getBranchStats(branch.name);
              return (
                  <GlassCard key={branch.id} className="relative overflow-hidden group">
                       <button onClick={() => handleDelete(branch.id)} className="absolute top-2 left-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                           <i className="fa-solid fa-trash"></i>
                       </button>
                       <div className="flex items-center space-x-4 space-x-reverse mb-6">
                           <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400">
                               <i className="fa-solid fa-building text-xl"></i>
                           </div>
                           <div>
                               <h3 className="text-lg font-bold text-white">{branch.name}</h3>
                               <p className="text-xs text-gray-400">{branch.location || 'موقع غير محدد'}</p>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                           <div className="text-center border-l border-white/5 pl-4">
                               <p className="text-xs text-gray-500 mb-1">عدد الموظفين</p>
                               <p className="text-xl font-bold text-white">{stats.count}</p>
                           </div>
                           <div className="text-center">
                               <p className="text-xs text-gray-500 mb-1">التكلفة الشهرية</p>
                               <p className="text-lg font-bold text-emerald-400 font-mono">{stats.totalSalaries.toLocaleString()}</p>
                           </div>
                       </div>
                  </GlassCard>
              );
          })}
       </div>

       {isModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
               <div className="glass-panel w-full max-w-md rounded-2xl p-6">
                   <h3 className="text-xl font-bold text-white mb-4">إضافة فرع جديد</h3>
                   <div className="space-y-4">
                       <input 
                         placeholder="اسم الفرع" 
                         className="glass-input w-full p-3 rounded-lg"
                         value={newBranchName}
                         onChange={e => setNewBranchName(e.target.value)}
                       />
                       <input 
                         placeholder="الموقع / المدينة (اختياري)" 
                         className="glass-input w-full p-3 rounded-lg"
                         value={newBranchLoc}
                         onChange={e => setNewBranchLoc(e.target.value)}
                       />
                       <div className="flex gap-3 pt-2">
                           <button onClick={handleAdd} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold">حفظ</button>
                           <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg">إلغاء</button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};