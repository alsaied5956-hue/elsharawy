import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Lock, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (password: string) => Promise<boolean>;
  onExportBackup: () => void;
  studentsCount: number;
}

export const ResetSystemModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmReset,
  onExportBackup,
  studentsCount,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = () => {
    onExportBackup();
    setHasDownloadedBackup(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPhrase.trim() !== 'تأكيد الحذف') {
      setError('يرجى كتابة عبارة "تأكيد الحذف" بشكل صحيح في الحقل المخصص');
      return;
    }
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور الخاصة بالنظام');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      const success = await onConfirmReset(password.trim());
      if (success) {
        onClose();
      } else {
        setError('كلمة المرور غير صحيحة! تم إيقاف عملية الحذف لحماية البيانات.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء عملية التصفير');
    } finally {
      setIsDeleting(false);
    }
  };

  const isFormReady = confirmPhrase.trim() === 'تأكيد الحذف' && password.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-red-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                تقفيل الحسابات والبدء من جديد
              </h3>
              <p className="text-xs text-red-100">
                حذف الطلاب السابقين وتصفير الحسابات لسنة أو دورة جديدة
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
        <form onSubmit={handleResetSubmit} className="p-6 space-y-5 text-slate-800 text-sm">
          
          {/* Warning Banner */}
          <div className="p-4 bg-red-50 border-r-4 border-red-500 rounded-xl space-y-1.5 text-xs text-red-800 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-red-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              تحذير أمان صارم:
            </div>
            <p>
              أنت على وشك <strong>حذف جميع الطلاب المقيدين حالياً ({studentsCount} طالب)</strong>، مع تصفير جميع كشوف المصروفات الشهرية والأقساط السابقة نهائياً من قاعدة البيانات السحابية لتبدأ تسجيلاً جديداً بالكامل.
            </p>
          </div>

          {/* Step 1: Backup Recommendation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                الخطوة الأولى: أخذ نسخة احتياطية إكسيل (موصى بها)
              </span>
              {hasDownloadedBackup && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم التنزيل
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              لتجنب ضياع أي سجلات، قم بتنزيل نسخة كاملة من بيانات الطلاب والمصروفات قبل المتابعة.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تنزيل نسخة احتياطية شاملة Excel الآن</span>
            </button>
          </div>

          {/* Step 2: System Password Entry */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-red-600" />
              الخطوة الثانية: أدخل كلمة مرور النظام (Password) للتحقق: *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="أدخل كلمة المرور..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Step 3: Confirmation phrase */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              الخطوة الثالثة: اكتب جملة <span className="text-red-600 font-mono font-black">"تأكيد الحذف"</span> في الحقل أدناه: *
            </label>
            <input
              type="text"
              required
              value={confirmPhrase}
              onChange={(e) => {
                setConfirmPhrase(e.target.value);
                if (error) setError(null);
              }}
              placeholder="اكتب هنا: تأكيد الحذف"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-center text-red-700 focus:bg-white focus:ring-2 focus:ring-red-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-900 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition text-xs sm:text-sm"
            >
              إلغاء وتراجع
            </button>
            <button
              type="submit"
              disabled={!isFormReady || isDeleting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'جاري تقفيل وتصفير الحسابات...' : 'تقفيل الحسابات والبدء من جديد'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
