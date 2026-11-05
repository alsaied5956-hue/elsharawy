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
  initialMode = 'paid',
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

  // Filtered list according to tab and selects
  const filteredList = useMemo(() => {
    return studentsWithStatus.filter((item) => {
      // 1. Grade filter
      if (selectedGrade !== 'ALL' && item.student.grade !== selectedGrade) {
        return false;
      }
      // 2. Group filter
      if (selectedGroup !== 'ALL' && item.student.groupName !== selectedGroup) {
        return false;
      }
      // 3. Status filter
      if (reportType === 'paid') {
        return item.status === 'paid';
      } else if (reportType === 'unpaid') {
        return item.status === 'unpaid' || item.status === 'partial';
      }
      return true; // 'all'
    });
  }, [studentsWithStatus, selectedGrade, selectedGroup, reportType]);

  // Aggregated totals
  const totals = useMemo(() => {
    let reqSum = 0;
    let paidSum = 0;
    let remSum = 0;
    filteredList.forEach((i) => {
      reqSum += i.required;
      paidSum += i.paid;
      remSum += i.remaining;
    });
    return {
      count: filteredList.length,
      reqSum,
      paidSum,
      remSum,
    };
  }, [filteredList]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    if (reportType === 'paid') return `كشف سداد المصروفات - الطلاب المسددين بالكامل`;
    if (reportType === 'unpaid') return `كشف الطلاب غير المسددين والمتبقي عليهم مصروفات`;
    return `كشف شامل لجميع الطلاب والمصروفات`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
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
              onClick={() => setReportType('paid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                reportType === 'paid'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>المسددين فقط ({studentsWithStatus.filter(s => s.status === 'paid').length})</span>
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
              <span>غير المسددين والمتبقي ({studentsWithStatus.filter(s => s.status !== 'paid').length})</span>
            </button>

            <button
              onClick={() => setReportType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                reportType === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>الكل ({studentsWithStatus.length})</span>
            </button>
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            >
              <option value="ALL">جميع الصفوف</option>
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
          <span>💡 <strong>ملاحظة هامة:</strong> عند الضغط على "طباعة"، يمكنك اختيار <strong>"حفظ بتنسيق PDF" (Save as PDF)</strong> من خيارات الطابعة لحفظ الملف على هاتفك أو كمبيوترك بصيغة PDF قابلة للإرسال فوراً.</span>
          <span className="font-bold text-emerald-700">عدد الطلاب في الكشف: {totals.count} طالب</span>
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
                <span className="text-slate-500 block text-[10px] font-semibold">إجمالي الطلاب بالكشف</span>
                <span className="text-base sm:text-lg font-black text-slate-900">{totals.count} طالب</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">إجمالي المبلغ المطلوب</span>
                <span className="text-base sm:text-lg font-black text-slate-900">{formatCurrency(totals.reqSum)}</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-emerald-700 block text-[10px] font-semibold">إجمالي المسدد الفعلي</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">{formatCurrency(totals.paidSum)}</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-red-600 block text-[10px] font-semibold">إجمالي المتبقي</span>
                <span className="text-base sm:text-lg font-black text-red-600">{formatCurrency(totals.remSum)}</span>
              </div>
            </div>

            {/* Report Table */}
            {filteredList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm">
                لا توجد بيانات مطابقة للخيارات المحددة في هذا الكشف.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border border-slate-900">
                      <th className="py-2.5 px-2 border border-slate-700 w-10 text-center">م</th>
                      <th className="py-2.5 px-2.5 border border-slate-700 w-20 text-center">الكود</th>
                      <th className="py-2.5 px-3 border border-slate-700">اسم الطالب</th>
                      <th className="py-2.5 px-2.5 border border-slate-700">الصف والمجموعة</th>
                      
                      {reportType === 'paid' ? (
                        <>
                          <th className="py-2.5 px-2.5 border border-slate-700 text-center">المطلوب</th>
                          <th className="py-2.5 px-2.5 border border-slate-700 text-center bg-emerald-800">المسدد</th>
                          <th className="py-2.5 px-2.5 border border-slate-700 text-center">رقم الإيصال</th>
                          <th className="py-2.5 px-2.5 border border-slate-700 text-center">تاريخ السداد</th>
                        </>
                      ) : reportType === 'unpaid' ? (
                        <>
                          <th className="py-2.5 px-2.5 border border-slate-700">هاتف الطالب</th>
                          <th className="py-2.5 px-2.5 border border-slate-700">هاتف ولي الأمر</th>
                          <th className="py-2.5 px-2 border border-slate-700 text-center">المطلوب</th>
                          <th className="py-2.5 px-2 border border-slate-700 text-center">المدفوع</th>
                          <th className="py-2.5 px-2.5 border border-slate-700 text-center bg-red-800">المتبقي</th>
                          <th className="py-2.5 px-2 border border-slate-700 text-center">الحالة</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-2.5 border border-slate-700">هاتف ولي الأمر</th>
                          <th className="py-2.5 px-2 border border-slate-700 text-center">المطلوب</th>
                          <th className="py-2.5 px-2 border border-slate-700 text-center text-emerald-300">المسدد</th>
                          <th className="py-2.5 px-2.5 border border-slate-700 text-center text-red-300">المتبقي</th>
                          <th className="py-2.5 px-2 border border-slate-700 text-center">الحالة</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredList.map((item, idx) => (
                      <tr 
                        key={item.student.id} 
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="py-2 px-2 border border-slate-300 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                          {item.student.studentCode}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 font-bold text-slate-900">
                          {item.student.name}
                          {item.student.hasDiscount && (
                            <span className="mr-1.5 text-[10px] text-amber-700 font-normal">
                              (خصم: {item.student.discountAmount} ج)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 border border-slate-300 text-slate-700">
                          <div>{item.student.grade}</div>
                          {item.student.groupName && (
                            <div className="text-[10px] text-slate-500">{item.student.groupName}</div>
                          )}
                        </td>

                        {reportType === 'paid' ? (
                          <>
                            <td className="py-2 px-2.5 border border-slate-300 text-center font-medium">
                              {formatCurrency(item.required)}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-300 text-center font-black text-emerald-700 bg-emerald-50/50">
                              {formatCurrency(item.paid)}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-300 text-center font-mono text-[11px] text-slate-600">
                              {item.receiptNumber || '-'}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-300 text-center text-[10px] text-slate-600">
                              {item.lastPaymentDate ? formatDateTime(item.lastPaymentDate) : '-'}
                            </td>
                          </>
                        ) : reportType === 'unpaid' ? (
                          <>
                            <td className="py-2 px-2.5 border border-slate-300 font-mono text-[11px] text-slate-700">
                              {item.student.phone || '-'}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-300 font-mono text-[11px] font-bold text-slate-800">
                              {item.student.parentPhone}
                            </td>
                            <td className="py-2 px-2 border border-slate-300 text-center font-medium">
                              {formatCurrency(item.required)}
                            </td>
                            <td className="py-2 px-2 border border-slate-300 text-center text-slate-600">
                              {formatCurrency(item.paid)}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-300 text-center font-black text-red-600 bg-red-50/50">
                              {formatCurrency(item.remaining)}
                            </td>
                            <td className="py-2 px-2 border border-slate-300 text-center text-[10px] font-bold">
                              {item.status === 'partial' ? (
                                <span className="text-amber-700">سداد جزئي</span>
                              ) : (
                                <span className="text-red-600">لم يسدد</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-2.5 border border-slate-300 font-mono text-[11px] text-slate-700">
                              {item.student.parentPhone}
                            </td>
                            <td className="py-2 px-2 border border-slate-300 text-center font-medium">
                              {formatCurrency(item.required)}
                            </td>
                            <td className="py-2 px-2 border border-slate-300 text-center font-bold text-emerald-700">
                              {formatCurrency(item.paid)}
                            </td>
                            <td className="py-2 px-2.5 border border-slate-300 text-center font-bold text-red-600">
                              {formatCurrency(item.remaining)}
                            </td>
                            <td className="py-2 px-2 border border-slate-300 text-center text-[10px] font-bold">
                              {item.status === 'paid' ? (
                                <span className="text-emerald-700">تم السداد</span>
                              ) : item.status === 'partial' ? (
                                <span className="text-amber-700">جزئي</span>
                              ) : (
                                <span className="text-red-600">لم يسدد</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3 border border-slate-300 text-left font-black">
                        الإجمالي ({totals.count} طالب):
                      </td>
                      {reportType === 'paid' ? (
                        <>
                          <td className="py-2.5 px-2.5 border border-slate-300 text-center">{formatCurrency(totals.reqSum)}</td>
                          <td className="py-2.5 px-2.5 border border-slate-300 text-center text-emerald-800 font-black">{formatCurrency(totals.paidSum)}</td>
                          <td colSpan={2} className="border border-slate-300"></td>
                        </>
                      ) : reportType === 'unpaid' ? (
                        <>
                          <td colSpan={2} className="border border-slate-300"></td>
                          <td className="py-2.5 px-2 border border-slate-300 text-center">{formatCurrency(totals.reqSum)}</td>
                          <td className="py-2.5 px-2 border border-slate-300 text-center text-slate-600">{formatCurrency(totals.paidSum)}</td>
                          <td className="py-2.5 px-2.5 border border-slate-300 text-center text-red-600 font-black">{formatCurrency(totals.remSum)}</td>
                          <td className="border border-slate-300"></td>
                        </>
                      ) : (
                        <>
                          <td className="border border-slate-300"></td>
                          <td className="py-2.5 px-2 border border-slate-300 text-center">{formatCurrency(totals.reqSum)}</td>
                          <td className="py-2.5 px-2 border border-slate-300 text-center text-emerald-800 font-black">{formatCurrency(totals.paidSum)}</td>
                          <td className="py-2.5 px-2.5 border border-slate-300 text-center text-red-600 font-black">{formatCurrency(totals.remSum)}</td>
                          <td className="border border-slate-300"></td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
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
