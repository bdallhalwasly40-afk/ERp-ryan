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