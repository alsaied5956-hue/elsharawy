import React from 'react';
import { 
  GraduationCap, 
  Calendar, 
  Wifi, 
  Receipt, 
  Users, 
  Settings, 
  ShieldCheck, 
  Smartphone,
  ChevronDown,
  LogOut,
  ShieldAlert,
  Crown,
  UserCheck
} from 'lucide-react';
import { MonthOption, SystemUser } from '../types';

interface Props {
  teacherName: string;
  activeTab: 'students' | 'treasury' | 'settings';
  setActiveTab: (tab: 'students' | 'treasury' | 'settings') => void;
  months: MonthOption[];
  currentMonthKey: string;
  setCurrentMonthKey: (key: string) => void;
  currentDeviceName: string;
  currentUser: SystemUser | null;
  onOpenStudyModal: () => void;
  onOpenResetModal: () => void;
  onLogout: () => void;
  isConnected: boolean;
}

export const Navbar: React.FC<Props> = ({
  teacherName,
  activeTab,
  setActiveTab,
  months,
  currentMonthKey,
  setCurrentMonthKey,
  currentDeviceName,
  currentUser,
  onOpenStudyModal,
  onOpenResetModal,
  onLogout,
  isConnected,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner Bar */}
      <div className="bg-slate-900 text-white text-[11px] py-1.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-300 font-bold">
            {isConnected ? 'قاعدة البيانات السحابية متصلة ومزامنة حية ثانية بثانية' : 'جاري الاتصال بالسيرفر السحابي...'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          {currentUser && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
              {isAdmin ? (
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="font-bold text-white text-[11px]">
                {currentUser.name}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                isAdmin ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isAdmin ? 'المالك الرئيسي' : 'مساعد تحصيل'}
              </span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">
              {currentDeviceName || 'الهاتف'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white flex items-center justify-center shadow-sm font-bold">
              <GraduationCap className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                {teacherName}
              </h1>
              <p className="text-[11px] font-semibold text-emerald-700">
                منظومة إدارة الطلاب والمصروفات الشهرية والمتبقي
              </p>
            </div>
          </div>

          {/* Feasibility Study Button (Mobile) */}
          <button
            onClick={onOpenStudyModal}
            className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>دراسة 100%</span>
          </button>
        </div>

        {/* Controls: Month Selector & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-center md:justify-end">
          
          {/* Month Selector Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <select
                value={currentMonthKey}
                onChange={(e) => setCurrentMonthKey(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {months.map((m) => (
                  <option key={m.key} value={m.key}>
                    شهر: {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'students'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>الطلاب والتحصيل</span>
            </button>

            <button
              onClick={() => setActiveTab('treasury')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'treasury'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>سجل الخزينة</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'settings'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>الإعدادات والحسابات</span>
            </button>
          </div>

          {/* Reset Accounts Button (Red) - Visible ONLY for Admin */}
          {isAdmin && (
            <button
              onClick={onOpenResetModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition shadow-xs"
              title="تقفيل الحسابات وتصفير الطلاب لسنة جديدة (صلاحية المالك فقط)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">تقفيل الحسابات</span>
            </button>
          )}

          {/* Desktop Study Button */}
          <button
            onClick={onOpenStudyModal}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span>دراسة الاعتمادية 100%</span>
          </button>

          {/* Logout / Switch Profile Button */}
          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
            title="تسجيل الخروج أو تبديل الحساب"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden sm:inline">تبديل الحساب</span>
          </button>

        </div>

      </div>
    </header>
  );
};
