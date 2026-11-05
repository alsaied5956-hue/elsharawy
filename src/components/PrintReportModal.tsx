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
  Download
} from 'lucide-react';
import { Student, MonthlyRecord } from '../types';
import { formatCurrency, formatDateTime } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'paid' | 'unpaid' | 'all';
  students: Student[];
  monthlyRecords: Record<string, MonthlyRecord>;
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
  currentMonthKey,
  monthLabel,
  teacherName,
  availableGrades,
  currentDeviceName,
}) => {
  const [reportType, setReportType] = useState<'paid' | 'unpaid' | 'all'>(initialMode);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  // Groups list
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.groupName && s.groupName.trim()) set.add(s.groupName.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Compute student record status
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

      return {
        student: s,
        record: rec,
        required: req,
        paid,
        remaining: rem,
        status,
        lastPaymentDate: rec?.lastPaymentDate,
        receiptNumber: rec?.receiptNumber,
      };
    });
  }, [students, monthlyRecords, currentMonthKey]);

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

  // Totals calculations
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

    return {
      count: listToSum.length,
      paidCount: paidList.length,
      unpaidCount: unpaidList.length,
      reqSum,
      paidSum,
      remSum,
    };
  }, [gradeAndGroupFiltered, paidList, unpaidList, reportType]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    if (reportType === 'paid') return `كشف سداد المصروفات - الطلاب المسددين بالكامل`;
    if (reportType === 'unpaid') return `كشف الطلاب غير المسددين والمتبقي عليهم مصروفات`;
    return `كشف شامل: المسددين وغير المسددين (مفصل لكل فئة)`;
  };

  // Helper render for Paid Table
  const renderPaidTable = (items: typeof paidList, isSubSection = false) => {
    const sectionReq = items.reduce((sum, i) => sum + i.required, 0);
    const sectionPaid = items.reduce((sum, i) => sum + i.paid, 0);

    return (
      <div className="space-y-2">
        {isSubSection && (
          <div className="flex items-center justify-between bg-emerald-50 border-r-4 border-emerald-600 px-3 py-2 rounded-r-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <h3 className="font-black text-sm text-emerald-900">
                القسم الأول: كشف الطلاب المسددين بالكامل ({items.length} طالب)
              </h3>
            </div>
            <div className="text-xs font-bold text-emerald-800">
              إجمالي المسدد: {formatCurrency(sectionPaid)}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-lg text-slate-400 text-xs font-medium border border-slate-200">
            لا يوجد طلاب مسددين مطابقين للخيارات المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-900 text-white font-bold border border-emerald-900">
                  <th className="py-2 px-2 border border-emerald-800 w-10 text-center">م</th>
                  <th className="py-2 px-2.5 border border-emerald-800 w-20 text-center">الكود</th>
                  <th className="py-2 px-3 border border-emerald-800">اسم الطالب المسدد</th>
                  <th className="py-2 px-2.5 border border-emerald-800">الصف والمجموعة</th>
                  <th className="py-2 px-2.5 border border-emerald-800 text-center">المطلوب</th>
                  <th className="py-2 px-2.5 border border-emerald-800 text-center bg-emerald-800">المسدد بالكامل</th>
                  <th className="py-2 px-2.5 border border-emerald-800 text-center">رقم الإيصال</th>
                  <th className="py-2 px-2.5 border border-emerald-800 text-center">تاريخ السداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={item.student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'}>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                      {item.student.studentCode}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 font-bold text-slate-900">
                      {item.student.name}
                      {item.student.hasDiscount && (
                        <span className="mr-1.5 text-[10px] text-amber-700 font-normal">
                          (خصم: {item.student.discountAmount} ج)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-slate-700">
                      <div>{item.student.grade}</div>
                      {item.student.groupName && (
                        <div className="text-[10px] text-slate-500">{item.student.groupName}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-medium">
                      {formatCurrency(item.required)}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-black text-emerald-800 bg-emerald-50/60">
                      {formatCurrency(item.paid)}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-mono text-[11px] text-slate-600">
                      {item.receiptNumber || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center text-[10px] text-slate-600">
                      {item.lastPaymentDate ? formatDateTime(item.lastPaymentDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/80 font-bold border-t-2 border-emerald-900 text-emerald-950">
                  <td colSpan={4} className="py-2 px-3 border border-slate-300 text-left font-black">
                    مجموع المسددين ({items.length} طالب):
                  </td>
                  <td className="py-2 px-2.5 border border-slate-300 text-center">{formatCurrency(sectionReq)}</td>
                  <td className="py-2 px-2.5 border border-slate-300 text-center font-black text-emerald-800">{formatCurrency(sectionPaid)}</td>
                  <td colSpan={2} className="border border-slate-300"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Helper render for Unpaid Table
  const renderUnpaidTable = (items: typeof unpaidList, isSubSection = false) => {
    const sectionReq = items.reduce((sum, i) => sum + i.required, 0);
    const sectionPaid = items.reduce((sum, i) => sum + i.paid, 0);
    const sectionRem = items.reduce((sum, i) => sum + i.remaining, 0);

    return (
      <div className="space-y-2">
        {isSubSection && (
          <div className="flex items-center justify-between bg-red-50 border-r-4 border-red-600 px-3 py-2 rounded-r-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-700" />
              <h3 className="font-black text-sm text-red-900">
                القسم الثاني: كشف الطلاب غير المسددين والمتبقي عليهم ({items.length} طالب)
              </h3>
            </div>
            <div className="text-xs font-bold text-red-800">
              إجمالي المتبقي: {formatCurrency(sectionRem)}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-lg text-slate-400 text-xs font-medium border border-slate-200">
            رائع! لا يوجد طلاب متأخرين أو غير مسددين في هذا الكشف.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-red-900 text-white font-bold border border-red-900">
                  <th className="py-2 px-2 border border-red-800 w-10 text-center">م</th>
                  <th className="py-2 px-2.5 border border-red-800 w-20 text-center">الكود</th>
                  <th className="py-2 px-3 border border-red-800">اسم الطالب المتأخر</th>
                  <th className="py-2 px-2.5 border border-red-800">الصف والمجموعة</th>
                  <th className="py-2 px-2.5 border border-red-800">هاتف الطالب</th>
                  <th className="py-2 px-2.5 border border-red-800">هاتف ولي الأمر</th>
                  <th className="py-2 px-2 border border-red-800 text-center">المطلوب</th>
                  <th className="py-2 px-2 border border-red-800 text-center">المدفوع</th>
                  <th className="py-2 px-2.5 border border-red-800 text-center bg-red-800">المتبقي</th>
                  <th className="py-2 px-2.5 border border-red-800 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={item.student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/20'}>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                      {item.student.studentCode}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 font-bold text-slate-900">
                      {item.student.name}
                      {item.student.hasDiscount && (
                        <span className="mr-1.5 text-[10px] text-amber-700 font-normal">
                          (خصم: {item.student.discountAmount} ج)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-slate-700">
                      <div>{item.student.grade}</div>
                      {item.student.groupName && (
                        <div className="text-[10px] text-slate-500">{item.student.groupName}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 font-mono text-[11px] text-slate-700">
                      {item.student.phone || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 font-mono text-[11px] font-bold text-slate-900">
                      {item.student.parentPhone}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-medium">
                      {formatCurrency(item.required)}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center text-slate-600">
                      {formatCurrency(item.paid)}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center font-black text-red-700 bg-red-50/60">
                      {formatCurrency(item.remaining)}
                    </td>
                    <td className="py-1.5 px-2.5 border border-slate-300 text-center text-[10px] font-bold">
                      {item.status === 'partial' ? (
                        <span className="text-amber-700">سداد جزئي</span>
                      ) : (
                        <span className="text-red-600">لم يسدد</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-red-50/80 font-bold border-t-2 border-red-900 text-red-950">
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
                طباعة كشوف الطلاب والمصروفات (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                معاينة رسمية جاهزة للطباعة المباشرة أو الحفظ كملف PDF لشهر {monthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ كـ PDF</span>
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
              title="طباعة الكل: يظهر المسددين في جدول منفصل والغير مسددين في جدول منفصل بنفس الـ PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>الكل (مسددين + غير مسددين في نفس الملف)</span>
            </button>

            <button
              onClick={() => setReportType('paid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                reportType === 'paid'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>المسددين فقط ({paidList.length})</span>
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

        {/* Tip Box (Hidden in Print) */}
        <div className="no-print bg-emerald-50/70 border-b border-emerald-100 px-4 py-2 text-[11px] text-emerald-800 flex items-center justify-between">
          <span>
            💡 <strong>عند طباعة "الكل":</strong> يتم تقسيم التقرير في نفس الـ PDF إلى جدول خاص بالمسددين أولاً، ثم جدول خاص بغير المسددين مع أرقام هواتفهم، ثم إجمالي عام وتوقيع.
          </span>
          <span className="font-bold text-emerald-800">
            {reportType === 'all' 
              ? `إجمالي ${gradeAndGroupFiltered.length} طالب (${paidList.length} مسدد + ${unpaidList.length} متبقي)` 
              : `العدد: ${totals.count} طالب`}
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
                <p><strong>تاريخ الاستخراج:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
                <p><strong>توقيت الطباعة:</strong> {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                <p><strong>المسؤول / الجهاز:</strong> {currentDeviceName || 'الهاتف الرئيسي'}</p>
              </div>
            </div>

            {/* Financial Summary Cards on the Printed Report */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center text-xs">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">إجمالي الطلاب</span>
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {reportType === 'all' ? gradeAndGroupFiltered.length : totals.count} طالب
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">المطلوب الكلي</span>
                <span className="text-base sm:text-lg font-black text-slate-900">{formatCurrency(totals.reqSum)}</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-emerald-700 block text-[10px] font-semibold">المحصل بالخزينة</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">{formatCurrency(totals.paidSum)}</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-red-600 block text-[10px] font-semibold">المتبقي في الذمة</span>
                <span className="text-base sm:text-lg font-black text-red-600">{formatCurrency(totals.remSum)}</span>
              </div>
            </div>

            {/* Content Tables */}
            {reportType === 'paid' && renderPaidTable(paidList, false)}

            {reportType === 'unpaid' && renderUnpaidTable(unpaidList, false)}

            {/* BOTH in the same PDF when 'all' is selected */}
            {reportType === 'all' && (
              <div className="space-y-8">
                {/* 1. Paid Students Section */}
                <div>
                  {renderPaidTable(paidList, true)}
                </div>

                {/* Section Break with Print Page-Break option */}
                <div className="my-6 border-t-2 border-dashed border-slate-300 print:break-before-page"></div>

                {/* 2. Unpaid Students Section */}
                <div>
                  {renderUnpaidTable(unpaidList, true)}
                </div>

                {/* Final Unified Summary Box */}
                <div className="mt-6 bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>إجمالي كشف الشهر الكامل: {gradeAndGroupFiltered.length} طالب ({paidList.length} مسدد + {unpaidList.length} متبقي)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>المطلوب: {formatCurrency(totals.reqSum)}</span>
                    <span className="text-emerald-400">المحصل: {formatCurrency(totals.paidSum)}</span>
                    <span className="text-red-400">المتبقي: {formatCurrency(totals.remSum)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Signature and Verification Footer on Paper */}
            <div className="mt-8 pt-6 border-t border-slate-300 flex items-end justify-between text-xs text-slate-600">
              <div>
                <p><strong>المسؤول / الأسيستنت:</strong> {currentDeviceName || 'الهاتف الرئيسي'}</p>
                <p className="mt-1 text-[11px] text-slate-400">منظومة الأستاذ لإدارة المصروفات الشهرية والمتبقي • مزامنة سحابية حية</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">توقيع المعلم / الأستاذ</p>
                <div className="w-48 border-b-2 border-dotted border-slate-400 mt-6"></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
