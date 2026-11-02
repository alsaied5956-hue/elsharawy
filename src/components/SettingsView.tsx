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
import { GRADES_LIST, parseStudentsFromExcel } from '../utils/helpers';

interface Props {
  currentDeviceName: string;
  onUpdateDeviceName: (name: string) => void;
  defaultFee: number;
  onUpdateDefaultFee: (fee: number) => Promise<void>;
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
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Sync fee when changed from another device
  React.useEffect(() => {
    setFee(defaultFee);
  }, [defaultFee]);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingFee(true);
      onUpdateDeviceName(deviceName.trim() || 'الهاتف الرئيسي');
      await onUpdateDefaultFee(Number(fee) || 250);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } finally {
      setIsSavingFee(false);
    }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSeeding(true);
      setSeedMessage('جاري قراءة ملف Excel وتجهيز بيانات الطلاب...');
      const imported = await parseStudentsFromExcel(file, Number(fee) || defaultFee);

      if (imported.length > 0) {
        await onBulkImportStudents(imported);
        setSeedMessage(`🎉 تم استيراد ومعالجة ${imported.length} طالب من ملف Excel بنجاح دون أي تضارب!`);
        setTimeout(() => setSeedMessage(null), 5000);
      } else {
        alert('لم يتم العثور على بيانات طلاب صالحة في الملف، يرجى التأكد من احتواء الملف على عمود اسم الطالب والكود.');
        setSeedMessage(null);
      }
    } catch (error) {
      alert('حدث خطأ أثناء قراءة ملف Excel، يرجى التأكد من صيغة الملف');
      setSeedMessage(null);
    } finally {
      setIsSeeding(false);
      e.target.value = '';
    }
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
              هوية هذا الهاتف / الجهاز وإعدادات المصروفات
            </h3>
            <p className="text-xs text-slate-500">
              يُسجل هذا الاسم تلقائياً مع كل عملية سداد، مع إمكانية تعديل السعر وتطبيقه لحظياً على جميع الأجهزة
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
                المصروفات الشهرية لجميع الطلاب (ج.م) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="10"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 text-emerald-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                ⚡ عند حفظ السعر، يتم فوراً تحديث المطلوب لجميع الطلاب وإعادة حساب المتبقي ومزامنته لحظياً على جميع أجهزة المساعدين.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-emerald-700 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4" />
                تم حفظ وتحديث السعر وإعادة حساب كل شيء بنجاح على جميع الأجهزة!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={isSavingFee}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingFee ? 'جاري إعادة الحساب والمزامنة للجميع...' : 'حفظ وتطبيق السعر للجميع'}</span>
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
              استيراد قائمة الطلاب من ملف Excel المتوافق
            </h3>
            <p className="text-xs text-slate-500">
              متوافق 100% مع شيت الإكسيل الخاص بك ومعالجة أكثر من 1000 طالب دون أي تضارب أو تكرار
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-xs space-y-2">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <span>📋 الأعمدة المعتمدة والمطابقة لشيت الإكسيل الخاص بك:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['الكود', 'اسم الطالب', 'المرحلة', 'الجنس', 'رقم الهاتف', 'رقم هاتف ولي الأمر', 'رقم هاتف ولي أمر آخر'].map((col) => (
              <span key={col} className="px-2.5 py-1 bg-white border border-slate-300 text-slate-800 rounded-md font-bold text-[11px] shadow-2xs">
                {col}
              </span>
            ))}
          </div>
          <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1 pt-1">
            <li><strong>عدم التضارب:</strong> عند وجود طالب بنفس <strong>الكود</strong> يتم تحديث بياناته مباشرة دون تكراره، مع الحفاظ الكامل على سجل سداداته والخصومات الممنوحة له.</li>
            <li><strong>المرحلة:</strong> يتم ضبطها تلقائياً على <strong>ثانية باكالوريا</strong> أو <strong>ثالثة ثانوي</strong> حسب العمود.</li>
            <li><strong>الجنس والهاتف الإضافي:</strong> يتم حفظهما بصورة منظمة في ملاحظات الطالب.</li>
            <li><strong>تخطي الكلمات التالفة:</strong> يتم تلقائياً تنقية عبارات مثل (لا يوجد) من أرقام الهواتف لضمان سلامة إرسال إيصالات الواتساب.</li>
          </ul>
        </div>

        <div className="border-2 border-dashed border-emerald-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-emerald-50/20">
          <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-700 font-bold mb-3">
            اضغط لاختيار ملف Excel (.xlsx أو .xls) الموضح أعلاه لرفعه ومزامنته فوراً
          </p>
          <label className="inline-block px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer shadow transition">
            <span>اختيار ملف Excel للطلاب</span>
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
