import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, Tag, PlusCircle, Check, Percent } from 'lucide-react';
import { Student } from '../types';
import { GRADES_LIST } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialStudent?: Student | null;
  suggestedCode?: string;
  defaultFee?: number;
  availableGrades?: string[];
  onAddNewGrade?: (gradeName: string) => Promise<void>;
  availableGroups?: string[];
}

export const StudentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialStudent,
  suggestedCode = '1001',
  defaultFee = 250,
  availableGrades = GRADES_LIST,
  onAddNewGrade,
  availableGroups = [],
}) => {
  const [formData, setFormData] = useState({
    studentCode: '',
    name: '',
    phone: '',
    parentPhone: '',
    parentRelation: 'الأب',
    grade: availableGrades[0] || 'ثانية باكالوريا',
    groupName: '',
    monthlyFee: defaultFee,
    hasDiscount: false,
    discountAmount: 0,
    discountReason: '',
    isFullExemption: false,
    status: 'active' as 'active' | 'inactive',
    joinedDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New custom grade input
  const [isAddingNewGrade, setIsAddingNewGrade] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');
  const [isSavingNewGrade, setIsSavingNewGrade] = useState(false);

  useEffect(() => {
    if (initialStudent) {
      const hasDisc = initialStudent.hasDiscount ?? ((initialStudent.discountAmount || 0) > 0 || initialStudent.isFullExemption);
      setFormData({
        studentCode: initialStudent.studentCode || suggestedCode,
        name: initialStudent.name || '',
        phone: initialStudent.phone || '',
        parentPhone: initialStudent.parentPhone || '',
        parentRelation: initialStudent.parentRelation || 'الأب',
        grade: initialStudent.grade || availableGrades[0] || 'ثانية باكالوريا',
        groupName: initialStudent.groupName || '',
        monthlyFee: initialStudent.monthlyFee ?? defaultFee,
        hasDiscount: !!hasDisc,
        discountAmount: initialStudent.discountAmount || 0,
        discountReason: initialStudent.discountReason || '',
        isFullExemption: !!initialStudent.isFullExemption,
        status: initialStudent.status || 'active',
        joinedDate: initialStudent.joinedDate || new Date().toISOString().slice(0, 10),
        notes: initialStudent.notes || '',
      });
    } else {
      setFormData({
        studentCode: suggestedCode,
        name: '',
        phone: '',
        parentPhone: '',
        parentRelation: 'الأب',
        grade: availableGrades[0] || 'ثانية باكالوريا',
        groupName: '',
        monthlyFee: defaultFee,
        hasDiscount: false,
        discountAmount: 0,
        discountReason: '',
        isFullExemption: false,
        status: 'active',
        joinedDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    }
    setError(null);
    setIsAddingNewGrade(false);
    setNewGradeName('');
  }, [initialStudent, suggestedCode, defaultFee, availableGrades, isOpen]);

  if (!isOpen) return null;

  // Toggle discount state
  const handleToggleDiscount = (enabled: boolean) => {
    if (enabled) {
      const disc = 50;
      const finalFee = Math.max(0, defaultFee - disc);
      setFormData((prev) => ({
        ...prev,
        hasDiscount: true,
        discountAmount: disc,
        monthlyFee: finalFee,
        isFullExemption: false,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        hasDiscount: false,
        discountAmount: 0,
        discountReason: '',
        isFullExemption: false,
        monthlyFee: defaultFee,
      }));
    }
  };

  // Set discount amount and recalculate fee
  const handleDiscountAmountChange = (amount: number) => {
    const validAmount = Math.max(0, amount);
    const finalFee = Math.max(0, defaultFee - validAmount);
    setFormData((prev) => ({
      ...prev,
      discountAmount: validAmount,
      monthlyFee: finalFee,
      isFullExemption: finalFee === 0,
    }));
  };

  // Toggle Full Exemption
  const handleToggleFullExemption = () => {
    const nextExemption = !formData.isFullExemption;
    if (nextExemption) {
      setFormData((prev) => ({
        ...prev,
        hasDiscount: true,
        isFullExemption: true,
        discountAmount: defaultFee,
        monthlyFee: 0,
        discountReason: prev.discountReason || 'إعفاء كامل (منحة مجانية)',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        isFullExemption: false,
        discountAmount: 50,
        monthlyFee: Math.max(0, defaultFee - 50),
      }));
    }
  };

  // Handle adding custom grade/stage
  const handleCreateGrade = async () => {
    if (!newGradeName.trim()) return;
    try {
      setIsSavingNewGrade(true);
      if (onAddNewGrade) {
        await onAddNewGrade(newGradeName.trim());
      }
      setFormData((prev) => ({ ...prev, grade: newGradeName.trim() }));
      setIsAddingNewGrade(false);
      setNewGradeName('');
    } catch (e) {
      setError('حدث خطأ أثناء إضافة المرحلة/المجموعة الجديدة');
    } finally {
      setIsSavingNewGrade(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('يرجى كتابة اسم الطالب ثلاثي أو رباعي');
      return;
    }
    if (!formData.parentPhone.trim()) {
      setError('يرجى إدخال رقم ولي الأمر للتواصل والمتابعة');
      return;
    }
    if (formData.monthlyFee < 0) {
      setError('قيمة المصروفات يجب ألا تكون بالسالب');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        ...formData,
        studentCode: formData.studentCode.trim() || suggestedCode,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        parentPhone: formData.parentPhone.trim(),
        notes: formData.notes.trim(),
        groupName: formData.groupName.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const discountPills = ['خصم أشقاء', 'تفوق دراسي', 'ظروف خاصة', 'حفظة القرآن', 'منحة مستر أحمد'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <UserPlus className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {initialStudent ? 'تعديل بيانات الطالب والمصروفات' : 'تسجيل طالب جديد في المنظومة'}
              </h3>
              <p className="text-xs text-emerald-100">
                منظومة مستر أحمد الشعراوي
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-800 text-sm overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-800 text-xs sm:text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Code & Monthly Fee row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كود الطالب الفريد (ID) *
              </label>
              <input
                type="text"
                required
                value={formData.studentCode}
                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 font-mono text-center font-bold text-emerald-800"
                placeholder="1001"
              />
            </div>

            {/* Monthly Fee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المصروفات الشهرية المقررة للطالب (ج.م) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="10"
                value={formData.monthlyFee}
                onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 text-center font-bold text-slate-900 ${
                  formData.hasDiscount ? 'border-amber-400 bg-amber-50/50 text-amber-900' : 'border-slate-300'
                }`}
              />
              {formData.hasDiscount && (
                <span className="text-[11px] font-bold text-amber-700 block mt-0.5 text-center">
                  🏷️ مطبق عليه خصم {formData.discountAmount} ج.م (السعر الأساسي: {defaultFee} ج.م)
                </span>
              )}
            </div>
          </div>

          {/* Dedicated Discount Box */}
          <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.hasDiscount}
                  onChange={(e) => handleToggleDiscount(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-600" />
                  تطبيق خصم خاص لهذا الطالب (منحة / أشقاء / تفوق)
                </span>
              </label>

              {formData.hasDiscount && (
                <button
                  type="button"
                  onClick={handleToggleFullExemption}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border ${
                    formData.isFullExemption
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {formData.isFullExemption ? '✓ إعفاء كامل (مجاناً)' : 'إعفاء كامل (100%)'}
                </button>
              )}
            </div>

            {formData.hasDiscount && (
              <div className="space-y-2.5 pt-1 border-t border-amber-200/80 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      قيمة الخصم بالجنيه (ج.م) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={defaultFee}
                      step="5"
                      value={formData.discountAmount}
                      onChange={(e) => handleDiscountAmountChange(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-amber-300 bg-white rounded-xl text-xs font-bold text-center text-amber-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      سبب الخصم (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.discountReason}
                      onChange={(e) => setFormData({ ...formData, discountReason: e.target.value })}
                      placeholder="مثال: خصم أشقاء، تفوق..."
                      className="w-full px-3 py-1.5 border border-amber-300 bg-white rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Quick reason pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-amber-800 font-semibold">أسباب سريعة:</span>
                  {discountPills.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setFormData({ ...formData, discountReason: reason })}
                      className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[11px] transition"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الطالب بالكامل (ثلاثي أو رباعي) *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
              placeholder="مثال: أحمد محمد علي السيد"
            />
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم هاتف الطالب (واتساب)
              </label>
              <input
                type="tel"
                dir="ltr"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right"
                placeholder="010XXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم هاتف ولي الأمر (ضروري للإيصالات) *
              </label>
              <input
                type="tel"
                dir="ltr"
                required
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right font-medium text-emerald-900"
                placeholder="011XXXXXXXX"
              />
            </div>
          </div>

          {/* Academic Info & Groups */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Grade / Stage */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  الصف الدراسي / المرحلة *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewGrade(!isAddingNewGrade)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ إضافة صف جديد</span>
                </button>
              </div>

              {!isAddingNewGrade ? (
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium"
                >
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-1.5 animate-in fade-in">
                  <input
                    type="text"
                    value={newGradeName}
                    onChange={(e) => setNewGradeName(e.target.value)}
                    placeholder="اكتب اسم الصف الجديد..."
                    className="flex-1 px-3 py-2 border border-emerald-400 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateGrade}
                    disabled={isSavingNewGrade || !newGradeName.trim()}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewGrade(false)}
                    className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded-xl text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Group Name (Schedule) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المجموعة / الميعاد (حر الإضافة)
              </label>
              <input
                type="text"
                list="group-suggestions"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                placeholder="اكتب أو اختر أي مجموعة..."
              />
              <datalist id="group-suggestions">
                {availableGroups.map((grp) => (
                  <option key={grp} value={grp} />
                ))}
              </datalist>
              <p className="text-[11px] text-slate-400 mt-0.5">
                يمكنك كتابة أي مجموعة جديدة بحرية تامة وستُحفظ فوراً
              </p>
            </div>
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة القيد
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="active">نشط / مستمر</option>
                <option value="inactive">منقطع / مؤجل</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات خاصة للطالب
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="مثال: خصم تفوق، شقيق طالب آخر..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
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
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'جاري الحفظ والمزامنة...' : initialStudent ? 'تحديث البيانات' : 'حفظ وإضافة الطالب'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
