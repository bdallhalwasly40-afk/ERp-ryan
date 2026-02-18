import React, { useState } from 'react';
import { User, Supervisor } from '../types';
import { DEFAULT_MANAGER } from '../constants';
import { StorageService } from '../services/storage';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerData, setRegisterData] = useState({ name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Check Manager
    if (username === DEFAULT_MANAGER.username && password === DEFAULT_MANAGER.password) {
      onLogin({
        id: 'manager',
        username,
        role: 'manager',
        name: 'المدير العام'
      });
      return;
    }

    // 2. Check Supervisors
    const supervisors = StorageService.getSupervisors();
    const supervisor = supervisors.find(s => s.username === username && s.password === password);
    if (supervisor) {
      if (!supervisor.approved) {
        setError('حسابك بانتظار موافقة المدير العام');
        return;
      }
      onLogin({
        id: supervisor.id,
        username: supervisor.username,
        role: 'supervisor',
        name: supervisor.name,
        permissions: supervisor.permissions // Ensure permissions are passed
      });
      return;
    }

    // 3. Check Workers
    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.iqama === username);
    if (worker) {
       const workerPass = worker.password || worker.mobile;
       if (workerPass === password) {
         onLogin({
           id: worker.id,
           username: worker.iqama,
           role: 'worker',
           name: worker.name
         });
         return;
       }
    }

    setError('بيانات الدخول غير صحيحة');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!registerData.name || !registerData.username || !registerData.password) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    try {
      const newSupervisor: Supervisor = {
        id: Date.now().toString(),
        name: registerData.name,
        username: registerData.username,
        password: registerData.password,
        approved: false,
        role: 'supervisor',
        permissions: [],
        createdAt: new Date().toISOString()
      };
      StorageService.registerSupervisor(newSupervisor);
      setSuccess('تم تسجيل طلبك بنجاح! يرجى انتظار تفعيل الحساب من المدير.');
      setMode('login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl border-t border-white/20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <i className="fa-solid fa-cube text-4xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-white">Sami Pro ERP</h1>
          <p className="text-blue-200 mt-2">{mode === 'login' ? 'تسجيل الدخول للنظام' : 'طلب حساب مشرف جديد'}</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">اسم المستخدم / رقم الهوية (الإقامة)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="أدخل المعرف الخاص بك"
                />
                <i className="fa-solid fa-id-card absolute left-3 top-3.5 text-gray-500"></i>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">كلمة المرور</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
                <i className="fa-solid fa-lock absolute left-3 top-3.5 text-gray-500"></i>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                <i className="fa-solid fa-info-circle ml-1"></i>
                للموظفين: اسم المستخدم هو رقم الإقامة، وكلمة المرور الافتراضية هي رقم الجوال.
              </p>
            </div>

            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded border border-red-500/20">{error}</p>}
            {success && <p className="text-emerald-400 text-sm text-center bg-emerald-500/10 py-2 rounded border border-emerald-500/20">{success}</p>}

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
            >
              دخول آمن
            </button>
            
            <div className="text-center pt-4 border-t border-white/10">
              <button type="button" onClick={() => setMode('register')} className="text-sm text-blue-300 hover:text-white transition-colors">
                طلب حساب مشرف جديد
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">الاسم الكامل</label>
              <input 
                type="text" 
                value={registerData.name}
                onChange={e => setRegisterData({...registerData, name: e.target.value})}
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">اسم المستخدم المطلوب</label>
              <input 
                type="text" 
                value={registerData.username}
                onChange={e => setRegisterData({...registerData, username: e.target.value})}
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                value={registerData.password}
                onChange={e => setRegisterData({...registerData, password: e.target.value})}
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded">{error}</p>}

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            >
              إرسال طلب التسجيل
            </button>
             <div className="text-center pt-2">
              <button type="button" onClick={() => setMode('login')} className="text-sm text-gray-400 hover:text-white transition-colors">
                العودة لتسجيل الدخول
              </button>
            </div>
          </form>
        )}
        
        <p className="text-center text-xs text-gray-500 mt-6">
          V7.0 Master Edition &copy; 2024
        </p>
      </div>
    </div>
  );
};
