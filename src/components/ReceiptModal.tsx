import React from 'react';
import { X, Printer, Share2, CheckCircle2, MessageCircle, RotateCcw } from 'lucide-react';
import { formatCurrency, formatDateTime, createWhatsAppLink, createRefundWhatsAppLink } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    receiptNumber: string;
    studentName: string;
    studentCode: string;
    monthLabel: string;
    amountPaidNow: number; // or refunded amount
    totalPaid: number;
    requiredFee: number;
    remaining: number;
    recordedBy: string;
    date: string;
    parentPhone: string;
    studentPhone?: string;
    isRefund?: boolean;
    refundReason?: string;
    discountAmount?: number;
    discountReason?: string;
  } | null;
  teacherName?: string;
}

export const ReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  receiptData,
  teacherName = 'مستر أحمد الشعراوي',
}) => {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const isRefund = !!receiptData.isRefund;

  const parentWhatsAppUrl = isRefund
    ? createRefundWhatsAppLink(
        receiptData.parentPhone,
        receiptData.studentName,
        receiptData.monthLabel,
        receiptData.amountPaidNow,
        receiptData.receiptNumber,
        receiptData.remaining,
        receiptData.refundReason || 'بناءً على طلب ولي الأمر',
        teacherName
      )
    : createWhatsAppLink(
        receiptData.parentPhone,
        receiptData.studentName,
        receiptData.monthLabel,
        receiptData.amountPaidNow,
        receiptData.remaining,
        receiptData.receiptNumber,
        teacherName,
        receiptData.discountAmount,
        receiptData.discountReason
      );

  const studentWhatsAppUrl = receiptData.studentPhone
    ? isRefund
      ? createRefundWhatsAppLink(
          receiptData.studentPhone,
          receiptData.studentName,
          receiptData.monthLabel,
          receiptData.amountPaidNow,
          receiptData.receiptNumber,
          receiptData.remaining,
          receiptData.refundReason || 'بناءً على طلب ولي الأمر',
          teacherName
        )
      : createWhatsAppLink(
          receiptData.studentPhone,
          receiptData.studentName,
          receiptData.monthLabel,
          receiptData.amountPaidNow,
          receiptData.remaining,
          receiptData.receiptNumber,
          teacherName
        )
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className={`px-4 py-3 border-b flex items-center justify-between no-print ${
          isRefund ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {isRefund ? (
              <>
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span className="font-bold text-rose-900 text-sm">تم استرجاع المبلغ وتحديث الخزينة</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-800 text-sm">تم السداد والتحديث بنجاح</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Card */}
        <div className="p-6 text-slate-800 text-sm space-y-5 print:p-8" id="receipt-print-area">
          {/* Header */}
          <div className="text-center border-b-2 border-dashed border-slate-200 pb-4">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border mb-2 inline-block ${
              isRefund 
                ? 'text-rose-800 bg-rose-50 border-rose-300' 
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              {isRefund ? 'إيصال استرجاع مبلغ رسمي معتمد' : 'إيصال سداد رسمي معتمد'}
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              منظومة {teacherName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة شؤون الطلاب والمصروفات الشهرية
            </p>
            <div className="mt-3 inline-block font-mono text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-md">
              رقم الإيصال: {receiptData.receiptNumber}
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">اسم الطالب:</span>
              <span className="font-bold text-slate-900 text-sm">{receiptData.studentName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">كود الطالب:</span>
              <span className="font-mono font-bold text-slate-800">#{receiptData.studentCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">شهر الاستحقاق:</span>
              <span className="font-semibold text-slate-800">{receiptData.monthLabel}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">المصروفات المطلوبة للشهر:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(receiptData.requiredFee)}</span>
            </div>

            {receiptData.discountAmount && receiptData.discountAmount > 0 ? (
              <div className="flex justify-between py-1 border-b border-slate-100 bg-amber-50/60 px-2 py-1 rounded-md text-amber-900">
                <span className="font-bold flex items-center gap-1">
                  <span>🏷️ خصم خاص للطالب:</span>
                </span>
                <span className="font-bold text-amber-800 font-mono">
                  -{formatCurrency(receiptData.discountAmount)} {receiptData.discountReason ? `(${receiptData.discountReason})` : ''}
                </span>
              </div>
            ) : null}

            {/* Main Action Amount Highlight */}
            {isRefund ? (
              <div className="flex justify-between py-1 border-b border-slate-100 bg-rose-50/80 p-2.5 rounded-lg border border-rose-200">
                <span className="font-bold text-rose-900">المبلغ المسترجع:</span>
                <span className="font-black text-base text-rose-700">{formatCurrency(receiptData.amountPaidNow)}</span>
              </div>
            ) : (
              <div className="flex justify-between py-1 border-b border-slate-100 bg-emerald-50/70 p-2 rounded-lg">
                <span className="font-bold text-emerald-900">المبلغ المسدد الآن:</span>
                <span className="font-black text-base text-emerald-700">{formatCurrency(receiptData.amountPaidNow)}</span>
              </div>
            )}

            {isRefund && receiptData.refundReason && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-[11px] text-slate-600">
                <span className="text-slate-500">سبب الاسترجاع:</span>
                <span className="font-medium text-rose-900">{receiptData.refundReason}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">المسدد النهائي المتبقي بالشهر:</span>
              <span className="font-bold text-slate-900">{formatCurrency(receiptData.totalPaid)}</span>
            </div>

            <div className={`flex justify-between py-1.5 p-2 rounded-lg ${
              receiptData.remaining > 0 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'
            }`}>
              <span className="font-bold">المتبقي المطلوب على الطالب:</span>
              <span className="font-black text-sm">
                {receiptData.remaining > 0 ? formatCurrency(receiptData.remaining) : '0 ج.م (خالص بالكامل 🎉)'}
              </span>
            </div>

            <div className="flex justify-between py-1 text-slate-500 pt-2 text-[11px]">
              <span>تاريخ وساعة العملية:</span>
              <span>{formatDateTime(receiptData.date)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-500 text-[11px]">
              <span>المسؤول:</span>
              <span>{receiptData.recordedBy}</span>
            </div>
          </div>

          {/* Footer note in receipt */}
          <div className="text-center text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-3">
            {isRefund 
              ? 'إشعار استرجاع مالي رسمي موثق بقيد الخزينة.' 
              : 'شكراً لالتزامكم ونتمنى لجميع أبنائنا وبناتنا دوام التفوق والنجاح.'}
          </div>
        </div>

        {/* WhatsApp & Print Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 no-print">
          <a
            href={parentWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-2.5 px-4 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition text-xs sm:text-sm ${
              isRefund ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {isRefund ? 'إرسال إشعار الاسترجاع لولي الأمر (واتساب)' : 'إرسال إيصال وتفاصيل الحساب لولي الأمر (واتساب)'}
          </a>

          {studentWhatsAppUrl && (
            <a
              href={studentWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-2 transition text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              إرسال نسخة لواتساب الطالب
            </a>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handlePrint}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-medium flex items-center justify-center gap-2 transition text-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              طباعة الإيصال
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
