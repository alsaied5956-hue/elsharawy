import React, { useState } from 'react';
import { 
  Settings, 
  Smartphone, 
  Database, 
  Upload, 
  Download, 
  Sparkles, 
  AlertTriangle, 
  Save, 
  CheckCircle,
  HelpCircle,
  Lock,
  KeyRound,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';
import { SAMPLE_STUDENTS } from '../utils/sampleData';
import { GRADES_LIST } from '../utils/helpers';

interface Props {
  currentDeviceName: string;
  onUpdateDeviceName: (name: string) => void;
  defaultFee: number;
  onUpdateDefaultFee: (fee: number) => void;
  onSeedSampleData: (count: number) => Promise<void>;
  onBulkImportStudents: (students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  teacherName: string;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  onOpenResetModal: () => void;
}

export const SettingsView: React.FC<Props> = ({
  currentDeviceName,
  onUpdateDeviceName,
  defaultFee,
  onUpdateDefaultFee,
  onSeedSampleData,
  onBulkImportStudents,
  teacherName,
  onUpdatePassword,
  onOpenResetModal,
}) => {
  const [deviceName, setDeviceName] = useState(currentDeviceName);
  const [fee, setFee] = useState(defaultFee);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDeviceName(deviceName.trim() || 'الهاتف الرئيسي');
    onUpdateDefaultFee(Number(fee) || 250);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass.trim()) {
      setPassError('يرجى كتابة كلمة المرور الجديدة');
      return;
    }
    if (newPass.length < 4) {
      setPassError('كلمة المرور يجب أن تكون 4 أرقام أو حروف على الأقل');
      return;
    }
    if (newPass !== confirmNewPass) {
      setPassError('كلمة المرور الجديدة غير متطابقة مع التأكيد');
      return;
    }

    try {
      setIsSavingPass(true);
      setPassError(null);
      const success = await onUpdatePassword(currentPass, newPass);
      if (success) {
        setPassSuccess(true);
        setCurrentPass('');
        setNewPass('');
        setConfirmNewPass('');
        setTimeout(() => setPassSuccess(false), 3500);
      } else {
        setPassError('كلمة المرور الحالية غير صحيحة');
      }
    } catch {
      setPassError('حدث خطأ أثناء تحديث كلمة المرور');
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleSeed = async (count: number) => {
    try {
      setIsSeeding(true);
      setSeedMessage(null);
      await onSeedSampleData(count);
      setSeedMessage(`تم بنجاح توليد ${count} طالب تجريبي لاختبار المزامنة والسرعة!`);
      setTimeout(() => setSeedMessage(null), 4000);
    } catch (err) {
      setSeedMessage('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const imported: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = data.map((row, idx) => ({
          studentCode: String(row['كود الطالب'] || row['الكود'] || row['Code'] || 2000 + idx),
          name: String(row['اسم الطالب'] || row['الاسم'] || row['Name'] || 'طالب جديد'),
          phone: String(row['رقم هاتف الطالب'] || row['رقم الطالب'] || row['Phone'] || ''),
          parentPhone: String(row['رقم ولي الأمر'] || row['ولي الأمر'] || row['ParentPhone'] || '01000000000'),
          grade: String(row['الصف الدراسي'] || row['الصف'] || row['Grade'] || GRADES_LIST[3]),
          groupName: String(row['المجموعة'] || row['الميعاد'] || ''),
          monthlyFee: Number(row['المصروفات'] || row['المبلغ'] || fee || 250),
          status: 'active',
          joinedDate: new Date().toISOString().slice(0, 10),
          notes: String(row['ملاحظات'] || ''),
        }));

        if (imported.length > 0) {
          setIsSeeding(true);
          await onBulkImportStudents(imported);
          setSeedMessage(`تم استيراد ${imported.length} طالب من ملف Excel بنجاح!`);
          setTimeout(() => setSeedMessage(null), 4000);
        }
      } catch (error) {
        alert('حدث خطأ أثناء قراءة ملف Excel، يرجى التأكد من صيغة الملف');
      } finally {
        setIsSeeding(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* 1. Device Identity & Fee Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              هوية هذا الهاتف / الجهاز في المنظومة
            </h3>
            <p className="text-xs text-slate-500">
              يُسجل هذا الاسم تلقائياً مع كل عملية سداد تقوم بها من هذا الهاتف لتمييز من استلم المبلغ
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الهاتف أو المساعد الحالي *
              </label>
              <input
                type="text"
                required
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                placeholder="مثلاً: هاتف مستر أحمد الشعراوي"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المصروفات الشهرية الافتراضية للطلاب الجدد (ج.م) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="10"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-emerald-700 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4" />
                تم حفظ وتحديث الإعدادات بنجاح
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow transition"
            >
              <Save className="w-4 h-4" />
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>

      {/* 2. System Password Security */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              أمان المنظومة وتغيير كلمة المرور (Password)
            </h3>
            <p className="text-xs text-slate-500">
              كلمة المرور المشتركة لتسجيل الدخول للسيستم وحماية عمليات التقفيل والحذف
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {passError && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-800 text-xs font-bold rounded-lg">
              ⚠️ {passError}
            </div>
          )}
          {passSuccess && (
            <div className="p-3 bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>تم تحديث كلمة المرور وتطبيقها على جميع الهواتف فوراً بنجاح!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور الحالية *
              </label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                placeholder="أدخل الحالية (الافتراضية: 123456)"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور الجديدة *
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                placeholder="أدخل الجديدة"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تأكيد الجديدة *
              </label>
              <input
                type="password"
                required
                value={confirmNewPass}
                onChange={(e) => setConfirmNewPass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                placeholder="أعد إدخال الجديدة"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingPass}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSavingPass ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. DANGER ZONE: End of Academic Year / Reset System */}
      <div className="bg-red-50/50 rounded-2xl border-2 border-red-200 p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-950 text-base">
                زر تقفيل الحسابات وحذف الطلاب (البدء من جديد)
              </h3>
              <p className="text-xs text-red-800/80 mt-0.5">
                مخصص لتقفيل السنة أو الدورة السابقة وحذف جميع الطلاب وحساباتهم للبدء من الصفر، محمي بكلمة مرور وتأكيد أمان.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800 block mb-0.5">حماية مشددة من الضغط غير المقصود:</span>
            لن يتم أي حذف إلا بعد إدخال كلمة المرور الصحيحة وكتابة نص التأكيد وسؤالك عن تنزيل شيت Excel احتياطي.
          </div>

          <button
            type="button"
            onClick={onOpenResetModal}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-red-600/20 transition flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>تقفيل الحسابات وتصفير المنظومة</span>
          </button>
        </div>
      </div>

      {/* 4. Quick Test & Demo Seeding */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              اختبار السرعة وتوليد طلاب تجريبيين (Speed & Scale Test)
            </h3>
            <p className="text-xs text-slate-500">
              يمكنك بضغطة زر إضافة عينة من الطلاب وتجربة السداد الفوري والمزامنة بين الهواتف
            </p>
          </div>
        </div>

        {seedMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{seedMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSeed(10)}
            disabled={isSeeding}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {isSeeding ? 'جاري التحميل...' : 'إضافة 10 طلاب تجريبيين'}
          </button>

          <button
            onClick={() => handleSeed(50)}
            disabled={isSeeding}
            className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <Database className="w-4 h-4 text-teal-600" />
            {isSeeding ? 'جاري التحميل...' : 'إضافة 50 طالب دفعة واحدة (اختبار السعة الكبيرة)'}
          </button>
        </div>
      </div>

      {/* 5. Excel Bulk Import */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              استيراد قائمة الطلاب من ملف Excel خارجي
            </h3>
            <p className="text-xs text-slate-500">
              إذا كان لديك ملف Excel به أسماء طلابك (حتى أكثر من 1000 طالب)، يمكنك رفعه وسيتعرف النظام عليه فوراً
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-medium mb-3">
            اختر ملف Excel (.xlsx أو .xls) يحتوي على أعمدة (اسم الطالب، رقم ولي الأمر، الصف، المصروفات)
          </p>
          <label className="inline-block px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow transition">
            <span>اختر ملف Excel من جهازك</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

    </div>
  );
};
