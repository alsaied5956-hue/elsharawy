import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CreditCard, 
  Phone, 
  MessageCircle, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  UserPlus,
  FileSpreadsheet,
  Users,
  Tag,
  Upload,
  Printer
} from 'lucide-react';
import { Student, MonthlyRecord, PaymentStatus } from '../types';
import { formatCurrency, GRADES_LIST, createWhatsAppLink } from '../utils/helpers';

interface Props {
  students: Student[];
  monthlyRecords: Record<string, MonthlyRecord>;
  currentMonthKey: string;
  monthLabel: string;
  onOpenPayment: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string, studentName: string) => void;
  onAddNewStudent: () => void;
  onExportExcel: () => void;
  onBulkImportExcel?: (file: File) => Promise<void>;
  onOpenPrintReport?: (mode: 'paid' | 'unpaid' | 'all') => void;
  teacherName: string;
  availableGrades?: string[];
}

export const StudentTable: React.FC<Props> = ({
  students,
  monthlyRecords,
  currentMonthKey,
  monthLabel,
  onOpenPayment,
  onEditStudent,
  onDeleteStudent,
  onAddNewStudent,
  onExportExcel,
  onBulkImportExcel,
  onOpenPrintReport,
  teacherName,
  availableGrades = GRADES_LIST,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'paid' | 'partial' | 'unpaid'>('ALL');
  const [discountOnly, setDiscountOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Collect all unique group names dynamically
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.groupName && s.groupName.trim()) {
        set.add(s.groupName.trim());
      }
    });
    return Array.from(set).sort();
  }, [students]);

  // Filter logic
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search matching name, code, phone, parent phone
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCode = s.studentCode.toLowerCase().includes(q);
        const matchesPhone = s.phone.includes(q);
        const matchesParent = s.parentPhone.includes(q);
        const matchesGroup = (s.groupName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesParent && !matchesGroup) {
          return false;
        }
      }

      // Grade match
      if (selectedGrade !== 'ALL' && s.grade !== selectedGrade) {
        return false;
      }

      // Group match
      if (selectedGroup !== 'ALL' && s.groupName !== selectedGroup) {
        return false;
      }

      // Discount filter
      if (discountOnly) {
        const isDisc = s.hasDiscount || (s.discountAmount && s.discountAmount > 0) || s.isFullExemption;
        if (!isDisc) return false;
      }

      // Status match for current month
      if (selectedStatus !== 'ALL') {
        const rec = monthlyRecords[`${s.id}_${currentMonthKey}`];
        const req = rec?.requiredAmount ?? s.monthlyFee;
        const paid = rec?.paidAmount ?? 0;
        
        let status: PaymentStatus = 'unpaid';
        if (paid >= req && req > 0) {
          status = 'paid';
        } else if (req === 0) {
          status = 'paid'; // exempt students
        } else if (paid > 0) {
          status = 'partial';
        }

        if (status !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [students, monthlyRecords, currentMonthKey, searchQuery, selectedGrade, selectedGroup, discountOnly, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Handle page change safely
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const discountedCount = students.filter(s => s.hasDiscount || (s.discountAmount && s.discountAmount > 0) || s.isFullExemption).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Top Filter and Search Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Quick Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ابحث بالاسم، كود الطالب، رقم التليفون، أو رقم ولي الأمر..."
              className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAddNewStudent}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة طالب</span>
            </button>

            {/* Print Buttons for Paid, Unpaid, and All in same PDF */}
            {onOpenPrintReport && (
              <>
                <button
                  onClick={() => onOpenPrintReport('all')}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
                  title="طباعة كشف شامل: المسددين لوحدهم وغير المسددين لوحدهم في نفس الـ PDF"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>طباعة الكل (PDF)</span>
                </button>

                <button
                  onClick={() => onOpenPrintReport('paid')}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
                  title="طباعة كشف الطلاب الذين سددوا فقط بصيغة PDF"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>المسددين فقط</span>
                </button>

                <button
                  onClick={() => onOpenPrintReport('unpaid')}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
                  title="طباعة كشف الطلاب الذين لم يسددوا والمتبقي عليهم بصيغة PDF"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>غير المسددين فقط</span>
                </button>
              </>
            )}

            <button
              onClick={onExportExcel}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
              title="تصدير شيت إكسيل لهذا الشهر"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden lg:inline">تصدير إكسيل</span>
            </button>

            {onBulkImportExcel && (
              <label 
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title="استيراد شيت إكسيل الطلاب بدون تضارب"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span className="hidden lg:inline">استيراد إكسيل</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      onBulkImportExcel(f);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="ALL">جميع الصفوف ({availableGrades.length})</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Group Filter */}
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="ALL">جميع المجموعات ({availableGroups.length})</option>
              {availableGroups.map((grp) => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>

            {/* Discount Filter Button */}
            <button
              type="button"
              onClick={() => {
                setDiscountOnly(!discountOnly);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                discountOnly
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>طلاب الخصم ({discountedCount})</span>
            </button>

            {/* Payment Status Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
              <button
                onClick={() => { setSelectedStatus('ALL'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                الجميع ({students.length})
              </button>
              <button
                onClick={() => { setSelectedStatus('paid'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'paid' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                خالص بالكامل
              </button>
              <button
                onClick={() => { setSelectedStatus('partial'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'partial' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
              >
                سداد جزئي (متبقي)
              </button>
              <button
                onClick={() => { setSelectedStatus('unpaid'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'unpaid' ? 'bg-red-600 text-white' : 'text-red-700 hover:bg-red-50'}`}
              >
                لم يسدد
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>عرض {filteredStudents.length} من أصل {students.length} طالب</span>
          </div>
        </div>
      </div>

      {/* Main Students Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
              <th className="py-3 px-3.5 w-16 text-center">الكود</th>
              <th className="py-3 px-4">اسم الطالب</th>
              <th className="py-3 px-3">الصف والمجموعة</th>
              <th className="py-3 px-3">هاتف الطالب وولي الأمر</th>
              <th className="py-3 px-3 text-center">المطلوب لشهر {monthLabel.split(' ')[0]}</th>
              <th className="py-3 px-3 text-center">المسدد</th>
              <th className="py-3 px-3 text-center">المتبقي</th>
              <th className="py-3 px-3 text-center">حالة السداد</th>
              <th className="py-3 px-4 text-center">الإجراءات والسداد اللحظي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">لا توجد نتائج مطابقة لبحثك</p>
                    <p className="text-xs text-slate-400">جرب تغيير كلمات البحث أو الفلاتر بالأعلى</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student) => {
                const record = monthlyRecords[`${student.id}_${currentMonthKey}`];
                const required = record?.requiredAmount ?? student.monthlyFee;
                const paid = record?.paidAmount ?? 0;
                const remaining = record?.remainingAmount ?? Math.max(0, required - paid);
                
                const isPaidFull = (paid >= required && required > 0) || (required === 0 && paid === 0);
                const isPartial = paid > 0 && remaining > 0;
                const isUnpaid = paid === 0 && required > 0;

                const parentWhatsAppUrl = createWhatsAppLink(
                  student.parentPhone,
                  student.name,
                  monthLabel,
                  paid,
                  remaining,
                  record?.receiptNumber || 'لم يستخرج بعد',
                  teacherName,
                  student.discountAmount || record?.discountAmount,
                  student.discountReason || record?.discountReason
                );

                return (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${isPartial ? 'bg-amber-50/20' : ''}`}
                  >
                    {/* Code */}
                    <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-700 bg-slate-50/30">
                      #{student.studentCode}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{student.name}</div>
                      {student.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{student.notes}</div>
                      )}
                    </td>

                    {/* Grade & Group */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 text-xs">{student.grade}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">{student.groupName || 'بدون مجموعة'}</div>
                    </td>

                    {/* Phones */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-emerald-800 font-semibold">
                          <span className="text-[10px] text-slate-400 font-sans">ولي الأمر:</span>
                          <span dir="ltr">{student.parentPhone}</span>
                          <a
                            href={parentWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="مراسلة ولي الأمر عبر واتساب بتفاصيل المصروفات"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {student.phone && (
                          <div className="flex items-center gap-1 font-mono text-slate-600 text-[11px]">
                            <span className="text-[10px] text-slate-400 font-sans">الطالب:</span>
                            <span dir="ltr">{student.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Required Fee with Discount Badge */}
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      <div>{formatCurrency(required)}</div>
                      {(student.hasDiscount || (student.discountAmount && student.discountAmount > 0) || student.isFullExemption) && (
                        <div className="mt-1">
                          <span 
                            className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            title={student.discountReason || 'مطبق عليه خصم خاص'}
                          >
                            <Tag className="w-2.5 h-2.5 text-amber-600" />
                            {student.isFullExemption ? 'إعفاء مجاني' : `خصم ${student.discountAmount} ج.م`}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Paid */}
                    <td className="py-3 px-3 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      {formatCurrency(paid)}
                    </td>

                    {/* Remaining */}
                    <td className="py-3 px-3 text-center font-black">
                      {remaining > 0 ? (
                        <span className="text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md text-xs">
                          {formatCurrency(remaining)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs">0 ج.م</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {isPaidFull ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          خالص بالكامل
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          سداد جزئي
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <Clock className="w-3 h-3 text-red-600" />
                          لم يسدد
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenPayment(student)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition"
                          title="تسجيل سداد لهذا الشهر"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>سداد</span>
                        </button>

                        <button
                          onClick={() => onEditStudent(student)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="تعديل بيانات الطالب"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteStudent(student.id, student.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="حذف الطالب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>الطلاب في كل صفحة:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-400">|</span>
          <span>صفحة {currentPage} من {totalPages}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 3 + i;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
            }
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-7 h-7 rounded-lg font-bold text-xs transition ${
                  currentPage === pageNum
                    ? 'bg-emerald-700 text-white'
                    : 'hover:bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
