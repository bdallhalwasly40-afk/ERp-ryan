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
    // Initial Load
    const loadedWorkers = StorageService.getWorkers();
    setWorkers(loadedWorkers);
    
    // Check for Upcoming Salaries automatically
    if (currentUser && currentUser.role !== 'worker') {
        checkUpcomingPaydays(loadedWorkers);
    }
  }, [currentUser]);

  const refreshData = () => {
    const updatedWorkers = StorageService.getWorkers();
    setWorkers(updatedWorkers);
  };

  // Logic to generate notifications for salaries due in <= 3 days
  const checkUpcomingPaydays = (workerList: Worker[]) => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      workerList.forEach(w => {
          // Check if already paid this month
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
              // If we are at the end of the month and payday is early next month
              if (diff < -25) diff += 30; 

              if (diff >= 0 && diff <= 3) {
                  const msg = diff === 0 ? `راتب ${w.name} يستحق اليوم!` : `راتب ${w.name} يستحق خلال ${diff} أيام`;
                  // Use a unique ID for this specific month/worker/event to prevent spam
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
    if (user.role === 'worker') {
        setCurrentPage('worker-home');
    } else {
        setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('login');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    // Role based protection
    switch(currentPage) {
      case 'dashboard': 
         return currentUser.role !== 'worker' ? <Dashboard workers={workers} onNavigate={setCurrentPage} /> : <WorkerHome user={currentUser} />;
      case 'user-management':
         return currentUser.role === 'manager' ? <UserManagement /> : <div className="text-red-500 p-10 font-bold text-center">عذراً، ليس لديك صلاحية الوصول لهذه الصفحة</div>;
      case 'branches':
         return currentUser.role !== 'worker' ? <BranchesPage /> : <div className="text-red-500 p-10 font-bold text-center">عذراً، ليس لديك صلاحية الوصول لهذه الصفحة</div>;
      case 'payment-hub': 
         return currentUser.role !== 'worker' ? <PaymentHub workers={workers} onUpdate={refreshData} /> : null;
      case 'workers': 
         return currentUser.role !== 'worker' ? <Workers workers={workers} onUpdate={refreshData} currentUser={currentUser} /> : null;
      case 'reports': 
         return currentUser.role !== 'worker' ? <Reports workers={workers} /> : null;
      case 'settings':
         return currentUser.role === 'manager' ? <Settings /> : <div className="text-red-500 p-10 font-bold text-center">عذراً، هذه الصفحة مخصصة للمدير العام فقط</div>;
      case 'worker-home': 
         return <WorkerHome user={currentUser} />;
      case 'messages':
      case 'worker-messages':
         return <MessagesPage user={currentUser} />;
      default: return currentUser.role !== 'worker' ? <Dashboard workers={workers} onNavigate={setCurrentPage} /> : <WorkerHome user={currentUser} />;
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
