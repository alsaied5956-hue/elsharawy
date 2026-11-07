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
import { Student, MonthlyRecord, PaymentTransaction, SystemUser, UserRole } from './types';
import { 
  getAcademicMonths, 
  getCurrentMonthKey, 
  getMonthLabel, 
  exportToExcel, 
  generateReceiptNumber,
  parseStudentsFromExcel,
  getArabicDayName,
  formatArabicDateOnly,
  formatArabicTimeOnly
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
import { PrintReportModal } from './components/PrintReportModal';

export default function App() {
  const teacherName = 'مستر أحمد الشعراوي';
  const academicMonths = useMemo(() => getAcademicMonths(), []);
  
  // Multi-user & Authentication State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('shaarawy_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [systemPassword, setSystemPassword] = useState<string>('123456');

  // App Navigation & Device
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

  // Print PDF report modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printReportMode, setPrintReportMode] = useState<'paid' | 'unpaid' | 'all'>('paid');

  const handleOpenPrintReport = (mode: 'paid' | 'unpaid' | 'all') => {
    setPrintReportMode(mode);
    setIsPrintModalOpen(true);
  };

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
  }, [teacherName]);

  // 2.1 Real-time Listener for Staff / Assistants Profiles in system_settings/users
  useEffect(() => {
    const usersDocRef = doc(db, 'system_settings', 'users');
    const unsubUsers = onSnapshot(
      usersDocRef,
      (docSnap) => {
        let userList: SystemUser[] = [];
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.list)) {
            userList = data.list;
          }
        }

        // Ensure default Admin / Owner account always exists
        const defaultAdmin: SystemUser = {
          id: 'user_admin_owner',
          name: teacherName,
          username: 'admin',
          password: systemPassword || '123456',
          role: 'admin',
          status: 'active',
          notes: 'حساب المالك الرئيسي للمنظومة',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (userList.length === 0) {
          userList = [defaultAdmin];
          setDoc(usersDocRef, { list: userList, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        } else {
          // Keep admin password synced with system_settings/auth
          const adminIdx = userList.findIndex(u => u.role === 'admin' || u.id === 'user_admin_owner');
          if (adminIdx >= 0 && systemPassword && userList[adminIdx].password !== systemPassword) {
            userList[adminIdx].password = systemPassword;
          }
        }

        // Sort: Admin first, then assistants by Arabic name
        userList.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return a.name.localeCompare(b.name, 'ar');
        });
        setUsers(userList);

        // Keep current logged-in user refreshed with database changes
        setCurrentUser((prev) => {
          if (!prev) return null;
          const fresh = userList.find((u) => u.id === prev.id);
          if (fresh) {
            sessionStorage.setItem('shaarawy_current_user', JSON.stringify(fresh));
            return fresh;
          }
          return prev;
        });
      },
      (error) => {
        console.warn('Users listener fallback:', error);
      }
    );

    return () => unsubUsers();
  }, [teacherName, systemPassword]);

  // 2.5 Real-time Listener for System Pricing
  useEffect(() => {
    const pricingDocRef = doc(db, 'system_settings', 'pricing');
    const unsubPricing = onSnapshot(pricingDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data?.defaultFee === 'number') {
          setDefaultFee(data.defaultFee);
        }
      } else {
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
          if (sData.grade && !baseAllowed.has(sData.grade)) {
            const normalizedGrade = sData.grade.includes('ثالث') || sData.grade.includes('3') ? 'ثالثة ثانوي' : 'ثانية باكالوريا';
            setDoc(docSnap.ref, { grade: normalizedGrade, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            list.push({ ...sData, id: docSnap.id, grade: normalizedGrade });
          } else {
            list.push({ ...sData, id: docSnap.id });
          }
        });

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
        transList.sort((a, b) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
        setTransactions(transList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payment_transactions');
      }
    );

    return () => unsubTransactions();
  }, []);

  // Multi-user Login handler
  const handleLogin = async (usernameOrId: string, passwordInput?: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedInput = usernameOrId.trim();
    const cleanPass = (passwordInput || '').trim();

    // Case 1: Direct single password entry (or fallback to master password)
    if (!cleanPass && trimmedInput) {
      if (trimmedInput === systemPassword) {
        const owner = users.find((u) => u.role === 'admin') || {
          id: 'user_admin_owner',
          name: teacherName,
          username: 'admin',
          password: systemPassword,
          role: 'admin' as const,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCurrentUser(owner);
        sessionStorage.setItem('shaarawy_current_user', JSON.stringify(owner));
        return { success: true };
      }
      return { success: false, message: 'كلمة المرور غير صحيحة' };
    }

    // Case 2: Matching user by username or ID
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === trimmedInput.toLowerCase() ||
        u.name.toLowerCase() === trimmedInput.toLowerCase() ||
        u.id === trimmedInput
    );

    if (!user) {
      if (trimmedInput.toLowerCase() === 'admin' && cleanPass === systemPassword) {
        const owner = users.find((u) => u.role === 'admin') || {
          id: 'user_admin_owner',
          name: teacherName,
          username: 'admin',
          password: systemPassword,
          role: 'admin' as const,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCurrentUser(owner);
        sessionStorage.setItem('shaarawy_current_user', JSON.stringify(owner));
        return { success: true };
      }
      return { success: false, message: 'اسم المستخدم غير مسجل في السيستم' };
    }

    if (user.status === 'disabled') {
      return { success: false, message: 'هذا الحساب مجمّد أو معطل بواسطة المالك الرئيسي' };
    }

    if (user.password !== cleanPass && cleanPass !== systemPassword) {
      return { success: false, message: 'كلمة المرور غير صحيحة، يرجى إعادة المحاولة' };
    }

    setCurrentUser(user);
    sessionStorage.setItem('shaarawy_current_user', JSON.stringify(user));
    return { success: true };
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('shaarawy_current_user');
  };

  // User CRUD operations for Admin stored securely in system_settings/users
  const handleAddUser = async (userData: Omit<SystemUser, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();
      const newUser: SystemUser = {
        ...userData,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };
      const updatedList = [...users, newUser];
      setUsers(updatedList);
      const usersDocRef = doc(db, 'system_settings', 'users');
      await setDoc(usersDocRef, { list: updatedList, updatedAt: now }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/users');
    }
  };

  const handleUpdateUser = async (userId: string, data: Partial<SystemUser>) => {
    try {
      const now = new Date().toISOString();
      const updatedList = users.map(u => u.id === userId ? { ...u, ...data, updatedAt: now } : u);
      setUsers(updatedList);
      const usersDocRef = doc(db, 'system_settings', 'users');
      await setDoc(usersDocRef, { list: updatedList, updatedAt: now }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/users');
    }
  };

  const handleResetUserPassword = async (userId: string, newPass: string): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const updatedList = users.map(u => u.id === userId ? { ...u, password: newPass, updatedAt: now } : u);
      setUsers(updatedList);
      const usersDocRef = doc(db, 'system_settings', 'users');
      await setDoc(usersDocRef, { list: updatedList, updatedAt: now }, { merge: true });

      const targetUser = users.find((u) => u.id === userId);
      if (targetUser?.role === 'admin' || targetUser?.id === 'user_admin_owner') {
        const authDocRef = doc(db, 'system_settings', 'auth');
        await setDoc(authDocRef, {
          password: newPass,
          updatedAt: now,
        }, { merge: true });
        setSystemPassword(newPass);
      }
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/users');
      return false;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const now = new Date().toISOString();
      const updatedList = users.filter(u => u.id !== userId);
      setUsers(updatedList);
      const usersDocRef = doc(db, 'system_settings', 'users');
      await setDoc(usersDocRef, { list: updatedList, updatedAt: now }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/users');
    }
  };

  // Update personal password in Firestore
  const handleUpdatePassword = async (currentPass: string, newPass: string): Promise<boolean> => {
    if (!currentUser) return false;
    if (currentUser.password !== currentPass && currentPass !== systemPassword) {
      return false;
    }

    try {
      const now = new Date().toISOString();
      const updatedList = users.map(u => u.id === currentUser.id ? { ...u, password: newPass, updatedAt: now } : u);
      setUsers(updatedList);
      const usersDocRef = doc(db, 'system_settings', 'users');
      await setDoc(usersDocRef, { list: updatedList, updatedAt: now }, { merge: true });

      if (currentUser.role === 'admin') {
        const authDocRef = doc(db, 'system_settings', 'auth');
        await setDoc(authDocRef, {
          password: newPass,
          teacherName,
          updatedAt: now,
        }, { merge: true });
        setSystemPassword(newPass);
      }

      const updated = { ...currentUser, password: newPass };
      setCurrentUser(updated);
      sessionStorage.setItem('shaarawy_current_user', JSON.stringify(updated));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_settings/users');
      return false;
    }
  };

  // Add new grade dynamically
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
      setSyncAlert(`✅ تم بنجاح إضافة الصف (${trimmed}) ومزامنته للجميع!`);
      setTimeout(() => setSyncAlert(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/grades');
    }
  };

  // Update Default Fee (Admin Only)
  const handleUpdateDefaultFee = async (newFee: number) => {
    try {
      const now = new Date().toISOString();

      const pricingDocRef = doc(db, 'system_settings', 'pricing');
      await setDoc(pricingDocRef, {
        defaultFee: newFee,
        updatedAt: now,
      }, { merge: true });
      setDefaultFee(newFee);

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

      setSyncAlert(`✅ تم تغيير السعر إلى ${newFee} ج.م وتحديث المتبقي لجميع الطلاب!`);
      setTimeout(() => setSyncAlert(null), 6000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/pricing');
    }
  };

  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.groupName && s.groupName.trim()) {
        set.add(s.groupName.trim());
      }
    });
    return Array.from(set).sort();
  }, [students]);

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

  const currentMonthLabel = useMemo(() => {
    return getMonthLabel(currentMonthKey);
  }, [currentMonthKey]);

  // Current Month Stats
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

  // Student CRUD
  const handleSaveStudent = async (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      if (studentToEdit) {
        const docRef = doc(db, 'students', studentToEdit.id);
        await setDoc(docRef, {
          ...data,
          updatedAt: now,
          createdAt: studentToEdit.createdAt || now,
        }, { merge: true });
      } else {
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

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('عفواً، حذف الطلاب خاص بالمالك الرئيسي (الأدمن) فقط لضمان سلامة الحسابات');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف الطالب (${studentName}) نهائياً من المنظومة؟`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'students', studentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
    }
  };

  const handleConfirmReset = async (password: string): Promise<boolean> => {
    if (password !== systemPassword && password !== currentUser?.password) {
      return false;
    }

    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      await Promise.all(studentsSnap.docs.map((d) => deleteDoc(d.ref)));

      const recordsSnap = await getDocs(collection(db, 'monthly_records'));
      await Promise.all(recordsSnap.docs.map((d) => deleteDoc(d.ref)));

      const transSnap = await getDocs(collection(db, 'payment_transactions'));
      await Promise.all(transSnap.docs.map((d) => deleteDoc(d.ref)));

      setStudents([]);
      setMonthlyRecords({});
      setTransactions([]);

      setSyncAlert('🎉 تم بنجاح تقفيل جميع الحسابات وتصفير الطلاب والبدء من جديد (مع بقاء الحسابات كما هي)!');
      setTimeout(() => setSyncAlert(null), 6000);
      return true;
    } catch (err) {
      console.error('Reset error:', err);
      throw err;
    }
  };

  // Save Payment Record & Transaction Audit Log (With Day, Date, Exact Time, and Assistant Name)
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
    const dayName = getArabicDayName(now);
    const dateFormatted = formatArabicDateOnly(now);
    const timeFormatted = formatArabicTimeOnly(now);

    const recorderName = payload.recordedBy || (currentUser 
      ? `${currentUser.name} (${currentUser.role === 'admin' ? 'المالك الرئيسي' : 'مساعد تحصيل'})` 
      : currentDeviceName);

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
        updatedBy: recorderName,
        updatedByUserId: currentUser?.id || 'admin',
        updatedAt: now,
      });

      // 2. Add Detailed Transaction Audit Log (Who, When, Day, Time, Amount)
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
        recordedBy: recorderName,
        recordedByUserId: currentUser?.id || 'admin',
        recordedByRole: currentUser?.role || 'admin',
        paymentDayName: dayName,
        formattedDate: dateFormatted,
        formattedTime: timeFormatted,
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
        recordedBy: recorderName,
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

  // Refund Payment
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
    const dayName = getArabicDayName(now);
    const dateFormatted = formatArabicDateOnly(now);
    const timeFormatted = formatArabicTimeOnly(now);
    const receiptNo = payload.receiptNumber || `REF-${generateReceiptNumber().replace('REC-', '')}`;

    const recorderName = payload.recordedBy || (currentUser 
      ? `${currentUser.name} (${currentUser.role === 'admin' ? 'المالك الرئيسي' : 'مساعد تحصيل'})` 
      : currentDeviceName);

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
        notes: `تم استرجاع ${payload.refundAmount} ج.م في ${dayName} ${dateFormatted} (${timeFormatted}) بواسطة ${recorderName} (السبب: ${payload.reason})`,
        updatedBy: recorderName,
        updatedAt: now,
      }, { merge: true });

      // 2. Mark original transaction if present
      if (payload.transactionId) {
        const origTransDocRef = doc(db, 'payment_transactions', payload.transactionId);
        await setDoc(origTransDocRef, {
          isRefunded: true,
          refundedAmount: payload.refundAmount,
          refundReason: payload.reason,
          refundDate: now,
          refundedBy: recorderName,
        }, { merge: true });
      }

      // 3. Add Refund Transaction Audit Log
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
        recordedBy: recorderName,
        recordedByUserId: currentUser?.id || 'admin',
        recordedByRole: currentUser?.role || 'admin',
        paymentDayName: dayName,
        formattedDate: dateFormatted,
        formattedTime: timeFormatted,
        refundReason: payload.reason,
        note: `استرجاع مبلغ: ${payload.reason}`,
        paymentDate: now,
        createdAt: now,
      });

      // 4. Prepare Receipt Modal Data
      setReceiptData({
        receiptNumber: receiptNo,
        studentName: payload.studentName,
        studentCode: payload.studentCode,
        monthLabel: payload.monthLabel || getMonthLabel(payload.monthKey),
        amountPaidNow: payload.refundAmount,
        totalPaid: newPaid,
        requiredFee,
        remaining: newRemaining,
        recordedBy: recorderName,
        date: now,
        parentPhone: targetStudent?.parentPhone || '',
        studentPhone: targetStudent?.phone || '',
        isRefund: true,
        refundReason: payload.reason,
      });
      setIsReceiptModalOpen(true);

      setSyncAlert(`↩️ تم بنجاح استرجاع ${payload.refundAmount} ج.م للطالب (${payload.studentName}) وتوثيق العملية في سجل الخزينة!`);
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

  // Seed sample data
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
    const existingByCode = new Map<string, Student>();
    const existingByName = new Map<string, Student>();
    students.forEach((s) => {
      if (s.studentCode && s.studentCode.trim()) {
        existingByCode.set(s.studentCode.trim(), s);
      }
      if (s.name && s.name.trim()) {
        existingByName.set(s.name.trim(), s);
      }
    });

    let updatedCount = 0;
    let addedCount = 0;

    const BATCH_SIZE = 400;
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const chunk = list.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((item, chunkIdx) => {
        const cleanCode = item.studentCode ? item.studentCode.trim() : '';
        const cleanName = item.name ? item.name.trim() : '';
        const existing = (cleanCode ? existingByCode.get(cleanCode) : undefined) || (cleanName ? existingByName.get(cleanName) : undefined);

        if (existing) {
          updatedCount++;
          const docRef = doc(db, 'students', existing.id);
          batch.set(
            docRef,
            {
              ...item,
              id: existing.id,
              studentCode: cleanCode || existing.studentCode,
              hasDiscount: existing.hasDiscount ?? item.hasDiscount,
              discountAmount: existing.discountAmount ?? item.discountAmount,
              discountReason: existing.discountReason || item.discountReason,
              isFullExemption: existing.isFullExemption ?? item.isFullExemption,
              createdAt: existing.createdAt || now,
              updatedAt: now,
            },
            { merge: true }
          );
        } else {
          addedCount++;
          const generatedId = `stu_${cleanCode || Date.now()}_${i + chunkIdx}`;
          const docRef = doc(db, 'students', generatedId);
          batch.set(
            docRef,
            {
              ...item,
              id: generatedId,
              studentCode: cleanCode || String(1001 + students.length + addedCount),
              createdAt: now,
              updatedAt: now,
            },
            { merge: true }
          );
        }
      });

      await batch.commit();
    }

    setSyncAlert(`🎉 تم بنجاح معالجة واستيراد ${list.length} طالب من ملف Excel (${addedCount} جديد، و${updatedCount} تم تحديث بياناتهم) دون تضارب!`);
    setTimeout(() => setSyncAlert(null), 6000);
  };

  const handleBulkImportExcelFile = async (file: File) => {
    const imported = await parseStudentsFromExcel(file, defaultFee);
    if (imported.length > 0) {
      await handleBulkImportStudents(imported);
    }
  };

  const handleOpenPayment = (student: Student) => {
    setStudentForPayment(student);
    setIsPaymentModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setIsStudentModalOpen(true);
  };

  const handleOpenAddNew = () => {
    setStudentToEdit(null);
    setIsStudentModalOpen(true);
  };

  const handleExportExcel = () => {
    exportToExcel(students, monthlyRecords, currentMonthKey);
  };

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

  // If user is not authenticated, show Multi-user Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        teacherName={teacherName}
        users={users}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navbar with Real-time indicator, Profiles & Controls */}
      <Navbar
        teacherName={teacherName}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        months={academicMonths}
        currentMonthKey={currentMonthKey}
        setCurrentMonthKey={setCurrentMonthKey}
        currentDeviceName={currentDeviceName}
        currentUser={currentUser}
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
          onOpenPrintReport={handleOpenPrintReport}
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
            onBulkImportExcel={currentUser.role === 'admin' ? handleBulkImportExcelFile : undefined}
            onOpenPrintReport={handleOpenPrintReport}
            teacherName={teacherName}
            availableGrades={availableGrades}
            currentUser={currentUser}
          />
        )}

        {/* Tab 2: Treasury History & Audit Log */}
        {activeTab === 'treasury' && (
          <TreasuryHistory
            transactions={transactions}
            onViewReceipt={handleViewReceiptFromTreasury}
            onOpenRefund={currentUser.role === 'admin' ? (t) => {
              setTransactionToRefund(t);
              setIsRefundModalOpen(true);
            } : undefined}
            teacherName={teacherName}
          />
        )}

        {/* Tab 3: Settings & Device Management & Staff Profiles */}
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
            currentUser={currentUser}
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onResetUserPassword={handleResetUserPassword}
            onDeleteUser={handleDeleteUser}
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
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="text-red-600 hover:text-red-700 font-bold"
              >
                تقفيل الحسابات وتصفير الطلاب
              </button>
            )}
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
          onRefundPayment={currentUser.role === 'admin' ? handleRefundPayment : undefined}
          currentDeviceName={currentDeviceName}
          currentUser={currentUser}
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

      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        initialMode={printReportMode}
        students={students}
        monthlyRecords={monthlyRecords}
        transactions={transactions}
        currentMonthKey={currentMonthKey}
        monthLabel={currentMonthLabel}
        teacherName={teacherName}
        availableGrades={availableGrades}
        currentDeviceName={currentDeviceName}
      />
    </div>
  );
}
