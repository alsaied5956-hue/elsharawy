import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Smartphone, 
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { PaymentTransaction } from '../types';
import { formatCurrency, formatDateTime, exportTransactionsToExcel, getMonthLabel } from '../utils/helpers';

interface Props {
  transactions: PaymentTransaction[];
  onViewReceipt: (transaction: PaymentTransaction) => void;
  teacherName: string;
}

export const TreasuryHistory: React.FC<Props> = ({
  transactions,
  onViewReceipt,
  teacherName,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase().trim();
    return transactions.filter(
      (t) =>
        t.studentName.toLowerCase().includes(q) ||
        t.studentCode.toLowerCase().includes(q) ||
        t.receiptNumber.toLowerCase().includes(q) ||
        (t.recordedBy || '').toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const totalSum = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filtered]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            سجل الخزينة والإيصالات المباشر (Audit Log)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            يوثق كل جنيه تم تحصيله بالدقيقة والساعة مع اسم الجهاز/المساعد الذي استلمه
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTransactionsToExcel(transactions)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            تصدير سجل الخزينة Excel
          </button>
        </div>
      </div>

      {/* Filter and Summary Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الإيصال، اسم الطالب، أو اسم المساعد..."
            className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold bg-emerald-50 text-emerald-900 px-4 py-2 rounded-xl border border-emerald-200">
          <span>إجمالي المقبوضات المعروضة:</span>
          <span className="text-base font-black text-emerald-700">{formatCurrency(totalSum)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
              <th className="py-3 px-4">رقم الإيصال</th>
              <th className="py-3 px-4">تاريخ وساعة السداد</th>
              <th className="py-3 px-4">كود الطالب</th>
              <th className="py-3 px-4">اسم الطالب</th>
              <th className="py-3 px-3">شهر الاستحقاق</th>
              <th className="py-3 px-3 text-center">المبلغ المحصل</th>
              <th className="py-3 px-3">المستلم / الأسيستنت</th>
              <th className="py-3 px-4 text-center">الإيصال</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  لا توجد أي حركات دفع مسجلة حتى الآن في السجل.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 text-xs">
                    {t.receiptNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {formatDateTime(t.paymentDate || t.createdAt)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    #{t.studentCode}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {t.studentName}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700 text-xs">
                    {getMonthLabel(t.monthKey)}
                  </td>
                  <td className="py-3 px-3 text-center font-black text-emerald-700 text-sm bg-emerald-50/20">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-xs">
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                      <Smartphone className="w-3 h-3 text-slate-400" />
                      {t.recordedBy || 'المكتب'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onViewReceipt(t)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium inline-flex items-center gap-1 transition"
                    >
                      <Printer className="w-3 h-3" />
                      عرض الإيصال
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
