/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db, testConnection, handleFirestoreError, OperationType } from './firebase';
import { Student, MonthlyRecord, PaymentTransaction, SystemSettings } from './types';
import { 
  getAcademicMonths, 
  getCurrentMonthKey, 
  getMonthLabel, 
  exportToExcel, 
  generateReceiptNumber 
} from './utils/helpers';
import { SAMPLE_STUDENTS } from './utils/sampleData';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { StudentTable } from './components/StudentTable';
import { StudentModal } from './components/StudentModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { TreasuryHistory } from './components/TreasuryHistory';
import { SettingsView } from './components/SettingsView';
import { FeasibilityStudyModal } from './components/FeasibilityStudyModal';
import { AlertCircle, Wifi, RefreshCw } from 'lucide-react';

export default function App() {
  const teacherName = 'مستر أحمد الشعراوي';
  const academicMonths = useMemo(() => getAcademicMonths(), []);
  
  // State
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(getCurrentMonthKey());
  const [activeTab, setActiveTab] = useState<'students' | 'treasury' | 'settings'>('students');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Firestore Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<Record<string, MonthlyRecord>>({});
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  
  // Settings & Device
  const [currentDeviceName, setCurrentDeviceName] = useState<string>(() => {
    return localStorage.getItem('device_name') || 'مستر أحمد الشعراوي - الهاتف الرئيسي';
  });
  const [defaultFee, setDefaultFee] = useState<number>(250);

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [studentForPayment, setStudentForPayment] = useState<Student | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [syncAlert, setSyncAlert] = useState<string | null>(null);

  // Handle device name update
  const handleUpdateDeviceName = (name: string) => {
    setCurrentDeviceName(name);
    localStorage.setItem('device_name', name);
  };

  // 1. Initial Connection test
  useEffect(() => {
    testConnection().then((connected) => {
      setIsConnected(connected);
    });
  }, []);

  // 2. Real-time Listeners for Students (Instant sync across phones)
  useEffect(() => {
    const studentsCol = collection(db, 'students');
    const unsubStudents = onSnapshot(
      studentsCol,
      (snapshot) => {
        const list: Student[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        // Sort by studentCode numeric or creation
        list.sort((a, b) => {
          const codeA = parseInt(a.studentCode.replace(/\D/g, ''), 10) || 0;
          const codeB = parseInt(b.studentCode.replace(/\D/g, ''), 10) || 0;
          return codeA - codeB;
        });
        setStudents(list);
        setIsLoading(false);
        setIsConnected(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
      }
    );

    return () => unsubStudents();
  }, []);

  // 3. Real-time Listeners for Monthly Records
  useEffect(() => {
    const recordsCol = collection(db, 'monthly_records');
    const unsubRecords = onSnapshot(
      recordsCol,
      (snapshot) => {
        const recMap: Record<string, MonthlyRecord> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MonthlyRecord;
          recMap[docSnap.id] = { ...data, id: docSnap.id };
        });
        setMonthlyRecords(recMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'monthly_records');
      }
    );

    return () => unsubRecords();
  }, []);

  // 4. Real-time Listeners for Payment Transactions
  useEffect(() => {
    const transCol = collection(db, 'payment_transactions');
    const unsubTransactions = onSnapshot(
      transCol,
      (snapshot) => {
        const transList: PaymentTransaction[] = [];
        snapshot.forEach((docSnap) => {
          transList.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        // Sort descending by date
        transList.sort((a, b) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
        setTransactions(transList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payment_transactions');
      }
    );

    return () => unsubTransactions();
  }, []);

  // Calculate Next Suggested Student Code
  const suggestedStudentCode = useMemo(() => {
    if (students.length === 0) return '1001';
    let max = 1000;
    for (const s of students) {
      const num = parseInt(s.studentCode.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
    return String(max + 1);
  }, [students]);

  // Current Month Label
  const currentMonthLabel = useMemo(() => {
    return getMonthLabel(currentMonthKey);
  }, [currentMonthKey]);

  // Financial Statistics for Current Month
  const currentMonthStats = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === 'active');
    let totalRequired = 0;
    let totalCollected = 0;

    for (const s of activeStudents) {
      const recKey = `${s.id}_${currentMonthKey}`;
      const rec = monthlyRecords[recKey];
      const req = rec?.requiredAmount ?? s.monthlyFee;
      const paid = rec?.paidAmount ?? 0;
      totalRequired += req;
      totalCollected += paid;
    }

    const totalRemaining = Math.max(0, totalRequired - totalCollected);

    // Today's collected sum from transactions
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCollected = transactions
      .filter((t) => (t.paymentDate || t.createdAt || '').startsWith(todayStr))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      totalRequired,
      totalCollected,
      totalRemaining,
      todayCollected,
    };
  }, [students, monthlyRecords, transactions, currentMonthKey]);

  // Save or Update Student
  const handleSaveStudent = async (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      if (studentToEdit) {
        // Update existing
        const docRef = doc(db, 'students', studentToEdit.id);
        await setDoc(docRef, {
          ...data,
          updatedAt: now,
          createdAt: studentToEdit.createdAt || now,
        }, { merge: true });
      } else {
        // Create new
        const newId = `stu_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const docRef = doc(db, 'students', newId);
        await setDoc(docRef, {
          ...data,
          id: newId,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
    }
  };

  // Delete Student
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الطالب (${studentName}) نهائياً من المنظومة؟`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'students', studentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
    }
  };

  // Save Payment Record & Transaction
  const handleSavePayment = async (payload: {
    studentId: string;
    studentName: string;
    studentCode: string;
    monthKey: string;
    monthLabel: string;
    amountPaidNow: number;
    receiptNumber: string;
    recordedBy: string;
    note?: string;
  }) => {
    const recordId = `${payload.studentId}_${payload.monthKey}`;
    const targetStudent = students.find((s) => s.id === payload.studentId);
    const currentRec = monthlyRecords[recordId];

    const requiredFee = currentRec?.requiredAmount ?? (targetStudent?.monthlyFee || 250);
    const prevPaid = currentRec?.paidAmount ?? 0;
    const newPaid = prevPaid + payload.amountPaidNow;
    const newRemaining = Math.max(0, requiredFee - newPaid);

    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (newPaid >= requiredFee && requiredFee > 0) {
      status = 'paid';
    } else if (newPaid > 0) {
      status = 'partial';
    }

    const now = new Date().toISOString();

    try {
      // 1. Update Monthly Record in Firestore
      const recordDocRef = doc(db, 'monthly_records', recordId);
      await setDoc(recordDocRef, {
        id: recordId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        studentCode: payload.studentCode,
        monthKey: payload.monthKey,
        monthLabel: payload.monthLabel,
        requiredAmount: requiredFee,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status,
        lastPaymentDate: now,
        receiptNumber: payload.receiptNumber,
        updatedBy: payload.recordedBy,
        updatedAt: now,
      });

      // 2. Add Transaction Audit Log
      const transId = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const transDocRef = doc(db, 'payment_transactions', transId);
      await setDoc(transDocRef, {
        id: transId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        studentCode: payload.studentCode,
        monthKey: payload.monthKey,
        amount: payload.amountPaidNow,
        receiptNumber: payload.receiptNumber,
        recordedBy: payload.recordedBy,
        note: payload.note || '',
        paymentDate: now,
        createdAt: now,
      });

      // 3. Prepare Receipt Modal Data
      setReceiptData({
        receiptNumber: payload.receiptNumber,
        studentName: payload.studentName,
        studentCode: payload.studentCode,
        monthLabel: payload.monthLabel,
        amountPaidNow: payload.amountPaidNow,
        totalPaid: newPaid,
        requiredFee,
        remaining: newRemaining,
        recordedBy: payload.recordedBy,
        date: now,
        parentPhone: targetStudent?.parentPhone || '',
        studentPhone: targetStudent?.phone || '',
      });
      setIsReceiptModalOpen(true);

      return {
        receiptNumber: payload.receiptNumber,
        totalPaid: newPaid,
        remaining: newRemaining,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `monthly_records/${recordId}`);
    }
  };

  // Seed sample data for testing
  const handleSeedSampleData = async (count: number) => {
    const now = new Date().toISOString();
    const batchList = [];

    for (let i = 0; i < count; i++) {
      const sample = SAMPLE_STUDENTS[i % SAMPLE_STUDENTS.length];
      const codeNum = 1001 + students.length + i;
      const studentId = `stu_seed_${Date.now()}_${i}`;

      const newStudent: Student = {
        id: studentId,
        studentCode: String(codeNum),
        name: `${sample.name} (${i + 1})`,
        phone: sample.phone,
        parentPhone: sample.parentPhone,
        grade: sample.grade,
        groupName: sample.groupName,
        monthlyFee: sample.monthlyFee,
        notes: sample.notes,
        status: 'active',
        joinedDate: sample.joinedDate,
        createdAt: now,
        updatedAt: now,
      };

      batchList.push(newStudent);
      const docRef = doc(db, 'students', studentId);
      await setDoc(docRef, newStudent);
    }
  };

  // Bulk import from Excel
  const handleBulkImportStudents = async (list: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const studentId = `stu_imp_${Date.now()}_${i}`;
      const docRef = doc(db, 'students', studentId);
      await setDoc(docRef, {
        ...item,
        id: studentId,
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  // Open Payment for Student
  const handleOpenPayment = (student: Student) => {
    setStudentForPayment(student);
    setIsPaymentModalOpen(true);
  };

  // Open Edit for Student
  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setIsStudentModalOpen(true);
  };

  // Open Add New Student
  const handleOpenAddNew = () => {
    setStudentToEdit(null);
    setIsStudentModalOpen(true);
  };

  // Export current month to Excel
  const handleExportExcel = () => {
    exportToExcel(students, monthlyRecords, currentMonthKey);
  };

  // View Receipt from Treasury
  const handleViewReceiptFromTreasury = (trans: PaymentTransaction) => {
    const recKey = `${trans.studentId}_${trans.monthKey}`;
    const rec = monthlyRecords[recKey];
    const targetStudent = students.find((s) => s.id === trans.studentId);
    const req = rec?.requiredAmount ?? (targetStudent?.monthlyFee || 250);
    const paid = rec?.paidAmount ?? trans.amount;
    const remaining = rec?.remainingAmount ?? Math.max(0, req - paid);

    setReceiptData({
      receiptNumber: trans.receiptNumber,
      studentName: trans.studentName,
      studentCode: trans.studentCode,
      monthLabel: getMonthLabel(trans.monthKey),
      amountPaidNow: trans.amount,
      totalPaid: paid,
      requiredFee: req,
      remaining,
      recordedBy: trans.recordedBy,
      date: trans.paymentDate || trans.createdAt,
      parentPhone: targetStudent?.parentPhone || '',
      studentPhone: targetStudent?.phone || '',
    });
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navbar with Real-time indicator & Controls */}
      <Navbar
        teacherName={teacherName}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        months={academicMonths}
        currentMonthKey={currentMonthKey}
        setCurrentMonthKey={setCurrentMonthKey}
        currentDeviceName={currentDeviceName}
        onOpenStudyModal={() => setIsStudyModalOpen(true)}
        isConnected={isConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Real-time Alert Banner */}
        {syncAlert && (
          <div className="bg-emerald-600 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="font-bold">{syncAlert}</span>
            <button onClick={() => setSyncAlert(null)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Financial & Capacity Stats Cards */}
        <StatsCards
          totalStudents={currentMonthStats.totalStudents}
          activeStudents={currentMonthStats.activeStudents}
          totalRequired={currentMonthStats.totalRequired}
          totalCollected={currentMonthStats.totalCollected}
          totalRemaining={currentMonthStats.totalRemaining}
          todayCollected={currentMonthStats.todayCollected}
          monthLabel={currentMonthLabel}
        />

        {/* Tab 1: Students & Monthly Ledger */}
        {activeTab === 'students' && (
          <StudentTable
            students={students}
            monthlyRecords={monthlyRecords}
            currentMonthKey={currentMonthKey}
            monthLabel={currentMonthLabel}
            onOpenPayment={handleOpenPayment}
            onEditStudent={handleOpenEdit}
            onDeleteStudent={handleDeleteStudent}
            onAddNewStudent={handleOpenAddNew}
            onExportExcel={handleExportExcel}
            teacherName={teacherName}
          />
        )}

        {/* Tab 2: Treasury History & Audit Log */}
        {activeTab === 'treasury' && (
          <TreasuryHistory
            transactions={transactions}
            onViewReceipt={handleViewReceiptFromTreasury}
            teacherName={teacherName}
          />
        )}

        {/* Tab 3: Settings & Device Management */}
        {activeTab === 'settings' && (
          <SettingsView
            currentDeviceName={currentDeviceName}
            onUpdateDeviceName={handleUpdateDeviceName}
            defaultFee={defaultFee}
            onUpdateDefaultFee={setDefaultFee}
            onSeedSampleData={handleSeedSampleData}
            onBulkImportStudents={handleBulkImportStudents}
            teacherName={teacherName}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 mt-12 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-700">
            منظومة {teacherName} لإدارة الطلاب والمصروفات الشهرية • سعة 1000+ طالب ومزامنة سحابية فورية
          </p>
          <button
            onClick={() => setIsStudyModalOpen(true)}
            className="text-emerald-700 hover:text-emerald-800 font-bold underline"
          >
            عرض دراسة الاعتمادية الفنية والجدوى 100%
          </button>
        </div>
      </footer>

      {/* Modals */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSave={handleSaveStudent}
        initialStudent={studentToEdit}
        suggestedCode={suggestedStudentCode}
        defaultFee={defaultFee}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        student={studentForPayment}
        monthKey={currentMonthKey}
        monthLabel={currentMonthLabel}
        existingRecord={studentForPayment ? monthlyRecords[`${studentForPayment.id}_${currentMonthKey}`] : null}
        onSavePayment={handleSavePayment}
        currentDeviceName={currentDeviceName}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={receiptData}
        teacherName={teacherName}
      />

      <FeasibilityStudyModal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
      />
    </div>
  );
}
