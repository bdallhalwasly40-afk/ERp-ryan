
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';

// --- TYPES ---
export type Role = 'manager' | 'supervisor' | 'worker';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  permissions?: string[];
}

export interface Supervisor {
  id: string;
  name: string;
  username: string;
  password: string;
  approved: boolean;
  role: 'supervisor';
  permissions: string[];
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  location?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
  category?: 'payroll' | 'loan' | 'announcement' | 'system' | 'message';
  targetPage?: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  type: 'SALARY' | 'ADVANCE' | 'BONUS';
  details: {
    baseSalary: number;
    housing: number;
    transport: number;
    overtime: number;
    bonuses: number;
    absencesDeduction: number;
    loanDeduction: number;
    notes?: string;
  };
}

export interface Worker {
  id: string;
  name: string;
  branch: string;
  jobTitle: string;
  iqama: string;
  iqamaExpiryDate: string;
  mobile: string;
  password?: string;
  bankName: string;
  accountNumber: string;
  joinDate: string;
  payDay: number;
  baseSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  photo?: string;
  activeLoan: number;
  absencesThisMonth: number;
  overtimeHours: number;
  payments: Payment[];
  requests?: WorkerRequest[];
}

export interface WorkerRequest {
  id: string;
  type: 'LOAN' | 'VACATION' | 'CERTIFICATE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
  amount?: number;
  reason: string;
}

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: Role;
  toId: string;
  toName: string;
  content: string;
  date: string;
  read: boolean;
  type: 'general' | 'request';
}

export interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

// --- CONSTANTS ---
const DB_KEY = 'SamiProERP_Master_v7';
const DEFAULT_MANAGER = { username: '2298305398', password: 'Aa112233', role: 'manager' as const };
const DEFAULT_BRANCHES = ['المركز الرئيسي - الرياض', 'فرع جدة', 'فرع الدمام', 'مستودع الخرج', 'فرع القصيم'];
const PERMISSIONS = { MANAGE_WORKERS: 'manage_workers', PROCESS_PAYMENTS: 'process_payments', VIEW_REPORTS: 'view_reports', MANAGE_BRANCHES: 'manage_branches' };
const BANKS = ['الراجحي', 'الأهلي', 'الرياض', 'الإنماء', 'البلاد', 'ساب'];

// --- STORAGE SERVICE ---
const StorageService = {
  getDB: () => {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (!parsed.supervisors) parsed.supervisors = [];
      if (!parsed.branches) parsed.branches = DEFAULT_BRANCHES.map(b => ({ id: Math.random().toString(), name: b }));
      if (!parsed.notifications) parsed.notifications = [];
      return parsed;
    }
    const initialDB = { workers: [], messages: [], logs: [], supervisors: [], branches: DEFAULT_BRANCHES.map(b => ({ id: Math.random().toString(), name: b })), notifications: [] };
    localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
    return initialDB;
  },
  saveDB: (db: any) => localStorage.setItem(DB_KEY, JSON.stringify(db)),
  
  getWorkers: () => StorageService.getDB().workers as Worker[],
  getSupervisors: () => StorageService.getDB().supervisors as Supervisor[],
  getNotifications: () => StorageService.getDB().notifications as Notification[],
  getMessages: () => StorageService.getDB().messages as Message[],
  getLogs: () => StorageService.getDB().logs as ActivityLog[],
  getBranches: () => StorageService.getDB().branches as Branch[],

  saveWorker: (worker: Worker) => {
    const db = StorageService.getDB();
    const index = db.workers.findIndex((w: any) => w.id === worker.id);
    if (index >= 0) db.workers[index] = worker;
    else db.workers.push(worker);
    StorageService.saveDB(db);
  },

  addNotification: (title: string, message: string, type: any = 'info', category: any = 'system', targetPage?: string, customId?: string) => {
    const db = StorageService.getDB();
    const today = new Date().toDateString();
    const isDuplicate = db.notifications.some((n: any) => (customId && n.id === customId && new Date(n.date).toDateString() === today) || (n.title === title && n.message === message && new Date(n.date).toDateString() === today));
    if (!isDuplicate) {
      db.notifications.unshift({ id: customId || Date.now().toString(), title, message, date: new Date().toISOString(), read: false, type, category, targetPage });
      if (db.notifications.length > 50) db.notifications.pop();
      StorageService.saveDB(db);
    }
  },

  markNotificationsRead: () => {
    const db = StorageService.getDB();
    db.notifications.forEach((n: any) => n.read = true);
    StorageService.saveDB(db);
  },

  deleteNotification: (id: string) => {
    const db = StorageService.getDB();
    db.notifications = db.notifications.filter((n: any) => n.id !== id);
    StorageService.saveDB(db);
  },

  deleteAllNotifications: () => {
    const db = StorageService.getDB();
    db.notifications = [];
    StorageService.saveDB(db);
  },

  sendMessage: (msg: Message) => {
    const db = StorageService.getDB();
    db.messages.unshift(msg);
    StorageService.saveDB(db);
  },

  logAction: (action: string, user: string, details?: string) => {
    const db = StorageService.getDB();
    db.logs.unshift({ id: Date.now().toString(), action, user, timestamp: new Date().toISOString(), details });
    if (db.logs.length > 1000) db.logs.pop();
    StorageService.saveDB(db);
  }
};

// --- COMPONENTS ---

const GlassCard = ({ children, className = '', title, action }: any) => (
  <div className={`glass-panel rounded-2xl p-6 shadow-xl ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

// --- PAGES ---

const Dashboard = ({ workers, onNavigate }: any) => {
  const totalWorkers = workers.length;
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const urgentPayrolls = workers.filter((w: Worker) => {
    const lastPayment = w.payments?.[w.payments.length - 1];
    const isPaid = lastPayment && new Date(lastPayment.date).getMonth() === currentMonth;
    if (isPaid) return false;
    let diff = w.payDay - currentDay;
    if (diff < -25) diff += 30;
    return diff >= 0 && diff <= 3;
  });

  const totalPaidThisMonth = workers.flatMap(w => w.payments || [])
    .filter(p => new Date(p.date).getMonth() === currentMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {urgentPayrolls.length > 0 && (
        <div onClick={() => onNavigate?.('payment-hub')} className="cursor-pointer bg-gradient-to-r from-amber-600/20 to-transparent border border-amber-500/30 p-4 rounded-3xl flex items-center justify-between animate-pulse-slow">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white"><i className="fa-solid fa-triangle-exclamation"></i></div>
            <div>
              <p className="text-sm font-bold text-white">تنبيه: {urgentPayrolls.length} رواتب تستحق الصرف</p>
              <p className="text-[11px] text-amber-300">موظفون بانتظار الصرف خلال 72 ساعة. انقر للمتابعة.</p>
            </div>
          </div>
          <i className="fa-solid fa-arrow-left text-amber-500"></i>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="border-r-4 border-r-blue-500 bg-blue-500/5">
          <p className="text-xs text-blue-400 font-bold mb-1 uppercase">إجمالي الموظفين</p>
          <h3 className="text-3xl font-black text-white">{totalWorkers}</h3>
        </GlassCard>
        <GlassCard className="border-r-4 border-r-emerald-500 bg-emerald-500/5">
          <p className="text-xs text-emerald-400 font-bold mb-1 uppercase">إجمالي رواتب الشهر</p>
          <h3 className="text-3xl font-black text-white">{totalPaidThisMonth.toLocaleString()} <span className="text-sm">ريال</span></h3>
        </GlassCard>
        <GlassCard className="border-r-4 border-r-amber-500 bg-amber-500/5">
          <p className="text-xs text-amber-400 font-bold mb-1 uppercase">فروع المؤسسة</p>
          <h3 className="text-3xl font-black text-white">{StorageService.getBranches().length}</h3>
        </GlassCard>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="مؤشر المصروفات المالية">
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{name: 'أمس', v: 4000}, {name: 'اليوم', v: totalPaidThisMonth}]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f620" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
        <GlassCard title="توزيع الموظفين حسب الفروع">
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={StorageService.getBranches().map(b => ({name: b.name, count: workers.filter((w: Worker) => w.branch === b.name).length}))}>
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#888'}} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
      </div>
    </div>
  );
};

const Reports = ({ workers }: any) => {
  const [filterType, setFilterType] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  
  const payments = useMemo(() => {
    let all = workers.flatMap((w: Worker) => w.payments.map(p => ({...p, workerName: w.name, branch: w.branch})));
    if (filterType !== 'all') all = all.filter((p: any) => p.type === filterType);
    if (filterBranch !== 'all') all = all.filter((p: any) => p.branch === filterBranch);
    return all;
  }, [workers, filterType, filterBranch]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(payments);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financials");
    XLSX.writeFile(wb, "SamiPro_Report.xlsx");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">التقارير والتحليل المالي</h2>
        <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-bold"><i className="fa-solid fa-file-excel ml-2"></i> تصدير Excel</button>
      </div>
      <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-gray-500 font-bold mb-2 block uppercase">تصفية حسب نوع الدفعة</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm">
            <option value="all">كل المدفوعات</option>
            <option value="SALARY">رواتب فقط</option>
            <option value="BONUS">مكافآت فقط</option>
            <option value="ADVANCE">سلف فقط</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 font-bold mb-2 block uppercase">تصفية حسب الفرع</label>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm">
            <option value="all">كل الفروع</option>
            {StorageService.getBranches().map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
      </GlassCard>
      <div className="overflow-x-auto glass-panel rounded-2xl">
        <table className="w-full text-right text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="p-4">التاريخ</th>
              <th className="p-4">الموظف</th>
              <th className="p-4">النوع</th>
              <th className="p-4">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 text-gray-400">{new Date(p.date).toLocaleDateString('ar-SA')}</td>
                <td className="p-4 font-bold text-white">{p.workerName}</td>
                <td className="p-4 text-blue-400">{p.type === 'SALARY' ? 'راتب' : p.type === 'BONUS' ? 'مكافأة' : 'سلفة'}</td>
                <td className="p-4 font-mono font-bold text-emerald-400">{p.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- MAIN LAYOUT & APP ---

const Layout = ({ children, user, onLogout, currentPage, onNavigate }: any) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const load = () => setNotifications(StorageService.getNotifications());
    load();
    const inv = setInterval(load, 10000);
    return () => clearInterval(inv);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifs = activeCategory === 'all' ? notifications : notifications.filter(n => n.category === activeCategory);

  const menuItems = user.role === 'worker' ? [
    { id: 'worker-home', label: 'الرئيسية', icon: 'fa-home' },
    { id: 'messages', label: 'الرسائل', icon: 'fa-envelope' }
  ] : [
    { id: 'dashboard', label: 'لوحة القيادة', icon: 'fa-chart-line' },
    { id: 'workers', label: 'الموظفين', icon: 'fa-users' },
    { id: 'payment-hub', label: 'الرواتب', icon: 'fa-money-bill-wave' },
    { id: 'reports', label: 'التقارير', icon: 'fa-file-excel' },
    { id: 'messages', label: 'الرسائل', icon: 'fa-envelope' },
    { id: 'settings', label: 'الإعدادات', icon: 'fa-cogs' }
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex flex-col w-64 glass-panel fixed h-full z-20">
        <div className="p-8 text-center border-b border-white/10">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-emerald-400">Sami Pro ERP</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => onNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentPage === item.id ? 'bg-blue-600/30 text-white font-bold' : 'text-gray-400 hover:text-white'}`}>
              <i className={`fa-solid ${item.icon} w-5`}></i> <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
           <button onClick={onLogout} className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/40 transition-colors">خروج آمن</button>
        </div>
      </aside>

      <main className="flex-1 md:mr-64 p-6">
        <header className="flex justify-between items-center mb-8 glass-panel p-4 rounded-3xl sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white capitalize">{currentPage.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
             <div className="relative">
                <button onClick={() => { setNotifOpen(!notifOpen); if(!notifOpen) StorageService.markNotificationsRead(); }} className="p-2 text-gray-400 hover:text-white relative">
                   <i className="fa-solid fa-bell text-xl"></i>
                   {unreadCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
                </button>
                {notifOpen && (
                  <div className="absolute top-12 left-0 w-80 glass-panel rounded-2xl shadow-2xl z-50 border-white/20">
                     <div className="p-4 border-b border-white/10 flex justify-between">
                        <span className="text-xs font-bold text-white">الإشعارات</span>
                        <button onClick={() => { StorageService.deleteAllNotifications(); setNotifications([]); }} className="text-[10px] text-red-400">مسح الكل</button>
                     </div>
                     <div className="flex gap-1 p-2 overflow-x-auto no-scrollbar border-b border-white/5">
                        {['all', 'payroll', 'loan', 'system'].map(cat => (
                           <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1 rounded-full text-[9px] font-bold ${activeCategory === cat ? 'bg-blue-600' : 'bg-white/5'}`}>{cat}</button>
                        ))}
                     </div>
                     <div className="max-h-80 overflow-y-auto">
                        {filteredNotifs.length === 0 ? <p className="p-10 text-center text-gray-500 text-xs">لا توجد إشعارات</p> : filteredNotifs.map(n => (
                           <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                              <p className="text-[10px] font-bold text-blue-400">{n.title}</p>
                              <p className="text-xs text-gray-300 truncate">{n.message}</p>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">{user.name.charAt(0)}</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('dashboard');
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    const loaded = StorageService.getWorkers();
    setWorkers(loaded);
    if (user && user.role !== 'worker') {
        const today = new Date();
        const currentDay = today.getDate();
        loaded.forEach(w => {
            let diff = w.payDay - currentDay;
            if (diff < -25) diff += 30;
            if (diff >= 0 && diff <= 3) {
                const alertId = `salary-${w.id}-${today.getMonth()}`;
                StorageService.addNotification('استحقاق راتب قريب', `الموظف ${w.name} يستحق راتبه خلال ${diff} أيام`, 'warning', 'payroll', 'payment-hub', alertId);
            }
        });
    }
  }, [user]);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="glass-panel w-full max-w-md p-10 rounded-3xl shadow-2xl border-t border-white/20 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30"><i className="fa-solid fa-cube text-4xl text-white"></i></div>
        <h1 className="text-3xl font-black text-white mb-8">Sami Pro ERP</h1>
        <form onSubmit={(e) => {
          e.preventDefault();
          const u = (e.target as any).username.value;
          const p = (e.target as any).password.value;
          if (u === DEFAULT_MANAGER.username && p === DEFAULT_MANAGER.password) {
            setUser({ id: 'manager', username: u, role: 'manager', name: 'المدير العام' });
          } else {
            const worker = StorageService.getWorkers().find(w => w.iqama === u && (w.password || w.mobile) === p);
            if(worker) setUser({ id: worker.id, username: u, role: 'worker', name: worker.name });
            else alert('خطأ في البيانات');
          }
        }} className="space-y-6">
          <input name="username" placeholder="اسم المستخدم" className="w-full glass-input p-4 rounded-xl text-center" />
          <input name="password" type="password" placeholder="كلمة المرور" className="w-full glass-input p-4 rounded-xl text-center" />
          <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-all">دخول آمن</button>
        </form>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={() => setUser(null)} currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard workers={workers} onNavigate={setPage} />}
      {page === 'reports' && <Reports workers={workers} />}
      {page === 'workers' && <div className="text-center p-20 text-gray-500">صفحة إدارة الموظفين - تحت الصيانة للعرض التجريبي</div>}
      {page === 'payment-hub' && <div className="text-center p-20 text-gray-500">صفحة مسير الرواتب - تحت الصيانة للعرض التجريبي</div>}
      {page === 'worker-home' && <div className="text-center p-20 text-gray-500">مرحباً بك في صفحة الموظف</div>}
    </Layout>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
