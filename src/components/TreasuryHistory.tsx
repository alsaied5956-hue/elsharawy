import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Smartphone, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
  UserCheck,
  Clock,
  Filter
} from 'lucide-react';
import { PaymentTransaction } from '../types';
import { 
  formatCurrency, 
  formatDateTime, 
  exportTransactionsToExcel, 
  getMonthLabel,
  getArabicDayName,
  formatArabicDateOnly,
  formatArabicTimeOnly
} from '../utils/helpers';

interface Props {
  transactions: PaymentTransaction[];
  onViewReceipt: (transaction: PaymentTransaction) => void;
  onOpenRefund?: (transaction: PaymentTransaction) => void;
  teacherName: string;
}

export const TreasuryHistory: React.FC<Props> = ({
  transactions,
  onViewReceipt,
  onOpenRefund,
  teacherName,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'payment' | 'refund'>('ALL');
  const [selectedCollector, setSelectedCollector] = useState<string>('ALL');

  // Unique list of collectors
  const collectorsList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.recordedBy && t.recordedBy.trim()) {
        set.add(t.recordedBy.trim());
      }
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Breakdown of collections by assistant
  const assistantStats = useMemo(() => {
    const map = new Map<string, { count: number; totalIn: number; totalRefund: number }>();
    transactions.forEach((t) => {
      const name = t.recordedBy || 'المسؤول الرئيسي';
      const cur = map.get(name) || { count: 0, totalIn: 0, totalRefund: 0 };
      cur.count += 1;
      if (t.type === 'refund') {
        cur.totalRefund += Math.abs(t.amount);
      } else {
        cur.totalIn += t.amount;
      }
      map.set(name, cur);
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      net: data.totalIn - data.totalRefund,
    })).sort((a, b) => b.net - a.net);
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions;

    if (filterType !== 'ALL') {
      list = list.filter((t) => {
        if (filterType === 'refund') {
          return t.type === 'refund' || t.isRefunded;
        }
        return t.type !== 'refund';
      });
    }

    if (selectedCollector !== 'ALL') {
      list = list.filter((t) => (t.recordedBy || '').trim() === selectedCollector);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (t) =>
        t.studentName.toLowerCase().includes(q) ||
        t.studentCode.toLowerCase().includes(q) ||
        t.receiptNumber.toLowerCase().includes(q) ||
        (t.recordedBy || '').toLowerCase().includes(q) ||
        (t.refundReason || '').toLowerCase().includes(q) ||
        (t.note || '').toLowerCase().includes(q)
    );
  }, [transactions, search, filterType, selectedCollector]);

  // Treasury Metrics
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;

    for (const t of transactions) {
      if (t.type === 'refund') {
        totalOut += Math.abs(t.amount);
      } else {
        totalIn += t.amount;
        if (t.refundedAmount) {
          totalOut += t.refundedAmount;
        }
      }
    }

    const net = totalIn - totalOut;

    return {
      totalIn,
      totalOut,
      net,
    };
  }, [transactions]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col space-y-4 p-4 sm:p-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            سجل الخزينة وتدقيق التحصيلات الحية (Audit Log)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق دقيق لكل عملية: مين اللي عملها (المساعد/الأدمن) وعملها يوم إيه والساعة كام بالضبط
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

      {/* Treasury Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              إجمالي المقبوضات الواردة
            </span>
            <span className="text-xl font-black text-emerald-800 mt-0.5 block">
              {formatCurrency(metrics.totalIn)}
            </span>
          </div>
          <span className="text-[11px] bg-emerald-200/60 text-emerald-900 px-2.5 py-1 rounded-full font-bold">
            سداد
          </span>
        </div>

        <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              إجمالي المبالغ المسترجعة
            </span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block">
              {formatCurrency(metrics.totalOut)}
            </span>
          </div>
          <span className="text-[11px] bg-rose-200/60 text-rose-900 px-2.5 py-1 rounded-full font-bold">
            استرجاع
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              الصافي الفعلي بالخزينة الآن
            </span>
            <span className="text-xl font-black text-emerald-300 mt-0.5 block">
              {formatCurrency(metrics.net)}
            </span>
          </div>
          <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-400/30">
            الرصيد الصافي
          </span>
        </div>
      </div>

      {/* Assistant Collections Summary Bar */}
      {assistantStats.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <span>متابعة تحصيل المساعدين وفريق العمل:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {assistantStats.map((ast) => (
              <div 
                key={ast.name}
                onClick={() => setSelectedCollector(selectedCollector === ast.name ? 'ALL' : ast.name)}
                className={`p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                  selectedCollector === ast.name
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">{ast.name}</span>
                  <span className="text-[10px] text-slate-500">{ast.count} عملية</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500">الصافي:</span>
                  <span className="font-black text-emerald-700">{formatCurrency(ast.net)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الإيصال، كود أو اسم الطالب، أو اسم المساعد..."
            className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Assistant Filter Dropdown */}
          {collectorsList.length > 0 && (
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">جميع المحصلين ({collectorsList.length})</option>
              {collectorsList.map((col) => (
                <option key={col} value={col}>
                  المحصل: {col}
                </option>
              ))}
            </select>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg transition ${
                filterType === 'ALL' ? 'bg-white font-bold text-slate-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              الكل ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('payment')}
              className={`px-3 py-1 rounded-lg transition ${
                filterType === 'payment' ? 'bg-white font-bold text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              المقبوضات فقط
            </button>
            <button
              onClick={() => setFilterType('refund')}
              className={`px-3 py-1 rounded-lg transition ${
                filterType === 'refund' ? 'bg-white font-bold text-rose-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              الاسترجاعات فقط
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-right border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
              <th className="py-3 px-3">رقم الإيصال</th>
              <th className="py-3 px-3">يوم وتاريخ العملية</th>
              <th className="py-3 px-3">توقيت العملية</th>
              <th className="py-3 px-3">كود الطالب</th>
              <th className="py-3 px-3">اسم الطالب</th>
              <th className="py-3 px-2">الشهر</th>
              <th className="py-3 px-3 text-center">المبلغ</th>
              <th className="py-3 px-3">حالة العملية</th>
              <th className="py-3 px-3">المستلم / الأسيستنت</th>
              <th className="py-3 px-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  لا توجد أي حركات مطابقة لبحثك في الخزينة.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isRefundRecord = t.type === 'refund';
                const isAlreadyRefunded = !!t.isRefunded;
                const dateVal = t.paymentDate || t.createdAt;
                const dayName = getArabicDayName(dateVal);
                const dateFormatted = formatArabicDateOnly(dateVal);
                const timeFormatted = formatArabicTimeOnly(dateVal);

                return (
                  <tr 
                    key={t.id} 
                    className={`transition-colors ${
                      isRefundRecord 
                        ? 'bg-rose-50/40 hover:bg-rose-50/70' 
                        : isAlreadyRefunded 
                          ? 'bg-amber-50/30 hover:bg-amber-50/50' 
                          : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 text-xs">
                      {t.receiptNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-800 text-xs font-semibold">
                      <span className="font-bold text-emerald-950 block">{dayName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{dateFormatted}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs font-mono">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {timeFormatted}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      #{t.studentCode}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {t.studentName}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-700 text-xs">
                      {getMonthLabel(t.monthKey)}
                    </td>
                    <td className="py-3 px-3 text-center text-sm font-black">
                      {isRefundRecord ? (
                        <span className="text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-lg inline-block">
                          - {formatCurrency(Math.abs(t.amount))}
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg inline-block">
                          + {formatCurrency(t.amount)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {isRefundRecord ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                          <RotateCcw className="w-3 h-3" />
                          استرجاع
                        </span>
                      ) : isAlreadyRefunded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md" title={t.refundReason}>
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                          تم استرجاعه ({t.refundedAmount || t.amount} ج.م)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3" />
                          سداد مؤكد
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-800 text-xs">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        {t.recordedBy || 'المكتب الرئيسي'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewReceipt(t)}
                          className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium inline-flex items-center gap-1 transition"
                          title="عرض الإيصال الرسمي"
                        >
                          <Printer className="w-3 h-3" />
                          إيصال
                        </button>

                        {/* Refund / Cancel button */}
                        {!isRefundRecord && !isAlreadyRefunded && onOpenRefund && (
                          <button
                            onClick={() => onOpenRefund(t)}
                            className="px-2 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold inline-flex items-center gap-1 transition"
                            title="استرجاع المبلغ وإلغاء العملية"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            استرجاع
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
