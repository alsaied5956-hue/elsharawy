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
  ShieldAlert,
  UserPlus,
  Users,
  UserCheck,
  Crown,
  ShieldCheck,
  Phone,
  Power,
  Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, SystemUser, UserRole } from '../types';
import { SAMPLE_STUDENTS } from '../utils/sampleData';
import { GRADES_LIST, parseStudentsFromExcel, formatDateTime } from '../utils/helpers';

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
  currentUser: SystemUser | null;
  users: SystemUser[];
  onAddUser: (user: Omit<SystemUser, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateUser: (userId: string, data: Partial<SystemUser>) => Promise<void>;
  onResetUserPassword: (userId: string, newPass: string) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<void>;
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
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onResetUserPassword,
  onDeleteUser,
}) => {
  const isAdmin = currentUser ? currentUser.role === 'admin' : true;

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

  // Password change state (for personal account)
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  // User Management State (for Admin)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('assistant');
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Reset assistant password modal state
  const [targetUserForPassword, setTargetUserForPassword] = useState<SystemUser | null>(null);
  const [adminAssignedPass, setAdminAssignedPass] = useState('');
  const [isResettingUserPass, setIsResettingUserPass] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingFee(true);
      onUpdateDeviceName(deviceName.trim() || 'الهاتف الرئيسي');
      if (isAdmin) {
        await onUpdateDefaultFee(Number(fee) || 250);
      }
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    // Check duplicate username
    const exists = users.some(u => u.username.toLowerCase() === newUserUsername.trim().toLowerCase());
    if (exists) {
      alert('اسم المستخدم هذا مسجل بالفعل لمساعد آخر، يرجى اختيار اسم مستخدم مختلف');
      return;
    }

    try {
      setIsSavingUser(true);
      await onAddUser({
        name: newUserName.trim(),
        username: newUserUsername.trim().toLowerCase(),
        password: newUserPassword.trim(),
        role: newUserRole,
        phone: newUserPhone.trim(),
        status: 'active',
        createdBy: currentUser?.name || 'المالك الرئيسي',
      });

      setUserActionMsg(`✅ تم بنجاح إضافة الحساب (${newUserName.trim()}) وتعيين كلمة المرور!`);
      setTimeout(() => setUserActionMsg(null), 5000);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserPhone('');
      setNewUserRole('assistant');
      setIsAddUserOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء إضافة الحساب');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleConfirmAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPassword || !adminAssignedPass.trim()) return;

    try {
      setIsResettingUserPass(true);
      await onResetUserPassword(targetUserForPassword.id, adminAssignedPass.trim());
      setUserActionMsg(`🔑 تم بنجاح تغيير كلمة المرور للحساب (${targetUserForPassword.name}) إلى: ${adminAssignedPass.trim()}`);
      setTimeout(() => setUserActionMsg(null), 6000);
      setTargetUserForPassword(null);
      setAdminAssignedPass('');
    } catch {
      alert('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsResettingUserPass(false);
    }
  };

  const handleToggleUserStatus = async (user: SystemUser) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const actionText = nextStatus === 'disabled' ? 'تجميد وتعطيل' : 'إعادة تفعيل';
    if (!window.confirm(`هل أنت متأكد من ${actionText} حساب (${user.name})؟`)) return;

    try {
      await onUpdateUser(user.id, { status: nextStatus });
      setUserActionMsg(`تم بنجاح ${actionText} حساب (${user.name})`);
      setTimeout(() => setUserActionMsg(null), 4000);
    } catch {
      alert('حدث خطأ أثناء تحديث حالة الحساب');
    }
  };

  const handleDeleteUserAccount = async (user: SystemUser) => {
    if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      alert('لا يمكن حذف حساب المالك الرئيسي الوحيد في المنظومة');
      return;
    }
    if (!window.confirm(`هل أنت متأكد تماماً من حذف حساب المساعد (${user.name}) نهائياً؟`)) return;

    try {
      await onDeleteUser(user.id);
      setUserActionMsg(`تم بنجاح حذف حساب (${user.name})`);
      setTimeout(() => setUserActionMsg(null), 4000);
    } catch {
      alert('حدث خطأ أثناء حذف الحساب');
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

      {/* Role Banner for Assistant */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs flex items-center gap-3 text-amber-900 shadow-xs">
          <UserCheck className="w-6 h-6 text-amber-700 flex-shrink-0" />
          <div>
            <span className="font-bold block text-sm">مرحباً بك: {currentUser?.name} (مساعد تحصيل)</span>
            <p className="mt-0.5 text-amber-800">
              صلاحيتك الحالية هي <strong>التحصيل فقط</strong> (تسجيل مقبوضات الطلاب، طباعة الإيصالات والكشوف). تعديل السعر العام للطلاب أو إدارة الحسابات وتصفير السيستم هي صلاحيات المالك الرئيسي.
            </p>
          </div>
        </div>
      )}

      {/* Global Success / Alert Message */}
      {userActionMsg && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between font-bold animate-in slide-in-from-top-2">
          <span>{userActionMsg}</span>
          <button onClick={() => setUserActionMsg(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* 1. ADMIN EXCLUSIVE: Staff & Assistants Profiles Management */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  إدارة بروفايلات المساعدين وصلاحيات فريق العمل (Staff Profiles)
                </h3>
                <p className="text-xs text-slate-500">
                  أنت المالك الرئيسي: يمكنك إضافة مساعدين، وتغيير كلمات المرور لهم، وحذفهم أو تجميدهم في أي وقت
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAddUserOpen(!isAddUserOpen)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAddUserOpen ? 'إلغاء' : 'إضافة مساعد جديد'}</span>
            </button>
          </div>

          {/* Add User Form Drawer */}
          {isAddUserOpen && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in">
              <h4 className="font-black text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                بيانات المساعد / الحساب الجديد:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الشخص أو المساعد *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="مثال: أحمد إبراهيم"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المستخدم للدخول (Username) *</label>
                  <input
                    type="text"
                    required
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="مثال: ahmed أو assistant1"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">كلمة المرور المحددة له *</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="كلمة مرور الدخول"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم تليفون المساعد (اختياري)</label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">الدور والصلاحية *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                      newUserRole === 'assistant' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'
                    }`}>
                      <input
                        type="radio"
                        name="userRole"
                        checked={newUserRole === 'assistant'}
                        onChange={() => setNewUserRole('assistant')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">مساعد تحصيل فقط (مجرد التحصيل)</span>
                        <span className="text-[10px] text-slate-500">يسجل سدادات، يطبع وصولات، يطبع كشوف PDF، وممنوع من حذف الطلاب أو تصفير السيستم.</span>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition ${
                      newUserRole === 'admin' ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-200'
                    }`}>
                      <input
                        type="radio"
                        name="userRole"
                        checked={newUserRole === 'admin'}
                        onChange={() => setNewUserRole('admin')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">أدمن مالك (كامل الصلاحيات)</span>
                        <span className="text-[10px] text-slate-500">صلاحيات كاملة للمنظومة وتعديل الأسعار وإدارة الحسابات.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSavingUser ? 'جاري الحفظ...' : 'حفظ وإنشاء الحساب'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Users List Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {users.map((u) => {
              const isOwner = u.role === 'admin';
              const isDisabled = u.status === 'disabled';

              return (
                <div 
                  key={u.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                    isDisabled 
                      ? 'bg-slate-100/70 border-slate-300 opacity-75' 
                      : isOwner 
                        ? 'bg-amber-50/30 border-amber-200 shadow-2xs' 
                        : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        isOwner ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isOwner ? <Crown className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isDisabled && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-semibold">
                              مجمّد
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          @{u.username} • {isOwner ? 'المالك الرئيسي' : 'مساعد تحصيل فقط'}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isDisabled 
                        ? 'bg-slate-200 text-slate-600' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isDisabled ? 'معطل' : 'نشط'}
                    </span>
                  </div>

                  {/* Actions for this user */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {/* Change Password Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setTargetUserForPassword(u);
                          setAdminAssignedPass('');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
                        title="تغيير كلمة المرور لهذا الحساب"
                      >
                        <KeyRound className="w-3 h-3 text-emerald-600" />
                        <span>تغيير الباسورد</span>
                      </button>

                      {/* Freeze/Activate Button (Not for owner) */}
                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2 py-1 rounded-lg font-bold text-[11px] transition ${
                            isDisabled 
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' 
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          }`}
                          title={isDisabled ? 'إعادة تفعيل' : 'تجميد الحساب'}
                        >
                          <Power className="w-3 h-3 inline ml-0.5" />
                          {isDisabled ? 'تفعيل' : 'تجميد'}
                        </button>
                      )}
                    </div>

                    {/* Delete User Button (Not for main admin) */}
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUserAccount(u)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="حذف الحساب نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Assigns New Password Modal */}
      {targetUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <span>تعيين كلمة مرور جديدة للحساب ({targetUserForPassword.name})</span>
              </div>
              <button 
                onClick={() => setTargetUserForPassword(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAdminResetPassword} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                بصفتك المالك الرئيسي، يمكنك مباشرة تعيين أي كلمة مرور جديدة للمساعد، وسيتمكن فوراً من تسجيل الدخول بها من أي هاتف.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الجديدة *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={adminAssignedPass}
                  onChange={(e) => setAdminAssignedPass(e.target.value)}
                  placeholder="اكتب كلمة المرور الجديدة للمساعد..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserForPassword(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isResettingUserPass || !adminAssignedPass.trim()}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isResettingUserPass ? 'جاري الحفظ...' : 'تأكيد وحفظ الباسورد'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Device Identity & Fee Configuration */}
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
                المصروفات الشهرية لجميع الطلاب (ج.م) {isAdmin ? '*' : '(خاص بالمالك فقط)'}
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                required
                min="0"
                step="10"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 text-emerald-900 disabled:bg-slate-100 disabled:text-slate-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {isAdmin 
                  ? '⚡ عند حفظ السعر، يتم فوراً تحديث المطلوب لجميع الطلاب وإعادة حساب المتبقي ومزامنته لحظياً على جميع أجهزة المساعدين.' 
                  : '🔒 تعديل السعر العام للطلاب مقتصر على المالك الرئيسي فقط.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-emerald-700 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4" />
                تم حفظ التغييرات بنجاح على هذا الجهاز!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={isSavingFee}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingFee ? 'جاري الحفظ والمزامنة...' : 'حفظ الإعدادات'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. System Password Security (Change Personal Password) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              تغيير كلمة المرور الخاصة بحسابك ({currentUser?.name || teacherName})
            </h3>
            <p className="text-xs text-slate-500">
              قم بتحديث كلمة المرور لتأمين حسابك والدخول إلى المنظومة
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
              <span>تم تحديث كلمة المرور بنجاح!</span>
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
                placeholder="أدخل الحالية"
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

      {/* 4. ADMIN ONLY: DANGER ZONE: End of Academic Year / Reset System */}
      {isAdmin && (
        <div className="bg-red-50/50 rounded-2xl border-2 border-red-200 p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-950 text-base">
                  تقفيل الحسابات وتصفير الطلاب لسنة جديدة (صلاحية المالك فقط)
                </h3>
                <p className="text-xs text-red-800/80 mt-0.5">
                  مخصص لتقفيل الدورة السابقة وحذف الطلاب للبدء من الصفر، محمي بكلمة مرور وتأكيد أمان.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-red-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-800 block mb-0.5">حماية مشددة للمالك:</span>
              لن يتم أي حذف إلا بعد إدخال كلمة المرور وتأكيدك، مع إمكانية تنزيل شيت Excel احتياطي.
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
      )}

      {/* 5. Speed Test & Demo Seeding (Admin Only) */}
      {isAdmin && (
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
      )}

      {/* 6. Excel Bulk Import */}
      {isAdmin && (
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
                معالجة أكثر من 1000 طالب دون أي تضارب أو تكرار بالاعتماد على كود الطالب
              </p>
            </div>
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
      )}

    </div>
  );
};
