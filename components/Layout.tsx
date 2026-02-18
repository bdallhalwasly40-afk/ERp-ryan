import React, { useState, useEffect, useRef } from 'react';
import { User, Notification, Worker } from '../types';
import { StorageService } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentPage, onNavigate }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [payrollCountdown, setPayrollCountdown] = useState<{name: string, days: number}[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const notifRef = useRef<HTMLDivElement>(null);

  // Load Data
  useEffect(() => {
    const loadData = () => {
        const all = StorageService.getNotifications();
        setNotifications(all);

        if (user.role !== 'worker') {
            const workers = StorageService.getWorkers();
            const today = new Date();
            const currentDay = today.getDate();
            
            const countdowns = workers
                .filter(w => {
                    const lastPayment = w.payments?.[w.payments.length - 1];
                    if (!lastPayment) return true;
                    const lastDate = new Date(lastPayment.date);
                    return !(lastDate.getMonth() === today.getMonth() && lastDate.getFullYear() === today.getFullYear());
                })
                .map(w => {
                    let diff = w.payDay - currentDay;
                    if (diff < 0) diff += 30;
                    return { name: w.name, days: diff };
                })
                .sort((a, b) => a.days - b.days)
                .slice(0, 3); // Top 3 closest

            setPayrollCountdown(countdowns);
        }
    };
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  const handleNotifClick = () => {
      setNotifOpen(!isNotifOpen);
      if (!isNotifOpen) {
          StorageService.markNotificationsRead();
          setNotifications(prev => prev.map(n => ({...n, read: true})));
      }
  };

  const handleNotifItemClick = (n: Notification) => {
    if (n.targetPage) {
        onNavigate(n.targetPage);
    }
    setNotifOpen(false);
  };

  const handleDismissNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    StorageService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifs = () => {
    StorageService.deleteAllNotifications();
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotifIcon = (n: Notification) => {
    // Priority 1: Category
    if (n.category === 'payroll') return 'fa-money-bill-1-wave text-emerald-400';
    if (n.category === 'loan') return 'fa-hand-holding-dollar text-amber-400';
    if (n.category === 'message') return 'fa-comment-dots text-blue-400';
    if (n.category === 'announcement') return 'fa-bullhorn text-purple-400';
    
    // Priority 2: Type
    switch (n.type) {
        case 'success': return 'fa-circle-check text-emerald-400';
        case 'warning': return 'fa-triangle-exclamation text-amber-400';
        default: return 'fa-circle-info text-blue-400';
    }
  };

  const getNotifColorClass = (type: string) => {
    switch (type) {
        case 'success': return 'border-emerald-500/20';
        case 'warning': return 'border-amber-500/20';
        default: return 'border-blue-500/20';
    }
  };

  const categories = [
    { id: 'all', label: 'الكل', icon: 'fa-layer-group' },
    { id: 'payroll', label: 'رواتب', icon: 'fa-money-bill' },
    { id: 'loan', label: 'سلف', icon: 'fa-hand-holding-dollar' },
    { id: 'message', label: 'رسائل', icon: 'fa-comments' }
  ];

  const filteredNotifications = activeCategory === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === activeCategory);

  let menuItems = [];
  if (user.role === 'worker') {
      menuItems = [
        { id: 'worker-home', label: 'الرئيسية', icon: 'fa-home' },
        { id: 'worker-messages', label: 'المراسلات', icon: 'fa-envelope' },
      ];
  } else if (user.role === 'supervisor') {
      menuItems = [
        { id: 'dashboard', label: 'لوحة القيادة', icon: 'fa-chart-line' },
        { id: 'payment-hub', label: 'الدفع', icon: 'fa-money-bill-wave' },
        { id: 'workers', label: 'الموظفين', icon: 'fa-users' },
        { id: 'branches', label: 'الفروع', icon: 'fa-building' },
        { id: 'reports', label: 'التقارير', icon: 'fa-file-excel' },
        { id: 'messages', label: 'الرسائل', icon: 'fa-envelope' },
      ];
  } else {
      menuItems = [
        { id: 'dashboard', label: 'لوحة القيادة', icon: 'fa-chart-line' },
        { id: 'user-management', label: 'المستخدمين', icon: 'fa-user-shield' },
        { id: 'branches', label: 'الفروع', icon: 'fa-building' },
        { id: 'payment-hub', label: 'الرواتب', icon: 'fa-money-bill-wave' },
        { id: 'workers', label: 'الموظفين', icon: 'fa-users' },
        { id: 'reports', label: 'التقارير', icon: 'fa-file-excel' },
        { id: 'messages', label: 'الرسائل', icon: 'fa-envelope-open-text' },
        { id: 'settings', label: 'إعدادات النظام', icon: 'fa-cogs' },
      ];
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      <aside 
        className={`hidden md:flex flex-col w-64 glass-panel border-l border-white/10 fixed h-full transition-all duration-300 z-20 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-center border-b border-white/10">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-emerald-400">
            Sami Pro ERP
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all ${
                currentPage === item.id 
                  ? 'bg-blue-600/30 text-blue-200 border border-blue-500/30 font-bold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-6`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 space-x-reverse mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-xs text-blue-300 capitalize">
                {user.role === 'manager' ? 'المدير العام' : user.role === 'supervisor' ? 'مشرف نظام' : 'موظف'}
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg text-sm transition-colors">
            <i className="fa-solid fa-sign-out-alt ml-2"></i> خروج
          </button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:mr-64' : ''}`}>
        <header className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-md">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="hidden md:block p-2 text-gray-400 hover:text-white">
              <i className="fa-solid fa-bars text-xl"></i>
            </button>
            <div className="md:hidden text-xl font-bold text-white">Sami Pro</div>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="relative" ref={notifRef}>
                <button onClick={handleNotifClick} className="relative p-2 text-gray-400 hover:text-white transition-colors">
                    <i className="fa-solid fa-bell text-xl"></i>
                    {(unreadCount > 0 || payrollCountdown.length > 0) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                </button>

                {isNotifOpen && (
                    <div className="absolute top-12 left-0 w-80 glass-panel rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden animate-fade-in-up">
                        {/* Payroll Countdown Section */}
                        {user.role !== 'worker' && payrollCountdown.length > 0 && (
                            <div className="p-3 bg-emerald-600/10 border-b border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">اقتراب موعد الرواتب</h4>
                                    <i className="fa-solid fa-clock-rotate-left text-[10px] text-emerald-500/50"></i>
                                </div>
                                <div className="space-y-2">
                                    {payrollCountdown.map((item, idx) => (
                                        <div 
                                          key={idx} 
                                          className="flex justify-between items-center text-xs cursor-pointer hover:bg-emerald-500/10 p-1 rounded transition-colors"
                                          onClick={() => { onNavigate('payment-hub'); setNotifOpen(false); }}
                                        >
                                            <span className="text-gray-300">{item.name}</span>
                                            <span className={`font-bold ${item.days === 0 ? 'text-red-400' : 'text-white'}`}>
                                                {item.days === 0 ? 'اليوم!' : `خلال ${item.days} يوم`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-2 border-b border-white/10 bg-slate-900/50 flex flex-col gap-2">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest">الإشعارات</h3>
                                <button 
                                    onClick={handleClearAllNotifs}
                                    className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors"
                                >
                                    مسح الكل
                                </button>
                            </div>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={(e) => { e.stopPropagation(); setActiveCategory(cat.id); }}
                                        className={`px-3 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 transition-all border whitespace-nowrap ${
                                            activeCategory === cat.id 
                                            ? 'bg-blue-600 border-blue-500 text-white' 
                                            : 'bg-white/5 border-white/10 text-gray-400'
                                        }`}
                                    >
                                        <i className={`fa-solid ${cat.icon}`}></i>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {filteredNotifications.length === 0 ? (
                                <div className="p-10 text-center text-gray-500">
                                    <i className="fa-solid fa-envelope-open text-3xl mb-3 opacity-20"></i>
                                    <p className="text-xs">لا توجد إشعارات حالياً</p>
                                </div>
                            ) : (
                                filteredNotifications.map(n => (
                                    <div 
                                      key={n.id} 
                                      onClick={() => handleNotifItemClick(n)}
                                      className={`p-4 border-b border-white/5 hover:bg-white/10 cursor-pointer transition-colors relative group/notif ${!n.read ? 'bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                <i className={`fa-solid ${getNotifIcon(n)} text-sm`}></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[10px] font-bold ${n.type === 'warning' ? 'text-amber-400' : n.type === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>{n.title}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-gray-500">{new Date(n.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                                                        <button 
                                                            onClick={(e) => handleDismissNotif(e, n.id)}
                                                            className="opacity-0 group-hover/notif:opacity-100 hover:text-red-400 text-gray-500 transition-all p-1"
                                                            title="مسح"
                                                        >
                                                            <i className="fa-solid fa-xmark text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed truncate">{n.message}</p>
                                            </div>
                                        </div>
                                        {n.targetPage && (
                                            <div className="flex items-center gap-1 mt-2 text-[9px] text-blue-400 font-bold uppercase">
                                                <span>عرض التفاصيل</span>
                                                <i className="fa-solid fa-arrow-left"></i>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-x-hidden pb-24 md:pb-6">
          {children}
        </div>
        
        <div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 h-20 flex items-center z-40 bg-[#0f172a]/95 backdrop-blur-xl overflow-x-auto no-scrollbar px-2 space-x-2 space-x-reverse">
           {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[70px] h-16 rounded-xl transition-all duration-200 ${
                currentPage === item.id ? 'text-blue-400 bg-white/10' : 'text-gray-400'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-lg mb-1`}></i>
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </button>
           ))}
           <button onClick={onLogout} className="flex-shrink-0 flex flex-col items-center justify-center min-w-[70px] h-16 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
             <i className="fa-solid fa-sign-out-alt text-lg mb-1"></i>
             <span className="text-[10px]">خروج</span>
           </button>
        </div>
      </main>
    </div>
  );
};