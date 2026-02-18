import { DB_KEY, DEFAULT_BRANCHES, DEFAULT_MANAGER } from '../constants';
import { Worker, Message, ActivityLog, Supervisor, Branch, Notification } from '../types';

interface DB {
  workers: Worker[];
  messages: Message[];
  logs: ActivityLog[];
  supervisors: Supervisor[];
  branches: Branch[];
  notifications: Notification[];
}

const getDB = (): DB => {
  const data = localStorage.getItem(DB_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    if (!parsed.supervisors) parsed.supervisors = [];
    if (!parsed.branches) {
      parsed.branches = DEFAULT_BRANCHES.map(b => ({ id: Math.random().toString(), name: b }));
    }
    if (!parsed.notifications) parsed.notifications = [];
    return parsed;
  }
  const initialDB: DB = {
    workers: [],
    messages: [],
    logs: [],
    supervisors: [],
    branches: DEFAULT_BRANCHES.map(b => ({ id: Math.random().toString(), name: b })),
    notifications: []
  };
  localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
  return initialDB;
};

const saveDB = (db: DB) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const StorageService = {
  // System Management & Backup
  resetSystem: () => {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  },

  exportData: () => {
    const db = getDB();
    const dataStr = JSON.stringify(db, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `SamiPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  },

  importData: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedDB = JSON.parse(content);
          if (importedDB.workers && importedDB.supervisors) {
            saveDB(importedDB);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (err) {
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  },

  getDbStats: () => {
    const db = getDB();
    const size = new Blob([JSON.stringify(db)]).size;
    return {
        workersCount: db.workers.length,
        logsCount: db.logs.length,
        supervisorsCount: db.supervisors.length,
        dbSizeKb: (size / 1024).toFixed(2)
    };
  },

  isUsernameTaken: (username: string, excludeId?: string): boolean => {
    const db = getDB();
    if (username === DEFAULT_MANAGER.username) return true;
    if (db.supervisors.some(s => s.username === username && s.id !== excludeId)) return true;
    if (db.workers.some(w => w.iqama === username && w.id !== excludeId)) return true;
    return false;
  },

  updateUserPassword: (id: string, type: 'worker' | 'supervisor', newPassword: string) => {
    const db = getDB();
    if (type === 'worker') {
      const idx = db.workers.findIndex(w => w.id === id);
      if (idx >= 0) {
        db.workers[idx].password = newPassword;
        saveDB(db);
        return true;
      }
    } else {
      const idx = db.supervisors.findIndex(s => s.id === id);
      if (idx >= 0) {
        db.supervisors[idx].password = newPassword;
        saveDB(db);
        return true;
      }
    }
    return false;
  },

  // Workers
  getWorkers: () => getDB().workers,
  saveWorker: (worker: Worker) => {
    const db = getDB();
    const index = db.workers.findIndex(w => w.id === worker.id);
    if (index >= 0) {
      db.workers[index] = worker;
    } else {
      if (!worker.password) worker.password = worker.mobile;
      db.workers.push(worker);
      StorageService.addNotification('موظف جديد', `تمت إضافة الموظف ${worker.name} للنظام`, 'info', 'system', 'workers');
    }
    saveDB(db);
  },
  deleteWorker: (id: string) => {
    const db = getDB();
    db.workers = db.workers.filter(w => w.id !== id);
    saveDB(db);
  },

  // Branches
  getBranches: () => getDB().branches,
  addBranch: (name: string, location: string) => {
    const db = getDB();
    db.branches.push({ id: Date.now().toString(), name, location });
    saveDB(db);
  },
  deleteBranch: (id: string) => {
    const db = getDB();
    db.branches = db.branches.filter(b => b.id !== id);
    saveDB(db);
  },

  // Notifications
  getNotifications: () => getDB().notifications,
  addNotification: (title: string, message: string, type: 'info'|'warning'|'success' = 'info', category: Notification['category'] = 'system', targetPage?: string, customId?: string) => {
    const db = getDB();
    const todayStr = new Date().toDateString();
    
    // Duplication check including customId to prevent multiple system alerts for same event
    const isDuplicate = db.notifications.some(n => 
      (customId && n.id === customId && new Date(n.date).toDateString() === todayStr) ||
      (n.title === title && n.message === message && new Date(n.date).toDateString() === todayStr)
    );
    
    if (!isDuplicate) {
      db.notifications.unshift({
          id: customId || Date.now().toString(),
          title,
          message,
          date: new Date().toISOString(),
          read: false,
          type,
          category,
          targetPage
      });
      if(db.notifications.length > 50) db.notifications.pop();
      saveDB(db);
    }
  },
  deleteNotification: (id: string) => {
    const db = getDB();
    db.notifications = db.notifications.filter(n => n.id !== id);
    saveDB(db);
  },
  deleteAllNotifications: () => {
    const db = getDB();
    db.notifications = [];
    saveDB(db);
  },
  markNotificationsRead: () => {
    const db = getDB();
    db.notifications.forEach(n => n.read = true);
    saveDB(db);
  },

  // Supervisors
  getSupervisors: () => getDB().supervisors,
  registerSupervisor: (supervisor: Supervisor) => {
    if (StorageService.isUsernameTaken(supervisor.username)) {
      throw new Error("اسم المستخدم موجود مسبقاً أو مستخدم كرقم إقامة");
    }
    const db = getDB();
    supervisor.permissions = [];
    db.supervisors.push(supervisor);
    saveDB(db);
    StorageService.addNotification('طلب تسجيل', `طلب مشرف جديد: ${supervisor.name}`, 'warning', 'system', 'user-management');
  },
  approveSupervisor: (id: string, approved: boolean) => {
    const db = getDB();
    const index = db.supervisors.findIndex(s => s.id === id);
    if (index >= 0) {
      db.supervisors[index].approved = approved;
      saveDB(db);
    }
  },
  updateSupervisorPermissions: (id: string, permissions: string[]) => {
      const db = getDB();
      const index = db.supervisors.findIndex(s => s.id === id);
      if (index >= 0) {
        db.supervisors[index].permissions = permissions;
        saveDB(db);
      }
  },
  deleteSupervisor: (id: string) => {
    const db = getDB();
    db.supervisors = db.supervisors.filter(s => s.id !== id);
    saveDB(db);
  },

  // Messages
  getMessages: () => getDB().messages,
  sendMessage: (msg: Message) => {
    const db = getDB();
    db.messages.unshift(msg);
    saveDB(db);
    if(msg.toId === 'manager') {
       StorageService.addNotification('رسالة جديدة', `رسالة من ${msg.fromName}`, 'info', 'message', 'messages');
    }
  },
  markMessageRead: (id: string) => {
    const db = getDB();
    const msg = db.messages.find(m => m.id === id);
    if (msg) msg.read = true;
    saveDB(db);
  },

  // Logs
  getLogs: () => getDB().logs,
  clearLogs: () => {
    const db = getDB();
    db.logs = [];
    saveDB(db);
  },
  logAction: (action: string, user: string, details?: string) => {
    const db = getDB();
    db.logs.unshift({
      id: Date.now().toString(),
      action,
      user,
      timestamp: new Date().toISOString(),
      details
    });
    if (db.logs.length > 1000) db.logs.pop();
    saveDB(db);
  }
};
