import React, { useState } from 'react';
import { Lock, KeyRound, GraduationCap, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface Props {
  onLogin: (password: string) => boolean | Promise<boolean>;
  teacherName: string;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, teacherName }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const success = await onLogin(password.trim());
      if (!success) {
        setError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
      }
    } catch {
      setError('حدث خطأ أثناء التحقق من كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-7 text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <GraduationCap className="w-9 h-9 text-emerald-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            منظومة {teacherName}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            إدارة شؤون الطلاب والمصروفات الشهرية
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-[11px] text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>نظام محمي بكلمة مرور للمساعدين والإدارة</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  كلمة المرور للدخول إلى السيستم:
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="أدخل كلمة المرور..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-base font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  ⚠️ {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول إلى المنظومة'}</span>
            </button>
          </form>

          {/* Hint / Helper for first time setup */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              كلمة المرور الافتراضية للتشغيل الأول هي: <strong className="font-mono text-emerald-700">123456</strong>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              يمكنك تغييرها في أي وقت من قائمة الإعدادات داخل البرنامج
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
