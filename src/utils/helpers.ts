import * as XLSX from 'xlsx';
import { MonthOption, Student, MonthlyRecord, PaymentTransaction } from '../types';

export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const GRADES_LIST = [
  'ثانية باكالوريا',
  'ثالثة ثانوي'
];

export function getAcademicMonths(): MonthOption[] {
  // Typical academic year spans from August to July
  const months: MonthOption[] = [];
  const currentYear = new Date().getFullYear();
  
  // List current year and previous/next academic range
  const years = [currentYear - 1, currentYear, currentYear + 1];
  for (const yr of years) {
    for (let m = 0; m < 12; m++) {
      const monthStr = String(m + 1).padStart(2, '0');
      const key = `${yr}-${monthStr}`;
      const label = `${ARABIC_MONTHS[m]} ${yr}`;
      months.push({ key, label, year: yr, monthIndex: m });
    }
  }
  return months;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const yr = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${yr}-${m}`;
}

export function getMonthLabel(monthKey: string): string {
  const [yrStr, mStr] = monthKey.split('-');
  const mIdx = parseInt(mStr, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${ARABIC_MONTHS[mIdx]} ${yrStr}`;
  }
  return monthKey;
}

export function formatCurrency(amount: number, currency: string = 'ج.م'): string {
  return `${(amount || 0).toLocaleString('ar-EG')} ${currency}`;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function generateReceiptNumber(): string {
  const d = new Date();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${rand}`;
}

export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    // Egyptian number without country code
    cleaned = '2' + cleaned;
  }
  return cleaned;
}

export function createWhatsAppLink(
  phone: string,
  studentName: string,
  monthLabel: string,
  paidAmount: number,
  remainingAmount: number,
  receiptNumber: string,
  teacherName: string = 'مستر أحمد الشعراوي'
): string {
  const cleanPhone = cleanPhoneNumber(phone);
  let statusText = '';
  if (remainingAmount <= 0) {
    statusText = `✅ تم سداد كامل مصروفات شهر (${monthLabel}) بقيمة: ${paidAmount} ج.م.\nرقم الإيصال: ${receiptNumber}\nحالة الحساب: خالص بالكامل 🌟`;
  } else {
    statusText = `📌 تفاصيل سداد مصروفات شهر (${monthLabel}):\n- المبلغ المسدد: ${paidAmount} ج.م\n- المبلغ المتبقي: ${remainingAmount} ج.م\nرقم الإيصال: ${receiptNumber}\nيرجى استكمال باقي المصروفات في الحصة القادمة.`;
  }

  const message = `السلام عليكم ورحمة الله وبركاته 🌹
تحياتنا لسيادتكم من مكتب ${teacherName}.

بخصوص الطالب / الطالبة: ${studentName}

${statusText}

مع أطيب التمنيات بدوام التوفيق والنجاح.
📞 للاستفسارات يرجى التواصل معنا مباشرة.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function createRefundWhatsAppLink(
  phone: string,
  studentName: string,
  monthLabel: string,
  refundAmount: number,
  receiptNumber: string,
  remainingAmount: number,
  reason: string,
  teacherName: string = 'مستر أحمد الشعراوي'
): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const message = `السلام عليكم ورحمة الله وبركاته 🌹
تحياتنا لسيادتكم من مكتب ${teacherName}.

بخصوص الطالب / الطالبة: ${studentName}

↩️ تم استرجاع مبلغ وقدره: ${refundAmount} ج.م
بخصوص مصروفات شهر: (${monthLabel})
رقم إيصال الاسترجاع: ${receiptNumber}
سبب الاسترجاع: ${reason || 'بناءً على طلب ولي الأمر'}
المتبقي الحالي على الطالب للشهر: ${remainingAmount} ج.م

نسعد دائماً بخدمتكم وتواصلكم معنا.
📞 للاستفسارات يرجى التواصل معنا مباشرة عبر هذا الرقم.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function exportToExcel(students: Student[], monthlyRecords: Record<string, MonthlyRecord>, currentMonthKey: string) {
  const monthLabel = getMonthLabel(currentMonthKey);
  
  const data = students.map((s, idx) => {
    const recordKey = `${s.id}_${currentMonthKey}`;
    const rec = monthlyRecords[recordKey];
    const req = rec?.requiredAmount ?? s.monthlyFee;
    const paid = rec?.paidAmount ?? 0;
    const rem = rec?.remainingAmount ?? (req - paid);
    
    let statusAr = 'لم يسدد';
    if (paid >= req && req > 0) statusAr = 'تم السداد بالكامل';
    else if (paid > 0) statusAr = 'سداد جزئي (متبقي)';

    return {
      'م': idx + 1,
      'كود الطالب': s.studentCode,
      'اسم الطالب': s.name,
      'الصف الدراسي': s.grade,
      'المجموعة': s.groupName || '-',
      'رقم هاتف الطالب': s.phone,
      'رقم ولي الأمر': s.parentPhone,
      'المصروفات المطلوبة': req,
      'المسدد': paid,
      'المتبقي': rem,
      'حالة السداد للشهر': statusAr,
      'الشهر': monthLabel,
      'تاريخ آخر دفعة': rec?.lastPaymentDate ? formatDateTime(rec.lastPaymentDate) : '-',
      'رقم آخر إيصال': rec?.receiptNumber || '-',
      'ملاحظات': s.notes || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `مصروفات_${monthLabel.replace(/\s+/g, '_')}`);
  XLSX.writeFile(workbook, `كشف_مصروفات_مستر_احمد_الشعراوي_${currentMonthKey}.xlsx`);
}

export function exportTransactionsToExcel(transactions: PaymentTransaction[]) {
  const data = transactions.map((t, idx) => ({
    'م': idx + 1,
    'نوع الحركة': t.type === 'refund' ? 'استرجاع مبلغ ↩️' : 'سداد مصروفات 💳',
    'حالة الحركة': t.isRefunded ? 'مسترجع / ملغي' : (t.type === 'refund' ? 'حركة استرجاع' : 'ساري ومؤكد'),
    'رقم الإيصال': t.receiptNumber,
    'تاريخ وتوقيت العملية': formatDateTime(t.paymentDate || t.createdAt),
    'كود الطالب': t.studentCode,
    'اسم الطالب': t.studentName,
    'شهر الاستحقاق': getMonthLabel(t.monthKey),
    'المبلغ (ج.م)': t.amount,
    'المسؤول / الأسيستنت': t.recordedBy || 'المكتب',
    'سبب أو ملاحظة': t.refundReason || t.note || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل_الخزينة_والحركات');
  XLSX.writeFile(workbook, `سجل_الخزينة_مستر_احمد_الشعراوي_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
