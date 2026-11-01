import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { Student } from '../types';
import { GRADES_LIST } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialStudent?: Student | null;
  suggestedCode?: string;
  defaultFee?: number;
}

export const StudentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialStudent,
  suggestedCode = '1001',
  defaultFee = 250,
}) => {
  const [formData, setFormData] = useState({
    studentCode: '',
    name: '',
    phone: '',
    parentPhone: '',
    parentRelation: 'الأب',
    grade: GRADES_LIST[3], // الصف الأول الثانوي default
    groupName: '',
    monthlyFee: defaultFee,
    status: 'active' as 'active' | 'inactive',
    joinedDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudent) {
      setFormData({
        studentCode: initialStudent.studentCode || suggestedCode,
        name: initialStudent.name || '',
        phone: initialStudent.phone || '',
        parentPhone: initialStudent.parentPhone || '',
        parentRelation: initialStudent.parentRelation || 'الأب',
        grade: initialStudent.grade || GRADES_LIST[3],
        groupName: initialStudent.groupName || '',
        monthlyFee: initialStudent.monthlyFee ?? defaultFee,
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
        grade: GRADES_LIST[3],
        groupName: '',
        monthlyFee: defaultFee,
        status: 'active',
        joinedDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    }
    setError(null);
  }, [initialStudent, suggestedCode, defaultFee, isOpen]);

  if (!isOpen) return null;

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
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <UserPlus className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {initialStudent ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد في المنظومة'}
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-800 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-800 text-xs sm:text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

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
                المصروفات الشهرية المتفق عليها (ج.م) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="10"
                value={formData.monthlyFee}
                onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center font-bold text-slate-900"
              />
            </div>
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

          {/* Academic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الصف الدراسي *
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                {GRADES_LIST.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المجموعة / الميعاد
              </label>
              <input
                type="text"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="مثال: السبت والثلاثاء ٤:٠٠ م"
              />
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
