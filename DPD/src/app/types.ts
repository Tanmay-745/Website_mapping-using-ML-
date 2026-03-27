export interface AllocationData {
  id: string;
  customerName: string;
  accountNumber: string;
  DPD: number;
  originalAmount: number;
  amount: number;
  contactEmail: string;
  contactPhone: string;
  address: string;
  allocationDate: string;
  isPaid: boolean;
  uploadedAt?: string;
  lender?: string;
  lastActionDate?: string;
  nextActionDate?: string;
  currentNoticeType?: string;
  logs?: CommunicationLog[];
}

export interface CommunicationLog {
  id: number;
  allocationId: string;
  type: string;
  status: string;
  timestamp: string;
}

export interface ClientSettings {
  dailyInterestRate: number; // Percentage per day
  penaltyRate: number; // Additional penalty percentage
}

export interface Action {
  day: number;
  type: string;
  channels: string[];
  description: string;
}

export interface DPDBucket {
  range: string;
  count: number;
  totalAmount: number;
  color: string;
}

export interface User {
  id: number;
  username: string;
  lender?: string;
  is_host: boolean;
  is_active: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  lender?: string;
  isHost?: boolean;
}