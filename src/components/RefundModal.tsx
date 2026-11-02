import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertTriangle, Smartphone, CheckCircle, Receipt, ArrowRight } from 'lucide-react';
import { PaymentTransaction } from '../types';
import { formatCurrency, formatDateTime, getMonthLabel } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransaction | null;
  onConfirmRefund: (payload: {
    transactionId: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    monthKey: string;
    refundAmount: number;
    reason: string;
    recordedBy: string;
    originalReceiptNumber: string;
  }) => Promise<any>;
  currentDeviceName: string;
}

export const RefundModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transaction,
  onConfirmRefund,
  currentDeviceName,
}) => {
  if (!isOpen || !transaction) return null;

  const maxRefundable = Math.max(0, transaction.amount - (transaction.refundedAmount || 0));
  const [refundAmount, setRefundAmount] = useState<number | ''>(maxRefundable);
  const [reason, setReason] = useState<string>('اعتذار عن الشهر وسحب المبلغ كاش');
  const [recordedBy, setRecordedBy] = useState<string>(currentDeviceName || 'مستر أحمد الشعراوي');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const maxVal = Math.max(0, transaction.amount - (transaction.refundedAmount || 0));
    setRefundAmount(maxVal);
    setReason('اعتذار عن الشهر وسحب المبلغ كاش');
    setRecordedBy(currentDeviceName || 'مستر أحمد الشعراوي');
    setError(null);
  }, [isOpen, transaction, currentDeviceName]);

  const numRefund = typeof refundAmount === 'number' ? refundAmount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    if (amount > maxRefundable) {
      setError(`لا يمكن استرجاع مبلغ أكبر من المتبقي القابل للاسترجاع (${maxRefundable} ج.م)`);
      return;
    }

    if (!reason.trim()) {
      setError('يرجى توضيح سبب الاسترجاع');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmRefund({
        transactionId: transaction.id,
        studentId: transaction.studentId,
        studentName: transaction.studentName,
        studentCode: transaction.studentCode,
        monthKey: transaction.monthKey,
        refundAmount: amount,
        reason: reason.trim(),
        recordedBy: recordedBy.trim() || 'مكتب مستر أحمد الشعراوي',
        originalReceiptNumber: transaction.receiptNumber,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تنفيذ عملية الاسترجاع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-800 via-red-800 to-rose-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <RotateCcw className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                استرجاع مبلغ وإلغاء عملية سداد
              </h3>
              <p className="text-xs text-rose-200">
                إلغاء دفعة مسجلة وتحديث الخزينة وحساب الطالب فوراً
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-800 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-800 text-xs sm:text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Original Transaction Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">تفاصيل العملية الأصلية:</span>
              <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                إيصال: {transaction.receiptNumber}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="font-bold text-slate-900 text-base block">{transaction.studentName}</span>
                <span className="text-xs text-slate-500">
                  كود #{transaction.studentCode} • شهر: {getMonthLabel(transaction.monthKey)}
                </span>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-500 block">المبلغ المدفوع:</span>
                <span className="text-lg font-black text-emerald-700">{formatCurrency(transaction.amount)}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-200/80 pt-1.5 flex justify-between">
              <span>تاريخ السداد: {formatDateTime(transaction.paymentDate || transaction.createdAt)}</span>
              <span>سُجل بواسطة: {transaction.recordedBy || 'المكتب'}</span>
            </div>
          </div>

          {/* Refund Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                المبلغ المراد استرجاعه للطالب (ج.م) *
              </label>
              <span className="text-xs text-slate-500">أقصى مبلغ متاح: {maxRefundable} ج.م</span>
            </div>

            <div className="relative">
              <input
                type="number"
                required
                min="0.01"
                max={maxRefundable}
                step="any"
                value={refundAmount === '' ? '' : refundAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setRefundAmount(val === '' ? '' : parseFloat(val));
                }}
                className="w-full px-4 py-3 border-2 border-rose-500 rounded-xl focus:ring-4 focus:ring-rose-100 text-center font-black text-2xl text-rose-950 bg-rose-50/40"
                placeholder="أدخل المبلغ..."
                autoFocus
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ج.م
              </span>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRefundAmount(maxRefundable)}
                className="px-2.5 py-1 text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition"
              >
                استرجاع كامل المبلغ ({maxRefundable} ج.م)
              </button>
              {maxRefundable > 100 && (
                <button
                  type="button"
                  onClick={() => setRefundAmount(Math.round(maxRefundable / 2))}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  نصف المبلغ ({Math.round(maxRefundable / 2)} ج.م)
                </button>
              )}
              {maxRefundable >= 100 && (
                <button
                  type="button"
                  onClick={() => setRefundAmount(100)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  100 ج.م
                </button>
              )}
            </div>
          </div>

          {/* Reason for Refund */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              سبب الاسترجاع (للتوثيق في الخزينة وسجل الرقابة) *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
              placeholder="مثال: الطالب سحب الفلوس / اعتذر عن الشهر..."
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'اعتذار عن الشهر وسحب المبلغ كاش',
                'خطأ في تسجيل الدفعة السابقة',
                'سحب المبلغ بناءً على طلب ولي الأمر',
                'توقف عن الحضور'
              ].map((reasonChip) => (
                <button
                  key={reasonChip}
                  type="button"
                  onClick={() => setReason(reasonChip)}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                >
                  {reasonChip}
                </button>
              ))}
            </div>
          </div>

          {/* Recorded By */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              المسؤول عن عملية الاسترجاع:
            </label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              placeholder="اسم الجهاز أو المساعد"
            />
          </div>

          {/* Live System Impact Notice */}
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              الأثر الفعلي لهذه العملية في المنظومة:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pr-1">
              <li>خصم {numRefund || 0} ج.م من إجمالي رصيد الخزينة المحصلة.</li>
              <li>إعادة المبلغ لحساب الطالب ليظهر كمبلغ متبقي مطلوب منه فوراً.</li>
              <li>إصدار إيصال استرجاع رسمي معتمد يمكن طباعته أو إرساله لولي الأمر.</li>
            </ul>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numRefund <= 0 || numRefund > maxRefundable}
              className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold flex items-center gap-2 shadow transition disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              {isSubmitting ? 'جاري الاسترجاع الفوري...' : `تأكيد استرجاع ${numRefund || 0} ج.م وإلغاء العملية`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
