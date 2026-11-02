export interface Student {
  id: string;
  studentCode: string;
  name: string;
  phone: string;
  parentPhone: string;
  parentRelation?: string;
  grade: string;
  groupName: string;
  monthlyFee: number;
  notes?: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface MonthlyRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  monthKey: string; // e.g. "2026-11"
  monthLabel: string; // e.g. "نوفمبر 2026"
  requiredAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  lastPaymentDate?: string;
  receiptNumber?: string;
  notes?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface PaymentTransaction {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  monthKey: string;
  amount: number;
  receiptNumber: string;
  recordedBy: string;
  note?: string;
  paymentDate: string;
  createdAt: string;
  type?: 'payment' | 'refund';
  isRefunded?: boolean;
  refundedAmount?: number;
  refundReason?: string;
  refundDate?: string;
  refundedBy?: string;
  originalTransactionId?: string;
  originalReceiptNumber?: string;
}

export interface SystemSettings {
  teacherName: string;
  defaultMonthlyFee: number;
  currency: string;
  academicYear: string;
}

export interface MonthOption {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
}
