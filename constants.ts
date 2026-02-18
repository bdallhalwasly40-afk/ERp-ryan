export const DB_KEY = 'SamiProERP_Final';

export const DEFAULT_MANAGER = {
  username: '2298305398',
  password: 'Aa112233',
  role: 'manager' as const
};

export const DEFAULT_BRANCHES = [
  'المركز الرئيسي - الرياض',
  'فرع جدة',
  'فرع الدمام',
  'مستودع الخرج',
  'فرع القصيم'
];

export const PERMISSIONS = {
  MANAGE_WORKERS: 'manage_workers',
  PROCESS_PAYMENTS: 'process_payments',
  VIEW_REPORTS: 'view_reports',
  MANAGE_BRANCHES: 'manage_branches'
};

export const BANKS = [
  'الراجحي',
  'الأهلي',
  'الرياض',
  'الإنماء',
  'البلاد',
  'ساب'
];