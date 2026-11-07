import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  GraduationCap, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  UserCheck, 
  Users, 
  Crown, 
  UserCircle 
} from 'lucide-react';
import { SystemUser } from '../types';

interface Props {
  onLogin: (usernameOrPassword: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  teacherName: string;
  users: SystemUser[];
}

export const LoginScreen: React.FC<Props> = ({ onLogin, teacherName, users }) => {
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active users only for display
  const activeUsers = users.filter((u) => u.status !== 'disabled');

  const handleSelectUser = (u: SystemUser) => {
    setSelectedUser(u);
    setUsername(u.username);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const inputUsername = selectedUser ? selectedUser.username : username.trim();
      const res = await onLogin(inputUsername, password.trim());
      
      if (!res.success) {
        setError(res.message || 'بيانات الدخول أو كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
      }
    } catch {
      setError('حدث خطأ أثناء التحقق من بيانات الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-3 sm:p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 sm:p-7 text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <GraduationCap className="w-8 h-8 text-emerald-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            منظومة {teacherName}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            إدارة الطلاب والمصروفات الشهرية وسجل الخزينة المشترك
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-[11px] text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>نظام حسابات متعدد وصلاحيات: المالك الرئيسي ومساعدي التحصيل</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-7 space-y-5">

          {/* User Selection Profile Cards */}
          {activeUsers.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                اختر الحساب أو المساعد لتسجيل الدخول:
              </label>

              <div className="grid grid-cols-2 gap-2">
                {activeUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const isOwner = u.role === 'admin';

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isOwner ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isOwner ? <Crown className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 text-xs truncate">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate">
                          {isOwner ? 'المالك الرئيسي (أدمن)' : 'مساعد تحصيل'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            
            {/* If no user is selected or manual login */}
            {!selectedUser && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المستخدم أو كود الدخول:
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="مثال: admin أو اسم المساعد..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Selected User Badge */}
            {selectedUser && (
              <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      تسجيل الدخول باسم: {selectedUser.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      الصلاحية: {selectedUser.role === 'admin' ? 'المالك الرئيسي (كامل الصلاحيات)' : 'مساعد تحصيل فقط'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  تغيير
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  كلمة المرور الخاصة بالحساب:
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

          {/* Hint / Helper */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              كلمة مرور المالك الرئيسي الافتراضية: <strong className="font-mono text-emerald-700">123456</strong>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              يمكن للمالك إضافة مساعدين جدد وتعيين كلمات المرور لهم من شاشة الإعدادات
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
