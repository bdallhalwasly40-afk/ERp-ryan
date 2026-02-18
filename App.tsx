
import React, { useState, useEffect } from 'react';
import { User, Worker } from './types';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PaymentHub } from './pages/PaymentHub';
import { Reports } from './pages/Reports';
import { Workers } from './pages/Workers';
import { WorkerHome } from './pages/WorkerHome';
import { UserManagement } from './pages/UserManagement';
import { BranchesPage } from './pages/BranchesPage';
import { MessagesPage } from './pages/MessagesPage';
import { Settings } from './pages/Settings';
import { StorageService } from './services/storage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    // تحميل البيانات الأولية
    const loadedWorkers = StorageService.getWorkers();
    setWorkers(loadedWorkers);
    
    // التحقق التلقائي من الرواتب المستحقة للمديرين فقط
    if (currentUser && currentUser.role !== 'worker') {
        checkUpcomingPaydays(loadedWorkers);
    }
  }, [currentUser]);

  const refreshData = () => {
    const updatedWorkers = StorageService.getWorkers();
    setWorkers(updatedWorkers);
  };

  const checkUpcomingPaydays = (workerList: Worker[]) => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      workerList.forEach(w => {
          const lastPayment = w.payments?.[w.payments.length - 1];
          let alreadyPaid = false;
          if (lastPayment) {
             const lastDate = new Date(lastPayment.date);
             if (lastDate.getMonth() === currentMonth && lastDate.getFullYear() === currentYear) {
                alreadyPaid = true;
             }
          }

          if (!alreadyPaid) {
              let diff = w.payDay - currentDay;
              if (diff < -25) diff += 30; 

              if (diff >= 0 && diff <= 3) {
                  const msg = diff === 0 ? `راتب ${w.name} يستحق اليوم!` : `راتب ${w.name} يستحق خلال ${diff} أيام`;
                  const alertId = `salary-alert-${w.id}-${currentMonth}-${currentYear}`;
                  StorageService.addNotification(
                    'تنبيه استحقاق راتب', 
                    msg, 
                    diff === 0 ? 'success' : 'warning', 
                    'payroll', 
                    'payment-hub',
                    alertId
                  );
              }
          }
      });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage(user.role === 'worker' ? 'worker-home' : 'dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': 
         return currentUser.role !== 'worker' ? <Dashboard workers={workers} onNavigate={setCurrentPage} /> : <WorkerHome user={currentUser} />;
      case 'user-management':
         return currentUser.role === 'manager' ? <UserManagement /> : <div className="text-red-500 p-10 font-bold text-center">ليس لديك صلاحية</div>;
      case 'branches':
         return currentUser.role !== 'worker' ? <BranchesPage /> : null;
      case 'payment-hub': 
         return currentUser.role !== 'worker' ? <PaymentHub workers={workers} onUpdate={refreshData} /> : null;
      case 'workers': 
         return currentUser.role !== 'worker' ? <Workers workers={workers} onUpdate={refreshData} currentUser={currentUser} /> : null;
      case 'reports': 
         return currentUser.role !== 'worker' ? <Reports workers={workers} /> : null;
      case 'settings':
         return currentUser.role === 'manager' ? <Settings /> : null;
      case 'worker-home': 
         return <WorkerHome user={currentUser} />;
      case 'messages':
      case 'worker-messages':
         return <MessagesPage user={currentUser} />;
      default: return <Dashboard workers={workers} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout 
      user={currentUser} 
      onLogout={handleLogout} 
      currentPage={currentPage}
      onNavigate={setCurrentPage}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;
