import React from 'react';
import { Users, DollarSign, AlertCircle, CheckCircle2, TrendingUp, Calendar, Printer } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

interface Props {
  totalStudents: number;
  activeStudents: number;
  totalRequired: number;
  totalCollected: number;
  totalRemaining: number;
  todayCollected: number;
  monthLabel: string;
  onOpenPrintReport?: (mode: 'paid' | 'unpaid' | 'all') => void;
}

export const StatsCards: React.FC<Props> = ({
  totalStudents,
  activeStudents,
  totalRequired,
  totalCollected,
  totalRemaining,
  todayCollected,
  monthLabel,
  onOpenPrintReport,
}) => {
  const collectionPercentage = totalRequired > 0 
    ? Math.min(100, Math.round((totalCollected / totalRequired) * 100))
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Active Students */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">الطلاب المقيدين</span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-slate-900">{activeStudents}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            سعة 1000+ طالب
          </div>
        </div>
      </div>

      {/* 2. Total Required For Month */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">مطلوب {monthLabel}</span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-slate-900">{formatCurrency(totalRequired)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">إجمالي التارجت</div>
        </div>
      </div>

      {/* 3. Total Collected */}
      <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs bg-gradient-to-b from-white to-emerald-50/30 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-700 font-bold">المحصل بالخزينة</span>
          <div className="flex items-center gap-1">
            {onOpenPrintReport && (
              <button
                onClick={() => onOpenPrintReport('paid')}
                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-md transition"
                title="طباعة كشف المسددين كـ PDF"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-emerald-700">{formatCurrency(totalCollected)}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">تم تسديده فعلياً</div>
        </div>
      </div>

      {/* 4. Total Remaining */}
      <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-xs bg-gradient-to-b from-white to-amber-50/30 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-amber-800 font-bold">المتبقي في الذمة</span>
          <div className="flex items-center gap-1">
            {onOpenPrintReport && (
              <button
                onClick={() => onOpenPrintReport('unpaid')}
                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-md transition"
                title="طباعة كشف غير المسددين كـ PDF"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-amber-700">{formatCurrency(totalRemaining)}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">مستحقات مؤجلة</div>
        </div>
      </div>

      {/* 5. Percentage */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">نسبة التحصيل</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-slate-900">{collectionPercentage}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${collectionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 6. Today's Collections */}
      <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-xs bg-gradient-to-b from-white to-teal-50/30 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-teal-800 font-bold">تحصيل اليوم</span>
          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-teal-800">{formatCurrency(todayCollected)}</div>
          <div className="text-[11px] text-teal-600 font-medium mt-0.5">سجل اليوم المباشر</div>
        </div>
      </div>
    </div>
  );
};
