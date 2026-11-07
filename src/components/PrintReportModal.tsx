import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Filter, 
  Phone, 
  FileText,
  DollarSign,
  Download,
  Calendar,
  Clock,
  UserCheck,
  ShieldCheck,
  CalendarDays,
  Layers
} from 'lucide-react';
import { Student, MonthlyRecord, PaymentTransaction } from '../types';
import { 
  formatCurrency, 
  formatDateTime, 
  getArabicDayName, 
  formatArabicDateOnly, 
  formatArabicTimeOnly 
} from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'paid' | 'unpaid' | 'all';
  students: Student[];
  monthlyRecords: Record<string, MonthlyRecord>;
  transactions?: PaymentTransaction[];
  currentMonthKey: string;
  monthLabel: string;
  teacherName: string;
  availableGrades: string[];
  currentDeviceName: string;
}

export const PrintReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialMode = 'all',
  students,
  monthlyRecords,
  transactions = [],
  currentMonthKey,
  monthLabel,
  teacherName,
  availableGrades,
  currentDeviceName,
}) => {
  const [reportType, setReportType] = useState<'paid' | 'unpaid' | 'all'>(initialMode);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  // View mode: 'daily' (سبت، حد، اتنين... يوم بيوم) vs 'students' (كشف مجمع لكل طالب)
  const [viewMode, setViewMode] = useState<'daily' | 'students'>('daily');

  // Groups list
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.groupName && s.groupName.trim()) set.add(s.groupName.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Students fast lookup map
  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => {
      map.set(s.id, s);
    });
    return map;
  }, [students]);

  // Map student transactions for current month
  const studentTransactionsMap = useMemo(() => {
    const map = new Map<string, PaymentTransaction[]>();
    transactions.forEach((t) => {
      if (t.monthKey === currentMonthKey && t.type !== 'refund') {
        const list = map.get(t.studentId) || [];
        list.push(t);
        map.set(t.studentId, list);
      }
    });
    return map;
  }, [transactions, currentMonthKey]);

  // Assistant collection summary for current month
  const assistantSummary = useMemo(() => {
    const summary = new Map<string, { name: string; count: number; total: number }>();
    transactions.forEach((t) => {
      if (t.monthKey === currentMonthKey && t.type !== 'refund') {
        const key = t.recordedBy || 'المسؤول الرئيسي';
        const current = summary.get(key) || { name: key, count: 0, total: 0 };
        current.count += 1;
        current.total += t.amount || 0;
        summary.set(key, current);
      }
    });
    return Array.from(summary.values()).sort((a, b) => b.total - a.total);
  }, [transactions, currentMonthKey]);

  // Compute student record status with exact transaction audit data
  const studentsWithStatus = useMemo(() => {
    return students.map((s) => {
      const recKey = `${s.id}_${currentMonthKey}`;
      const rec = monthlyRecords[recKey];
      const req = rec?.requiredAmount ?? s.monthlyFee;
      const paid = rec?.paidAmount ?? 0;
      const rem = rec?.remainingAmount ?? Math.max(0, req - paid);

      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (paid >= req && req > 0) {
        status = 'paid';
      } else if (req === 0) {
        status = 'paid'; // exempt
      } else if (paid > 0) {
        status = 'partial';
      }

      // Lookup student payments in current month
      const stuTxList = studentTransactionsMap.get(s.id) || [];
      stuTxList.sort((a, b) => new Date(a.paymentDate || a.createdAt).getTime() - new Date(b.paymentDate || b.createdAt).getTime());

      const latestTx = stuTxList.length > 0 ? stuTxList[stuTxList.length - 1] : null;
      const primaryDate = latestTx?.paymentDate || latestTx?.createdAt || rec?.lastPaymentDate;
      const dayName = primaryDate ? getArabicDayName(primaryDate) : '-';
      const dateFormatted = primaryDate ? formatArabicDateOnly(primaryDate) : '-';
      const timeFormatted = primaryDate ? formatArabicTimeOnly(primaryDate) : '-';
      const collector = latestTx?.recordedBy || rec?.updatedBy || currentDeviceName || 'المكتب';
      const receiptNo = latestTx?.receiptNumber || rec?.receiptNumber || '-';

      return {
        student: s,
        record: rec,
        required: req,
        paid,
        remaining: rem,
        status,
        transactions: stuTxList,
        primaryDate,
        dayName,
        dateFormatted,
        timeFormatted,
        collector,
        receiptNo,
      };
    });
  }, [students, monthlyRecords, studentTransactionsMap, currentMonthKey, currentDeviceName]);

  // Filtered by Grade and Group
  const gradeAndGroupFiltered = useMemo(() => {
    return studentsWithStatus.filter((item) => {
      if (selectedGrade !== 'ALL' && item.student.grade !== selectedGrade) {
        return false;
      }
      if (selectedGroup !== 'ALL' && item.student.groupName !== selectedGroup) {
        return false;
      }
      return true;
    });
  }, [studentsWithStatus, selectedGrade, selectedGroup]);

  // Separate lists: Paid vs Unpaid
  const paidList = useMemo(() => {
    return gradeAndGroupFiltered.filter((item) => item.status === 'paid');
  }, [gradeAndGroupFiltered]);

  const unpaidList = useMemo(() => {
    return gradeAndGroupFiltered.filter((item) => item.status !== 'paid');
  }, [gradeAndGroupFiltered]);

  // -------------------------------------------------------------
  // DAILY GROUPING OF TRANSACTIONS (سبت، حد، اتنين، تلات...)
  // -------------------------------------------------------------
  interface DayGroup {
    dateKey: string; // e.g. "2026-11-07"
    dayName: string; // e.g. "السبت"
    dateFormatted: string; // e.g. "07/11/2026"
    fullDateLabel: string; // e.g. "السبت 07 نوفمبر 2026"
    transactions: {
      id: string;
      receiptNumber: string;
      studentId: string;
      studentName: string;
      studentCode: string;
      grade: string;
      groupName?: string;
      amount: number;
      recordedBy: string;
      timeFormatted: string;
      timestamp: number;
      note?: string;
    }[];
    dayTotal: number;
    operationsCount: number;
  }

  const dailyGroupedData = useMemo(() => {
    // 1. Gather all transactions matching filters
    const validStudentIds = new Set(gradeAndGroupFiltered.map((i) => i.student.id));
    const dayMap = new Map<string, DayGroup>();

    // Process explicit transactions
    transactions.forEach((tx) => {
      if (tx.monthKey !== currentMonthKey || tx.type === 'refund') return;
      if (!validStudentIds.has(tx.studentId)) return;

      const dateISO = tx.paymentDate || tx.createdAt || new Date().toISOString();
      const dateKey = dateISO.slice(0, 10); // YYYY-MM-DD
      const student = studentsMap.get(tx.studentId);

      const d = new Date(dateISO);
      const dayName = getArabicDayName(dateISO);
      const dateFormatted = formatArabicDateOnly(dateISO);
      const timeFormatted = formatArabicTimeOnly(dateISO);
      const fullDateLabel = `يوم ${dayName} - ${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;

      const currentGroup: DayGroup = dayMap.get(dateKey) || {
        dateKey,
        dayName,
        dateFormatted,
        fullDateLabel,
        transactions: [],
        dayTotal: 0,
        operationsCount: 0,
      };

      currentGroup.transactions.push({
        id: tx.id,
        receiptNumber: tx.receiptNumber,
        studentId: tx.studentId,
        studentName: tx.studentName || student?.name || 'طالب',
        studentCode: tx.studentCode || student?.studentCode || '-',
        grade: student?.grade || '-',
        groupName: student?.groupName,
        amount: tx.amount,
        recordedBy: tx.recordedBy || 'المسؤول الرئيسي',
        timeFormatted,
        timestamp: d.getTime(),
        note: tx.note,
      });

      currentGroup.dayTotal += tx.amount || 0;
      currentGroup.operationsCount += 1;
      dayMap.set(dateKey, currentGroup);
    });

    // Also include any students who paid in monthlyRecords but had no transaction row
    gradeAndGroupFiltered.forEach((item) => {
      if (item.paid > 0 && item.transactions.length === 0) {
        const dateISO = item.primaryDate || new Date().toISOString();
        const dateKey = dateISO.slice(0, 10);
        const d = new Date(dateISO);
        const dayName = getArabicDayName(dateISO);
        const dateFormatted = formatArabicDateOnly(dateISO);
        const timeFormatted = formatArabicTimeOnly(dateISO);
        const fullDateLabel = `يوم ${dayName} - ${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;

        const currentGroup: DayGroup = dayMap.get(dateKey) || {
          dateKey,
          dayName,
          dateFormatted,
          fullDateLabel,
          transactions: [],
          dayTotal: 0,
          operationsCount: 0,
        };

        currentGroup.transactions.push({
          id: `syn_${item.student.id}`,
          receiptNumber: item.receiptNo,
          studentId: item.student.id,
          studentName: item.student.name,
          studentCode: item.student.studentCode,
          grade: item.student.grade,
          groupName: item.student.groupName,
          amount: item.paid,
          recordedBy: item.collector,
          timeFormatted,
          timestamp: d.getTime(),
        });

        currentGroup.dayTotal += item.paid;
        currentGroup.operationsCount += 1;
        dayMap.set(dateKey, currentGroup);
      }
    });

    // Sort days chronologically ascending (السبت، الأحد، الإثنين...)
    const sortedDays = Array.from(dayMap.values()).sort((a, b) => {
      return new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime();
    });

    // Inside each day, sort transactions chronologically by time
    sortedDays.forEach((dg) => {
      dg.transactions.sort((a, b) => a.timestamp - b.timestamp);
    });

    return sortedDays;
  }, [transactions, gradeAndGroupFiltered, currentMonthKey, studentsMap]);

  // Overall Totals calculations
  const totals = useMemo(() => {
    let reqSum = 0;
    let paidSum = 0;
    let remSum = 0;

    const listToSum = reportType === 'paid' 
      ? paidList 
      : reportType === 'unpaid' 
        ? unpaidList 
        : gradeAndGroupFiltered;

    listToSum.forEach((i) => {
      reqSum += i.required;
      paidSum += i.paid;
      remSum += i.remaining;
    });

    const totalTransactionsSum = dailyGroupedData.reduce((sum, d) => sum + d.dayTotal, 0);
    const totalTransactionsCount = dailyGroupedData.reduce((sum, d) => sum + d.operationsCount, 0);

    return {
      count: listToSum.length,
      paidCount: paidList.length,
      unpaidCount: unpaidList.length,
      reqSum,
      paidSum,
      remSum,
      totalTransactionsSum,
      totalTransactionsCount,
      daysCount: dailyGroupedData.length,
    };
  }, [gradeAndGroupFiltered, paidList, unpaidList, reportType, dailyGroupedData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    if (reportType === 'paid') return `كشف سداد المصروفات - مقسم يوماً بيوم (سبت، أحد، إثنين...) بالساعة والمحصل`;
    if (reportType === 'unpaid') return `كشف الطلاب غير المسددين والمتبقي عليهم مصروفات (مع أرقام أولياء الأمور)`;
    return `كشف شامل: العمليات اليومية (سبت، أحد، إثنين...) + كشف الطلاب غير المسددين`;
  };

  // ------------------------------------------------------------------
  // RENDER 1: DAY-BY-DAY TRANSACTIONS (سبت، حد، اتنين، تلات، أربع، خميس، جمعة)
  // ------------------------------------------------------------------
  const renderDailyGroupedTables = (isSubSection = false) => {
    if (dailyGroupedData.length === 0) {
      return (
        <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400 text-xs font-medium border border-slate-200">
          لا توجد معاملات تحصيل مسجلة في هذا الشهر حتى الآن.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {isSubSection && (
          <div className="flex items-center justify-between bg-emerald-50 border-r-4 border-emerald-600 px-4 py-2.5 rounded-r-xl">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="font-black text-sm text-emerald-950">
                  القسم الأول: كشف التحصيلات اليومية مرتبة حسب التاريخ (سبت، أحد، إثنين... يوم بيوم)
                </h3>
                <p className="text-[11px] text-emerald-800">
                  موضح لكل عملية: الساعة كام بالدقيقة والثانية ومين المساعد اللي استلمها
                </p>
              </div>
            </div>
            <div className="text-xs font-black text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
              إجمالي المحصل: {formatCurrency(totals.totalTransactionsSum)}
            </div>
          </div>
        )}

        {/* Loop through each day (سبت، أحد، إثنين...) */}
        {dailyGroupedData.map((dayGroup, dayIdx) => (
          <div 
            key={dayGroup.dateKey} 
            className="space-y-2 border border-slate-300 rounded-xl overflow-hidden shadow-2xs print:shadow-none break-inside-avoid"
          >
            {/* Distinct Day Header Banner */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-900 flex items-center justify-center font-black text-xs">
                  {dayIdx + 1}
                </span>
                <span className="font-black text-sm sm:text-base text-emerald-300">
                  {dayGroup.fullDateLabel}
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  {dayGroup.operationsCount} عملية تحصيل
                </span>
              </div>
              <div className="font-bold text-xs sm:text-sm text-emerald-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                إجمالي تحصيل هذا اليوم: <strong className="font-black text-white">{formatCurrency(dayGroup.dayTotal)}</strong>
              </div>
            </div>

            {/* Day Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <th className="py-2 px-1.5 border border-slate-300 w-8 text-center">م</th>
                    <th className="py-2 px-2.5 border border-slate-300 w-28 text-center bg-amber-50/60 text-amber-950 font-black">
                      <Clock className="w-3.5 h-3.5 inline ml-1 text-amber-700" />
                      الساعة كام (التوقيت)
                    </th>
                    <th className="py-2 px-2 border border-slate-300 w-16 text-center">الكود</th>
                    <th className="py-2 px-2.5 border border-slate-300 font-bold">اسم الطالب</th>
                    <th className="py-2 px-2 border border-slate-300">الصف والمجموعة</th>
                    <th className="py-2 px-2.5 border border-slate-300 text-center bg-emerald-50 text-emerald-950 font-black">
                      دفع كام (المبلغ)
                    </th>
                    <th className="py-2 px-2.5 border border-slate-300 text-center bg-blue-50/50 text-blue-950 font-bold">
                      <UserCheck className="w-3 h-3 inline ml-1 text-blue-700" />
                      مين اللي عملها (المساعد / المحصل)
                    </th>
                    <th className="py-2 px-2 border border-slate-300 text-center font-mono text-slate-600">
                      رقم الإيصال
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dayGroup.transactions.map((tx, txIdx) => (
                    <tr key={tx.id || txIdx} className={txIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                      <td className="py-1.5 px-1.5 border border-slate-300 text-center font-bold text-slate-500">
                        {txIdx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 border border-slate-300 text-center font-mono font-bold text-slate-900 bg-amber-50/30">
                        <span className="inline-block bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-950 text-[11px] shadow-2xs">
                          {tx.timeFormatted}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 border border-slate-300 text-center font-mono font-bold text-slate-900">
                        #{tx.studentCode}
                      </td>
                      <td className="py-1.5 px-2.5 border border-slate-300 font-bold text-slate-900">
                        {tx.studentName}
                        {tx.note && (
                          <span className="mr-1 text-[10px] text-slate-500 font-normal">
                            ({tx.note})
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                        <div>{tx.grade}</div>
                        {tx.groupName && (
                          <div className="text-[10px] text-slate-500">{tx.groupName}</div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 border border-slate-300 text-center font-black text-emerald-800 bg-emerald-50/60">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-1.5 px-2.5 border border-slate-300 text-center font-bold text-slate-900">
                        <span className="inline-block bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-md text-[10px]">
                          {tx.recordedBy}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 border border-slate-300 text-center font-mono text-[10px] text-slate-600">
                        {tx.receiptNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 font-bold border-t-2 border-slate-900 text-emerald-950">
                    <td colSpan={5} className="py-2 px-3 border border-slate-300 text-left font-black">
                      مجموع إجمالي تحصيلات {dayGroup.fullDateLabel} ({dayGroup.operationsCount} عملية):
                    </td>
                    <td className="py-2 px-2.5 border border-slate-300 text-center font-black text-emerald-800 bg-emerald-100/60">
                      {formatCurrency(dayGroup.dayTotal)}
                    </td>
                    <td colSpan={2} className="py-2 px-2 border border-slate-300 text-center text-[10px] text-slate-600">
                      معتمد ومسجل بسجل الخزينة
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* Grand Daily Summary Table (ملخص كل يوم) */}
        <div className="mt-6 bg-slate-50 border border-slate-300 rounded-xl p-4 break-inside-avoid">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <h4 className="font-bold text-xs text-slate-900">
              جدول ملخص تحصيلات الأيام لشهر {monthLabel} (إجمالي {dailyGroupedData.length} أيام عمل):
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold">
                  <th className="py-1.5 px-2 border border-slate-300 text-center w-10">م</th>
                  <th className="py-1.5 px-3 border border-slate-300">اليوم والتاريخ</th>
                  <th className="py-1.5 px-3 border border-slate-300 text-center">عدد العمليات</th>
                  <th className="py-1.5 px-3 border border-slate-300 text-center">إجمالي المحصل في اليوم</th>
                  <th className="py-1.5 px-3 border border-slate-300 text-center">النسبة من الشهر</th>
                </tr>
              </thead>
              <tbody>
                {dailyGroupedData.map((dg, idx) => {
                  const pct = totals.totalTransactionsSum > 0 
                    ? Math.round((dg.dayTotal / totals.totalTransactionsSum) * 100) 
                    : 0;

                  return (
                    <tr key={dg.dateKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-3 border border-slate-300 font-bold text-slate-900">{dg.fullDateLabel}</td>
                      <td className="py-1.5 px-3 border border-slate-300 text-center font-bold text-slate-700">{dg.operationsCount} عملية</td>
                      <td className="py-1.5 px-3 border border-slate-300 text-center font-black text-emerald-800">{formatCurrency(dg.dayTotal)}</td>
                      <td className="py-1.5 px-3 border border-slate-300 text-center font-mono text-[11px] text-slate-600">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold">
                  <td colSpan={2} className="py-2 px-3 border border-slate-700 text-left font-black">
                    الإجمالي العام لجميع الأيام ({dailyGroupedData.length} يوم):
                  </td>
                  <td className="py-2 px-3 border border-slate-700 text-center font-black text-emerald-300">
                    {totals.totalTransactionsCount} عملية
                  </td>
                  <td className="py-2 px-3 border border-slate-700 text-center font-black text-emerald-300">
                    {formatCurrency(totals.totalTransactionsSum)}
                  </td>
                  <td className="py-2 px-3 border border-slate-700 text-center font-mono">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // RENDER 2: UNPAID TABLE (غير المسددين والسداد الجزئي)
  // ------------------------------------------------------------------
  const renderUnpaidTable = (items: typeof unpaidList, isSubSection = false) => {
    const sectionReq = items.reduce((sum, i) => sum + i.required, 0);
    const sectionPaid = items.reduce((sum, i) => sum + i.paid, 0);
    const sectionRem = items.reduce((sum, i) => sum + i.remaining, 0);

    return (
      <div className="space-y-2">
        {isSubSection && (
          <div className="flex items-center justify-between bg-red-50 border-r-4 border-red-600 px-4 py-2.5 rounded-r-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-700" />
              <div>
                <h3 className="font-black text-sm text-red-950">
                  القسم الثاني: كشف الطلاب غير المسددين والمتبقي عليهم ({items.length} طالب)
                </h3>
                <p className="text-[11px] text-red-800">
                  موضح أرقام هواتف الطالب وأولياء الأمور وقيمة المتبقي في الذمة
                </p>
              </div>
            </div>
            <div className="text-xs font-black text-red-800 bg-white px-3 py-1.5 rounded-lg border border-red-200">
              إجمالي المتبقي: {formatCurrency(sectionRem)}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-lg text-slate-400 text-xs font-medium border border-slate-200">
            رائع! لا يوجد طلاب متأخرين أو غير مسددين في هذا الكشف.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-red-900 text-white font-bold border border-red-900">
                  <th className="py-2 px-1.5 border border-red-800 w-8 text-center">م</th>
                  <th className="py-2 px-2 border border-red-800 w-16 text-center">الكود</th>
                  <th className="py-2 px-2.5 border border-red-800">اسم الطالب المتأخر</th>
                  <th className="py-2 px-2 border border-red-800">الصف والمجموعة</th>
                  <th className="py-2 px-2 border border-red-800 font-mono">هاتف الطالب</th>
                  <th className="py-2 px-2 border border-red-800 font-mono">هاتف ولي الأمر</th>
                  <th className="py-2 px-2 border border-red-800 text-center">المطلوب</th>
                  <th className="py-2 px-2 border border-red-800 text-center">المدفوع حتى الآن</th>
                  <th className="py-2 px-2.5 border border-red-800 text-center bg-red-800 font-black">
                    المتبقي في الذمة
                  </th>
                  <th className="py-2 px-2.5 border border-red-800 text-center">حالة وتاريخ آخر دفعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={item.student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/20'}>
                    <td className="py-1.5 px-1.5 border border-slate-300 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-mono font-bold text-slate-900">
                      #{item.student.studentCode}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 font-bold text-slate-900">
                      {item.student.name}
                      {item.student.hasDiscount && (
                        <span className="mr-1.5 text-[10px] text-amber-700 font-normal">
                          (خصم: {item.student.discountAmount} ج)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                      <div>{item.student.grade}</div>
                      {item.student.groupName && (
                        <div className="text-[10px] text-slate-500">{item.student.groupName}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 font-mono text-[11px] text-slate-700">
                      {item.student.phone || '-'}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 font-mono text-[11px] font-bold text-slate-900">
                      {item.student.parentPhone}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-medium">
                      {formatCurrency(item.required)}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center text-slate-600 font-bold">
                      {item.paid > 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-black">
                          {formatCurrency(item.paid)}
                        </span>
                      ) : (
                        '0 ج.م'
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-black text-red-700 bg-red-50/60">
                      {formatCurrency(item.remaining)}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center text-[10px]">
                      {item.status === 'partial' ? (
                        <div>
                          <span className="inline-block text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                            سداد جزئي: {item.paid} ج
                          </span>
                          <div className="text-[9px] text-slate-600 font-medium mt-0.5">
                            {item.dayName} {item.dateFormatted} ({item.timeFormatted})
                          </div>
                        </div>
                      ) : (
                        <span className="text-red-600 font-bold bg-red-100/60 px-2 py-0.5 rounded">
                          لم يسدد إطلاقاً
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-red-50/90 font-bold border-t-2 border-red-900 text-red-950">
                  <td colSpan={4} className="py-2 px-3 border border-slate-300 text-left font-black">
                    مجموع غير المسددين ({items.length} طالب):
                  </td>
                  <td colSpan={2} className="border border-slate-300"></td>
                  <td className="py-2 px-2 border border-slate-300 text-center">{formatCurrency(sectionReq)}</td>
                  <td className="py-2 px-2 border border-slate-300 text-center text-slate-600">{formatCurrency(sectionPaid)}</td>
                  <td className="py-2 px-2.5 border border-slate-300 text-center font-black text-red-700">{formatCurrency(sectionRem)}</td>
                  <td className="border border-slate-300"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base sm:text-lg">
                كشوف السداد والتحصيل اليومي الرسمية (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                مترتبة حسب الأيام (سبت، أحد، إثنين...) موضح بها الساعة كام ومين اللي استلم والمبلغ لشهر {monthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ كـ PDF الآن</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Tabs (Hidden during Print) */}
        <div className="no-print p-3 sm:px-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Main Mode Toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                reportType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="طباعة الكل: التحصيلات اليومية مقسمة بالأيام + كشف الطلاب غير المسددين في نفس الملف"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>الكل (التحصيلات اليومية + غير المسددين)</span>
            </button>

            <button
              onClick={() => setReportType('paid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                reportType === 'paid'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>التحصيلات اليومية فقط ({dailyGroupedData.length} يوم)</span>
            </button>

            <button
              onClick={() => setReportType('unpaid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                reportType === 'unpaid'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>غير المسددين فقط ({unpaidList.length})</span>
            </button>
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="ALL">جميع الصفوف ({availableGrades.length})</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {availableGroups.length > 0 && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="ALL">جميع المجموعات</option>
                {availableGroups.map((grp) => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Info Banner (Hidden in Print) */}
        <div className="no-print bg-emerald-50/70 border-b border-emerald-100 px-4 py-2 text-[11px] text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>
              <strong>الترتيب الزمني اليومي:</strong> يتم تجميع العمليات لكل يوم على حدة (سبت، أحد، إثنين، ثلاثاء...) موضحاً في كل عملية توقيتها الدقيق (الساعة كام) واسم المساعد الذي استلم المبلغ مع إجمالي كل يوم.
            </span>
          </span>
          <span className="font-bold text-emerald-900 whitespace-nowrap mr-2">
            {reportType === 'all' 
              ? `${dailyGroupedData.length} يوم عمل • ${unpaidList.length} متبقي` 
              : `إجمالي أيام التحصيل: ${dailyGroupedData.length} يوم`}
          </span>
        </div>

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div 
            id="printable-report-area"
            className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0 print:max-w-none text-slate-900"
          >
            
            {/* Report Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {teacherName}
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-emerald-800 mt-0.5">
                  {getReportTitle()}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                  <span>📅 <strong>الشهر المستحق:</strong> {monthLabel}</span>
                  {selectedGrade !== 'ALL' && <span>🎓 <strong>الصف:</strong> {selectedGrade}</span>}
                  {selectedGroup !== 'ALL' && <span>👥 <strong>المجموعة:</strong> {selectedGroup}</span>}
                </div>
              </div>

              <div className="text-left text-xs text-slate-500 space-y-1">
                <p><strong>تاريخ التقرير:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
                <p><strong>توقيت الطباعة:</strong> {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                <p><strong>المشغل الحالي:</strong> {currentDeviceName || 'الهاتف الرئيسي'}</p>
              </div>
            </div>

            {/* Financial Summary Cards on the Printed Report */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center text-xs">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">إجمالي أيام العمل</span>
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {dailyGroupedData.length} يوم
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">عدد عمليات التحصيل</span>
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {totals.totalTransactionsCount} عملية
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-emerald-700 block text-[10px] font-semibold">إجمالي المحصل الفعلي</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">{formatCurrency(totals.totalTransactionsSum)}</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-red-600 block text-[10px] font-semibold">المتبقي في الذمة</span>
                <span className="text-base sm:text-lg font-black text-red-600">{formatCurrency(totals.remSum)}</span>
              </div>
            </div>

            {/* Content: Depending on selected mode */}

            {/* 1. Daily Transactions Mode Only */}
            {reportType === 'paid' && renderDailyGroupedTables(false)}

            {/* 2. Unpaid Mode Only */}
            {reportType === 'unpaid' && renderUnpaidTable(unpaidList, false)}

            {/* 3. ALL Mode: Daily Grouped Transactions + Unpaid Section in the same PDF */}
            {reportType === 'all' && (
              <div className="space-y-8">
                {/* 1. Daily Transactions Section (سبت، حد، اتنين...) */}
                <div>
                  {renderDailyGroupedTables(true)}
                </div>

                {/* Section Break with Print Page-Break option */}
                <div className="my-8 border-t-2 border-dashed border-slate-300 print:break-before-page"></div>

                {/* 2. Assistant Collections Audit Breakdown */}
                {assistantSummary.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 break-inside-avoid">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-bold text-xs text-slate-900">
                        كشف إجمالي تدقيق تحصيلات فريق العمل والمساعدين لشهر {monthLabel}:
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {assistantSummary.map((asst) => (
                        <div key={asst.name} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                          <span className="font-bold text-slate-800 block truncate">{asst.name}</span>
                          <div className="flex items-center justify-between mt-1 text-[11px]">
                            <span className="text-slate-500">{asst.count} عملية تحصيل</span>
                            <span className="font-black text-emerald-700">{formatCurrency(asst.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Unpaid Students Section */}
                <div>
                  {renderUnpaidTable(unpaidList, true)}
                </div>

                {/* Final Unified Summary Box */}
                <div className="mt-6 bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-bold break-inside-avoid">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>كشف شهر {monthLabel} المعتمد: {totals.totalTransactionsCount} عملية تحصيل عبر {dailyGroupedData.length} يوم عمل</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>المطلوب: {formatCurrency(totals.reqSum)}</span>
                    <span className="text-emerald-400">إجمالي المحصل: {formatCurrency(totals.totalTransactionsSum)}</span>
                    <span className="text-red-400">المتبقي: {formatCurrency(totals.remSum)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Signature and Verification Footer on Paper */}
            <div className="mt-8 pt-6 border-t border-slate-300 flex items-end justify-between text-xs text-slate-600 break-inside-avoid">
              <div>
                <p><strong>المسؤول / المشغل:</strong> {currentDeviceName || 'الهاتف الرئيسي'}</p>
                <p className="mt-1 text-[11px] text-slate-400">منظومة {teacherName} لإدارة المصروفات الشهرية والمتبقي • مزامنة سحابية حية</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">توقيع المعلم / المالك الرئيسي</p>
                <div className="w-48 border-b-2 border-dotted border-slate-400 mt-6"></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
