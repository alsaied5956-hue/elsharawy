import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, CheckCircle, AlertTriangle, ArrowRight, Smartphone } from 'lucide-react';
import { Student, MonthlyRecord } from '../types';
import { formatCurrency, generateReceiptNumber } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  monthKey: string;
  monthLabel: string;
  existingRecord?: MonthlyRecord | null;
  onSavePayment: (payload: {
    studentId: string;
    studentName: string;
    studentCode: string;
    monthKey: string;
    monthLabel: string;
    amountPaidNow: number;
    receiptNumber: string;
    recordedBy: string;
    note?: string;
  }) => Promise<{ receiptNumber: string; totalPaid: number; remaining: number }>;
  currentDeviceName: string;
}

export const PaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  student,
  monthKey,
  monthLabel,
  existingRecord,
  onSavePayment,
  currentDeviceName,
}) => {
  if (!isOpen || !student) return null;

  const requiredFee = existingRecord?.requiredAmount ?? student.monthlyFee;
  const previouslyPaid = existingRecord?.paidAmount ?? 0;
  const currentRemaining = Math.max(0, requiredFee - previouslyPaid);

  const [payingNow, setPayingNow] = useState<number>(currentRemaining > 0 ? currentRemaining : requiredFee);
  const [recordedBy, setRecordedBy] = useState<string>(currentDeviceName || 'مستر أحمد الشعراوي');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When modal opens or remaining changes, set default payingNow to remaining balance
    const rem = Math.max(0, requiredFee - previouslyPaid);
    setPayingNow(rem > 0 ? rem : requiredFee);
    setRecordedBy(currentDeviceName || 'مستر أحمد الشعراوي');
    setNote('');
    setError(null);
  }, [isOpen, student, existingRecord, currentDeviceName, requiredFee, previouslyPaid]);

  const newTotalPaid = previouslyPaid + (Number(payingNow) || 0);
  const newRemaining = requiredFee - newTotalPaid;

  const handleQuickAmount = (amount: number) => {
    setPayingNow(Math.max(0, amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payingNow);
    if (isNaN(amount) || amount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const receiptNo = generateReceiptNumber();
      await onSavePayment({
        studentId: student.id,
        studentName: student.name,
        studentCode: student.studentCode,
        monthKey,
        monthLabel,
        amountPaidNow: amount,
        receiptNumber: receiptNo,
        recordedBy: recordedBy.trim() || 'مكتب مستر أحمد الشعراوي',
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                تسجيل سداد ومصروفات شهرية
              </h3>
              <p className="text-xs text-emerald-100">
                شهر: {monthLabel} • منظومة مستر أحمد الشعراوي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-slate-800 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-800 text-xs sm:text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                  كود #{student.studentCode}
                </span>
                <span className="text-xs text-slate-500">{student.grade}</span>
              </div>
              <h4 className="font-bold text-base text-slate-900">{student.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                هاتف ولي الأمر: {student.parentPhone}
              </p>
            </div>
          </div>

          {/* Current Financial Status Breakdown */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">المطلوب للشهر</span>
              <span className="text-base font-black text-slate-800">{formatCurrency(requiredFee)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-700 block font-medium">مسدد سابقاً</span>
              <span className="text-base font-black text-emerald-700">{formatCurrency(previouslyPaid)}</span>
            </div>
            <div className={`p-3 rounded-xl border ${currentRemaining > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
              <span className={`text-[11px] block font-medium ${currentRemaining > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                المتبقي الحالي
              </span>
              <span className={`text-base font-black ${currentRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(currentRemaining)}
              </span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                المبلغ المراد دفعه الآن (ج.م) *
              </label>
              <span className="text-xs text-slate-500">يدعم سداد المبلغ كامل أو جزء منه</span>
            </div>

            <div className="relative">
              <input
                type="number"
                required
                min="1"
                step="5"
                value={payingNow || ''}
                onChange={(e) => setPayingNow(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-emerald-500 rounded-xl focus:ring-4 focus:ring-emerald-100 text-center font-black text-2xl text-emerald-950 bg-emerald-50/30"
                placeholder="0"
                autoFocus
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ج.م
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentRemaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(currentRemaining)}
                  className="px-2.5 py-1 text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition"
                >
                  سداد المتبقي كاملاً ({currentRemaining} ج.م)
                </button>
              )}
              {currentRemaining > 100 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(Math.round(currentRemaining / 2))}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition"
                >
                  نصف المتبقي ({Math.round(currentRemaining / 2)} ج.م)
                </button>
              )}
              <button
                type="button"
                onClick={() => handleQuickAmount(50)}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                50 ج.م
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(100)}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                100 ج.م
              </button>
            </div>
          </div>

          {/* Live Outcome Preview */}
          <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">الإجمالي بعد هذه العملية:</span>
              <span className="font-bold text-slate-800">
                مسدد: {newTotalPaid} ج.م من أصل {requiredFee} ج.م
              </span>
            </div>
            <div>
              {newRemaining <= 0 ? (
                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" />
                  خالص بالكامل (0 متبقي)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  متبقي {newRemaining} ج.م
                </span>
              )}
            </div>
          </div>

          {/* Audit / Recorded By & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                سُجل بواسطة (اسم الهاتف / المساعد):
              </label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                placeholder="مستر أحمد / أسيستنت القاعة"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظة على الدفعة (اختياري):
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                placeholder="مثال: استلمت كاش / فودافون كاش"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Number(payingNow) <= 0}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'جاري التحديث الفوري...' : 'تأكيد السداد وتحديث كل الهواتف'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
