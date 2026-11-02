import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, CheckCircle, AlertTriangle, RotateCcw, Smartphone, HelpCircle } from 'lucide-react';
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
  }) => Promise<{ receiptNumber: string; totalPaid: number; remaining: number } | undefined>;
  onRefundPayment?: (payload: {
    studentId: string;
    studentName: string;
    studentCode: string;
    monthKey: string;
    monthLabel: string;
    refundAmount: number;
    receiptNumber: string;
    recordedBy: string;
    reason: string;
  }) => Promise<any>;
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
  onRefundPayment,
  currentDeviceName,
}) => {
  const requiredFee = existingRecord?.requiredAmount ?? (student?.monthlyFee || 250);
  const previouslyPaid = existingRecord?.paidAmount ?? 0;
  const currentRemaining = Math.max(0, requiredFee - previouslyPaid);

  // Mode: 'pay' or 'refund'
  const [mode, setMode] = useState<'pay' | 'refund'>('pay');

  // Payment state
  const [payingNow, setPayingNow] = useState<number | ''>(currentRemaining > 0 ? currentRemaining : requiredFee);
  const [recordedBy, setRecordedBy] = useState<string>(currentDeviceName || 'مستر أحمد الشعراوي');
  const [note, setNote] = useState<string>('');

  // Refund state
  const [refundAmount, setRefundAmount] = useState<number | ''>(previouslyPaid);
  const [refundReason, setRefundReason] = useState<string>('اعتذار عن الشهر واسترداد المبلغ');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !student) return;
    // Reset defaults when modal opens
    const req = existingRecord?.requiredAmount ?? student.monthlyFee;
    const paid = existingRecord?.paidAmount ?? 0;
    const rem = Math.max(0, req - paid);
    setPayingNow(rem > 0 ? rem : req);
    setRefundAmount(paid);
    setRecordedBy(currentDeviceName || 'مستر أحمد الشعراوي');
    setNote('');
    setRefundReason('اعتذار عن الشهر واسترداد المبلغ');
    setError(null);
    setMode('pay');
  }, [isOpen, student, existingRecord, currentDeviceName]);

  if (!isOpen || !student) return null;

  const numPayingNow = typeof payingNow === 'number' ? payingNow : 0;
  const numRefundAmount = typeof refundAmount === 'number' ? refundAmount : 0;

  // Outcomes for Payment
  const newTotalPaid = previouslyPaid + numPayingNow;
  const newRemaining = Math.max(0, requiredFee - newTotalPaid);

  // Outcomes for Refund
  const afterRefundPaid = Math.max(0, previouslyPaid - numRefundAmount);
  const afterRefundRemaining = Math.max(0, requiredFee - afterRefundPaid);

  const handleQuickAmount = (amount: number) => {
    setPayingNow(Math.max(0, amount));
  };

  const handleQuickRefund = (amount: number) => {
    setRefundAmount(Math.min(previouslyPaid, Math.max(0, amount)));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
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

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRefundPayment) return;

    const amount = Number(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('يرجى إدخال مبلغ استرجاع صحيح أكبر من صفر');
      return;
    }

    if (amount > previouslyPaid) {
      setError(`لا يمكن استرجاع مبلغ أكبر من المسدد فعلياً (${previouslyPaid} ج.م)`);
      return;
    }

    if (!refundReason.trim()) {
      setError('يرجى توضيح سبب الاسترجاع للتوثيق في الخزينة');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const refundReceiptNo = `REF-${generateReceiptNumber().replace('REC-', '')}`;
      await onRefundPayment({
        studentId: student.id,
        studentName: student.name,
        studentCode: student.studentCode,
        monthKey,
        monthLabel,
        refundAmount: amount,
        receiptNumber: refundReceiptNo,
        recordedBy: recordedBy.trim() || 'مكتب مستر أحمد الشعراوي',
        reason: refundReason.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تنفيذ الاسترجاع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className={`text-white p-5 flex items-center justify-between transition-colors ${
          mode === 'pay' 
            ? 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900' 
            : 'bg-gradient-to-r from-rose-800 via-red-800 to-rose-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              {mode === 'pay' ? (
                <CreditCard className="w-6 h-6 text-emerald-300" />
              ) : (
                <RotateCcw className="w-6 h-6 text-rose-300" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {mode === 'pay' ? 'تسجيل سداد ومصروفات شهرية' : 'استرجاع مبلغ وإلغاء عملية سداد'}
              </h3>
              <p className="text-xs text-white/80">
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

        {/* Mode Toggle Switch (if student previously paid) */}
        {previouslyPaid > 0 && onRefundPayment && (
          <div className="bg-slate-100 p-1.5 flex gap-1 border-b border-slate-200">
            <button
              type="button"
              onClick={() => { setMode('pay'); setError(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                mode === 'pay'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              سداد دفعة جديدة
            </button>
            <button
              type="button"
              onClick={() => { setMode('refund'); setError(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                mode === 'refund'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              استرجاع مبلغ / إلغاء السداد ({previouslyPaid} ج.م مسدد)
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="m-5 mb-0 p-3 bg-red-50 border-r-4 border-red-500 text-red-800 text-xs sm:text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Student Info Card */}
        <div className="p-5 pb-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                  كود #{student.studentCode}
                </span>
                <span className="text-xs text-slate-500 font-medium">{student.grade}</span>
                {student.groupName && (
                  <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-1.5 py-0.5 rounded">
                    {student.groupName}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-base text-slate-900">{student.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                هاتف ولي الأمر: {student.parentPhone}
              </p>
            </div>

            {(student.hasDiscount || (student.discountAmount && student.discountAmount > 0) || student.isFullExemption) && (
              <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[10px] font-bold block text-amber-800">خصم خاص مطبق</span>
                <span className="text-xs font-black">
                  {student.isFullExemption ? 'إعفاء مجاني (100%)' : `-${student.discountAmount} ج.م`}
                </span>
                {student.discountReason && (
                  <span className="text-[10px] text-amber-700 block truncate max-w-[120px]">
                    {student.discountReason}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODE 1: PAY FORM */}
        {mode === 'pay' && (
          <form onSubmit={handleSubmitPayment} className="p-5 sm:p-6 space-y-5 text-slate-800 text-sm">
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
                <span className="text-xs text-slate-500">يقبل أي مبلغ (كامل أو جزء)</span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={payingNow === '' ? '' : payingNow}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPayingNow(val === '' ? '' : parseFloat(val));
                  }}
                  className="w-full px-4 py-3 border-2 border-emerald-500 rounded-xl focus:ring-4 focus:ring-emerald-100 text-center font-black text-2xl text-emerald-950 bg-emerald-50/30"
                  placeholder="اكتب المبلغ هنا..."
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
                  onClick={() => handleQuickAmount(250)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  250 ج.م
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(200)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  200 ج.م
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(100)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  100 ج.م
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(50)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  50 ج.م
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
                disabled={isSubmitting || numPayingNow <= 0}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {isSubmitting ? 'جاري التحديث الفوري...' : 'تأكيد السداد وتحديث كل الهواتف'}
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: REFUND / CANCEL FORM */}
        {mode === 'refund' && (
          <form onSubmit={handleSubmitRefund} className="p-5 sm:p-6 space-y-5 text-slate-800 text-sm">
            {/* Warning Banner */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
              <RotateCcw className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">تأكيد استرجاع المبلغ للطالب وإلغاء العملية</p>
                <p className="text-rose-700 mt-0.5">
                  سيتم خصم هذا المبلغ فوراً من رصيد الخزينة المحصلة وإعادته كرصيد متبقي مطلوب من الطالب لشهر {monthLabel}.
                </p>
              </div>
            </div>

            {/* Current Financial Status Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-800 block font-medium">إجمالي المسدد حالياً</span>
                <span className="text-lg font-black text-emerald-700">{formatCurrency(previouslyPaid)}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[11px] text-rose-800 block font-medium">أقصى مبلغ قابل للاسترجاع</span>
                <span className="text-lg font-black text-rose-700">{formatCurrency(previouslyPaid)}</span>
              </div>
            </div>

            {/* Refund Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  المبلغ المراد استرجاعه وإلغاؤه (ج.م) *
                </label>
                <span className="text-xs text-slate-500">استرجاع جزئي أو كلي</span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  required
                  min="0.01"
                  max={previouslyPaid}
                  step="any"
                  value={refundAmount === '' ? '' : refundAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRefundAmount(val === '' ? '' : parseFloat(val));
                  }}
                  className="w-full px-4 py-3 border-2 border-rose-500 rounded-xl focus:ring-4 focus:ring-rose-100 text-center font-black text-2xl text-rose-950 bg-rose-50/40"
                  placeholder="أدخل مبلغ الاسترجاع..."
                  autoFocus
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ج.م
                </span>
              </div>

              {/* Quick Action Buttons for Refund */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickRefund(previouslyPaid)}
                  className="px-2.5 py-1 text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition"
                >
                  استرجاع المبلغ كاملاً ({previouslyPaid} ج.م)
                </button>
                {previouslyPaid > 100 && (
                  <button
                    type="button"
                    onClick={() => handleQuickRefund(Math.round(previouslyPaid / 2))}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                  >
                    نصف المبلغ ({Math.round(previouslyPaid / 2)} ج.م)
                  </button>
                )}
                {previouslyPaid >= 100 && (
                  <button
                    type="button"
                    onClick={() => handleQuickRefund(100)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                  >
                    100 ج.م
                  </button>
                )}
                {previouslyPaid >= 50 && (
                  <button
                    type="button"
                    onClick={() => handleQuickRefund(50)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                  >
                    50 ج.م
                  </button>
                )}
              </div>
            </div>

            {/* Live Refund Outcome Preview */}
            <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-600 block">الحساب بعد الاسترجاع:</span>
                <span className="font-bold text-slate-900">
                  المسدد يتبقى: {afterRefundPaid} ج.م
                </span>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-bold px-2.5 py-1 rounded-lg">
                  المتبقي المطلوب: {afterRefundRemaining} ج.م
                </span>
              </div>
            </div>

            {/* Reason for Refund */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                سبب الاسترجاع (للتوثيق في الخزينة والرقابة) *
              </label>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                placeholder="اكتب سبب الاسترجاع..."
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'اعتذار عن الشهر واسترداد المبلغ',
                  'الطالب سحب الفلوس كاش',
                  'خطأ في تسجيل الدفعة السابقة',
                  'ظروف خاصة / خصم إضافي'
                ].map((reasonText) => (
                  <button
                    key={reasonText}
                    type="button"
                    onClick={() => setRefundReason(reasonText)}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                  >
                    {reasonText}
                  </button>
                ))}
              </div>
            </div>

            {/* Recorded by */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                المسؤول عن الاسترجاع:
              </label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                placeholder="مستر أحمد / الأسيستنت"
              />
            </div>

            {/* Footer Actions */}
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
                disabled={isSubmitting || numRefundAmount <= 0 || numRefundAmount > previouslyPaid}
                className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold flex items-center gap-2 shadow transition disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {isSubmitting ? 'جاري الاسترجاع الفوري...' : `تأكيد استرجاع ${numRefundAmount || 0} ج.م فوراً`}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
