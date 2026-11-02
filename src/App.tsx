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
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, testConnection, handleFirestoreError, OperationType } from './firebase';
import { Student, MonthlyRecord, PaymentTransaction } from './types';
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
import { LoginScreen } from './components/LoginScreen';
import { ResetSystemModal } from './components/ResetSystemModal';
import { RefundModal } from './components/RefundModal';

export default function App() {
  const teacherName = 'مستر أحمد الشعراوي';
  const academicMonths = useMemo(() => getAcademicMonths(), []);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('shaarawy_session_auth') === 'true';
  });
  const [systemPassword, setSystemPassword] = useState<string>('123456');

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

  // Dynamic Grades & Groups
  const [customGrades, setCustomGrades] = useState<string[]>([]);
  const availableGrades = useMemo(() => {
    const base = ['ثانية باكالوريا', 'ثالثة ثانوي'];
    return Array.from(new Set([...base, ...customGrades]));
  }, [customGrades]);

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [studentForPayment, setStudentForPayment] = useState<Student | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [transactionToRefund, setTransactionToRefund] = useState<PaymentTransaction | null>(null);
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

  // 2. Real-time Listener for System Password
  useEffect(() => {
    const authDocRef = doc(db, 'system_settings', 'auth');
    const unsubAuth = onSnapshot(authDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.password) {
          setSystemPassword(data.password);
        }
      } else {
        // Initialize with default 123456
        setDoc(authDocRef, {
          password: '123456',
          teacherName,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    });

    return () => unsubAuth();
  }, []);

  // 2.5 Real-time Listener for System Pricing (Default fee synchronized across all devices)
  useEffect(() => {
    const pricingDocRef = doc(db, 'system_settings', 'pricing');
    const unsubPricing = onSnapshot(pricingDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data?.defaultFee === 'number') {
          setDefaultFee(data.defaultFee);
        }
      } else {
        // Initialize with default 250
        setDoc(pricingDocRef, {
          defaultFee: 250,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    });

    return () => unsubPricing();
  }, []);

  // 2.6 Real-time Listener for Custom Groups / Educational Grades
  useEffect(() => {
    const gradesDocRef = doc(db, 'system_settings', 'grades');
    const unsubGrades = onSnapshot(gradesDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.list)) {
          setCustomGrades(data.list);
        }
      }
    });

    return () => unsubGrades();
  }, []);

  // 3. Real-time Listeners for Students (Instant sync across phones)
  useEffect(() => {
    const studentsCol = collection(db, 'students');
    const unsubStudents = onSnapshot(
      studentsCol,
      (snapshot) => {
        const list: Student[] = [];
        const baseAllowed = new Set(['ثانية باكالوريا', 'ثالثة ثانوي', ...customGrades]);

        snapshot.forEach((docSnap) => {
          const sData = docSnap.data() as Student;
          // Clean up and enforce: Only ثانية باكالوريا or ثالثة ثانوي (or custom grades explicitly added)
          if (sData.grade && !baseAllowed.has(sData.grade)) {
            const normalizedGrade = sData.grade.includes('ثالث') || sData.grade.includes('3') ? 'ثالثة ثانوي' : 'ثانية باكالوريا';
            setDoc(docSnap.ref, { grade: normalizedGrade, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            list.push({ ...sData, id: docSnap.id, grade: normalizedGrade });
          } else {
            list.push({ ...sData, id: docSnap.id });
          }
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
  }, [customGrades]);

  // 4. Real-time Listeners for Monthly Records
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

  // 5. Real-time Listeners for Payment Transactions
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

  // Login handler
  const handleLogin = (enteredPass: string): boolean => {
    if (enteredPass === systemPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('shaarawy_session_auth', 'true');
      return true;
    }
    return false;
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('shaarawy_session_auth');
  };

  // Update password in Firestore
  const handleUpdatePassword = async (currentPass: string, newPass: string): Promise<boolean> => {
    if (currentPass !== systemPassword) {
      return false;
    }
    const authDocRef = doc(db, 'system_settings', 'auth');
    await setDoc(authDocRef, {
      password: newPass,
      teacherName,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    setSystemPassword(newPass);
    return true;
  };

  // Add new grade/stage dynamically and sync to all devices
  const handleAddNewGrade = async (gradeName: string) => {
    const trimmed = gradeName.trim();
    if (!trimmed || availableGrades.includes(trimmed)) return;
    try {
      const updated = Array.from(new Set([...customGrades, trimmed]));
      const gradesDocRef = doc(db, 'system_settings', 'grades');
      await setDoc(gradesDocRef, {
        list: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setCustomGrades(updated);
      setSyncAlert(`✅ تم بنجاح إضافة الصف/المرحلة الجديدة (${trimmed}) ومزامنتها على جميع الأجهزة!`);
      setTimeout(() => setSyncAlert(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/grades');
    }
  };

  // Update Fee across all students, monthly records, and all devices in real-time
  const handleUpdateDefaultFee = async (newFee: number) => {
    try {
      const now = new Date().toISOString();

      // 1. Update system pricing document in Firestore (triggers real-time on all phones)
      const pricingDocRef = doc(db, 'system_settings', 'pricing');
      await setDoc(pricingDocRef, {
        defaultFee: newFee,
        updatedAt: now,
      }, { merge: true });
      setDefaultFee(newFee);

      // 2. Update monthlyFee on all students in Firestore, preserving any custom discounts!
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentUpdates = studentsSnap.docs.map((sDoc) => {
        const student = sDoc.data() as Student;
        let studentFee = newFee;
        if (student.hasDiscount || (student.discountAmount && student.discountAmount > 0) || student.isFullExemption) {
          if (student.isFullExemption) {
            studentFee = 0;
          } else if (student.discountAmount && student.discountAmount > 0) {
            studentFee = Math.max(0, newFee - student.discountAmount);
          }
        }
        return setDoc(sDoc.ref, {
          monthlyFee: studentFee,
          updatedAt: now,
        }, { merge: true });
      });
      await Promise.all(studentUpdates);

      // 3. Recalculate ALL monthly records in Firestore respecting individual discounts
      const recordsSnap = await getDocs(collection(db, 'monthly_records'));
      const recordUpdates = recordsSnap.docs.map((rDoc) => {
        const rec = rDoc.data() as MonthlyRecord;
        const targetStudent = students.find((s) => s.id === rec.studentId);
        let studentFee = newFee;
        if (targetStudent?.hasDiscount || (targetStudent?.discountAmount && targetStudent.discountAmount > 0) || targetStudent?.isFullExemption) {
          if (targetStudent.isFullExemption) {
            studentFee = 0;
          } else if (targetStudent.discountAmount && targetStudent.discountAmount > 0) {
            studentFee = Math.max(0, newFee - targetStudent.discountAmount);
          }
        }
        const paid = rec.paidAmount || 0;
        const newRemaining = Math.max(0, studentFee - paid);
        let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if ((paid >= studentFee && studentFee > 0) || (studentFee === 0 && paid === 0)) {
          status = 'paid';
        } else if (paid > 0) {
          status = 'partial';
        }
        return setDoc(rDoc.ref, {
          requiredAmount: studentFee,
          remainingAmount: newRemaining,
          status,
          updatedAt: now,
        }, { merge: true });
      });
      await Promise.all(recordUpdates);

      setSyncAlert(`✅ تم تغيير السعر إلى ${newFee} ج.م، وتحديث المطلوب لجميع الطلاب مع الاحتفاظ بخصومات الطلاب المستحقين وإعادة حساب المتبقي ومزامنته للجميع!`);
      setTimeout(() => setSyncAlert(null), 6000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/pricing');
    }
  };

  // Available groups collected dynamically from all students
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.groupName && s.groupName.trim()) {
        set.add(s.groupName.trim());
      }
    });
    return Array.from(set).sort();
  }, [students]);

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

  // Delete Individual Student
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

  // Reset System / End of Accounts (Full Deletion with Password Verification)
  const handleConfirmReset = async (password: string): Promise<boolean> => {
    if (password !== systemPassword) {
      return false;
    }

    try {
      // 1. Delete all students
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentPromises = studentsSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(studentPromises);

      // 2. Delete all monthly records
      const recordsSnap = await getDocs(collection(db, 'monthly_records'));
      const recordPromises = recordsSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(recordPromises);

      // 3. Delete all payment transactions
      const transSnap = await getDocs(collection(db, 'payment_transactions'));
      const transPromises = transSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(transPromises);

      // Explicitly keep system_settings/auth (password) untouched and intact
      // Reset local state
      setStudents([]);
      setMonthlyRecords({});
      setTransactions([]);

      setSyncAlert('🎉 تم بنجاح تقفيل جميع الحسابات وتصفير الطلاب والبدء من جديد (مع بقاء كلمة المرور كما هي دون أي تغيير)!');
      setTimeout(() => setSyncAlert(null), 6000);
      return true;
    } catch (err) {
      console.error('Reset error:', err);
      throw err;
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
        discountAmount: targetStudent?.discountAmount || 0,
        discountReason: targetStudent?.discountReason || '',
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

  // Refund / Cancel Payment Transaction & update student ledger
  const handleRefundPayment = async (payload: {
    transactionId?: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    monthKey: string;
    monthLabel?: string;
    refundAmount: number;
    receiptNumber?: string;
    reason: string;
    recordedBy: string;
    originalReceiptNumber?: string;
  }) => {
    const recordId = `${payload.studentId}_${payload.monthKey}`;
    const targetStudent = students.find((s) => s.id === payload.studentId);
    const currentRec = monthlyRecords[recordId];

    const requiredFee = currentRec?.requiredAmount ?? (targetStudent?.monthlyFee || 250);
    const prevPaid = currentRec?.paidAmount ?? 0;
    const newPaid = Math.max(0, prevPaid - payload.refundAmount);
    const newRemaining = Math.max(0, requiredFee - newPaid);

    let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (newPaid >= requiredFee && requiredFee > 0) {
      status = 'paid';
    } else if (newPaid > 0) {
      status = 'partial';
    }

    const now = new Date().toISOString();
    const receiptNo = payload.receiptNumber || `REF-${generateReceiptNumber().replace('REC-', '')}`;

    try {
      // 1. Update Monthly Record in Firestore
      const recordDocRef = doc(db, 'monthly_records', recordId);
      await setDoc(recordDocRef, {
        id: recordId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        studentCode: payload.studentCode,
        monthKey: payload.monthKey,
        monthLabel: payload.monthLabel || getMonthLabel(payload.monthKey),
        requiredAmount: requiredFee,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status,
        lastPaymentDate: now,
        notes: `تم استرجاع مبلغ ${payload.refundAmount} ج.م في ${new Date().toLocaleDateString('ar-EG')} (السبب: ${payload.reason})`,
        updatedBy: payload.recordedBy,
        updatedAt: now,
      }, { merge: true });

      // 2. If a specific transaction is being cancelled/refunded, mark it
      if (payload.transactionId) {
        const origTransDocRef = doc(db, 'payment_transactions', payload.transactionId);
        await setDoc(origTransDocRef, {
          isRefunded: true,
          refundedAmount: payload.refundAmount,
          refundReason: payload.reason,
          refundDate: now,
          refundedBy: payload.recordedBy,
        }, { merge: true });
      }

      // 3. Add Refund Transaction Audit Log (negative amount so net treasury adjusts)
      const transId = `tx_ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const transDocRef = doc(db, 'payment_transactions', transId);
      await setDoc(transDocRef, {
        id: transId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        studentCode: payload.studentCode,
        monthKey: payload.monthKey,
        amount: -payload.refundAmount,
        type: 'refund',
        receiptNumber: receiptNo,
        originalTransactionId: payload.transactionId || '',
        originalReceiptNumber: payload.originalReceiptNumber || '',
        recordedBy: payload.recordedBy,
        refundReason: payload.reason,
        note: `استرجاع مبلغ: ${payload.reason}`,
        paymentDate: now,
        createdAt: now,
      });

      // 4. Prepare Receipt Modal Data (Refund Receipt)
      setReceiptData({
        receiptNumber: receiptNo,
        studentName: payload.studentName,
        studentCode: payload.studentCode,
        monthLabel: payload.monthLabel || getMonthLabel(payload.monthKey),
        amountPaidNow: payload.refundAmount,
        totalPaid: newPaid,
        requiredFee,
        remaining: newRemaining,
        recordedBy: payload.recordedBy,
        date: now,
        parentPhone: targetStudent?.parentPhone || '',
        studentPhone: targetStudent?.phone || '',
        isRefund: true,
        refundReason: payload.reason,
      });
      setIsReceiptModalOpen(true);

      setSyncAlert(`↩️ تم بنجاح استرجاع مبلغ ${payload.refundAmount} ج.م للطالب (${payload.studentName}) وتحديث الخزينة وحسابه فوراً!`);
      setTimeout(() => setSyncAlert(null), 7000);

      return {
        receiptNumber: receiptNo,
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
    const paid = rec?.paidAmount ?? (trans.type === 'refund' ? 0 : trans.amount);
    const remaining = rec?.remainingAmount ?? Math.max(0, req - paid);
    const isRefund = trans.type === 'refund' || !!trans.isRefunded;

    setReceiptData({
      receiptNumber: trans.receiptNumber,
      studentName: trans.studentName,
      studentCode: trans.studentCode,
      monthLabel: getMonthLabel(trans.monthKey),
      amountPaidNow: Math.abs(trans.amount),
      totalPaid: paid,
      requiredFee: req,
      remaining,
      recordedBy: trans.recordedBy,
      date: trans.paymentDate || trans.createdAt,
      parentPhone: targetStudent?.parentPhone || '',
      studentPhone: targetStudent?.phone || '',
      isRefund,
      refundReason: trans.refundReason,
      discountAmount: targetStudent?.discountAmount || 0,
      discountReason: targetStudent?.discountReason || '',
    });
    setIsReceiptModalOpen(true);
  };

  // If user is not authenticated, show Login Screen
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        teacherName={teacherName}
      />
    );
  }

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
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onLogout={handleLogout}
        isConnected={isConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Real-time Alert Banner */}
        {syncAlert && (
          <div className="bg-emerald-600 text-white text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
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
            availableGrades={availableGrades}
          />
        )}

        {/* Tab 2: Treasury History & Audit Log */}
        {activeTab === 'treasury' && (
          <TreasuryHistory
            transactions={transactions}
            onViewReceipt={handleViewReceiptFromTreasury}
            onOpenRefund={(t) => {
              setTransactionToRefund(t);
              setIsRefundModalOpen(true);
            }}
            teacherName={teacherName}
          />
        )}

        {/* Tab 3: Settings & Device Management */}
        {activeTab === 'settings' && (
          <SettingsView
            currentDeviceName={currentDeviceName}
            onUpdateDeviceName={handleUpdateDeviceName}
            defaultFee={defaultFee}
            onUpdateDefaultFee={handleUpdateDefaultFee}
            onSeedSampleData={handleSeedSampleData}
            onBulkImportStudents={handleBulkImportStudents}
            teacherName={teacherName}
            onUpdatePassword={handleUpdatePassword}
            onOpenResetModal={() => setIsResetModalOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 mt-12 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-700">
            منظومة {teacherName} لإدارة الطلاب والمصروفات الشهرية • سعة 1000+ طالب ومزامنة سحابية فورية
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="text-red-600 hover:text-red-700 font-bold"
            >
              تقفيل الحسابات وتصفير الطلاب
            </button>
            <button
              onClick={() => setIsStudyModalOpen(true)}
              className="text-emerald-700 hover:text-emerald-800 font-bold underline"
            >
              عرض دراسة الاعتمادية الفنية 100%
            </button>
          </div>
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
        availableGrades={availableGrades}
        onAddNewGrade={handleAddNewGrade}
        availableGroups={availableGroups}
      />

      {isPaymentModalOpen && studentForPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          student={studentForPayment}
          monthKey={currentMonthKey}
          monthLabel={currentMonthLabel}
          existingRecord={monthlyRecords[`${studentForPayment.id}_${currentMonthKey}`] || null}
          onSavePayment={handleSavePayment}
          onRefundPayment={handleRefundPayment}
          currentDeviceName={currentDeviceName}
        />
      )}

      {isRefundModalOpen && transactionToRefund && (
        <RefundModal
          isOpen={isRefundModalOpen}
          onClose={() => {
            setIsRefundModalOpen(false);
            setTransactionToRefund(null);
          }}
          transaction={transactionToRefund}
          onConfirmRefund={handleRefundPayment}
          currentDeviceName={currentDeviceName}
        />
      )}

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={receiptData}
        teacherName={teacherName}
      />

      <ResetSystemModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleConfirmReset}
        onExportBackup={handleExportExcel}
        studentsCount={students.length}
      />

      <FeasibilityStudyModal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
      />
    </div>
  );
}
