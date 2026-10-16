import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  Plus,
  Clock,
  Calendar,
  Users2,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Award,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { teacherService } from '../services/teacherService';
import { Homework, HomeworkSubmission, Group } from '../types';

export const HomeworkPage: React.FC = () => {
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState<HomeworkSubmission | null>(null);
  const [reviewScore, setReviewScore] = useState<number>(90);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const [deadline, setDeadline] = useState('2026-10-22 23:59');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [hw, grps] = await Promise.all([
      teacherService.getHomework(),
      teacherService.getGroups(),
    ]);
    setHomeworkList(hw);
    setGroups(grps);
    if (grps.length > 0 && !groupId) {
      setGroupId(grps[0].id);
    }
  };

  const handleSelectHomework = async (hw: Homework) => {
    setSelectedHomework(hw);
    const subs = await teacherService.getSubmissions(hw.id);
    setSubmissions(subs);
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !description.trim() || !groupId) {
      setFormError('Barcha majburiy maydonlarni to‘ldiring.');
      return;
    }

    setIsSubmitting(true);
    try {
      await teacherService.createHomework({
        group_id: groupId,
        title: title.trim(),
        description: description.trim(),
        deadline: deadline.trim(),
      });
      setIsSubmitting(false);
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Vazifa yaratishda xatolik yuz berdi.');
    }
  };

  const handleOpenReview = (submission: HomeworkSubmission) => {
    setReviewingSubmission(submission);
    setReviewScore(submission.score || 90);
    setReviewFeedback(submission.feedback || '');
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSubmission) return;

    try {
      await teacherService.reviewSubmission(
        reviewingSubmission.id,
        Number(reviewScore),
        reviewFeedback.trim()
      );
      setReviewingSubmission(null);
      // Reload submissions and list
      if (selectedHomework) {
        const updatedSubs = await teacherService.getSubmissions(selectedHomework.id);
        setSubmissions(updatedSubs);
      }
      await loadData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Uy vazifalari va baholash
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Guruhlarga topshiriq berish, talabalar topshirgan yechimlarini tekshirish va baholash
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi vazifa berish</span>
        </button>
      </div>

      {/* Grid: Homework List (Left 2 cols) & Submissions panel (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Homework list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Topshiriqlar ro‘yxati ({homeworkList.length})
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {homeworkList.map((hw) => {
                const isSelected = selectedHomework?.id === hw.id;
                const pending = hw.submissions_count - hw.reviewed_count;

                return (
                  <div
                    key={hw.id}
                    onClick={() => handleSelectHomework(hw)}
                    className={`p-5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-cyan-50/50 border-l-4 border-cyan-500' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{hw.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                            {hw.group_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                          {hw.description}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-end gap-1 shrink-0 text-right">
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Muddat: {hw.deadline}</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-800">
                          {hw.submissions_count} / {hw.total_students} topshirildi
                        </div>
                        {pending > 0 && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            {pending} ta tekshirish kutilmoqda
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Homework Submissions Drawer */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Talabalar topshiriqlari
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {selectedHomework ? selectedHomework.title : 'Vazifani tanlang'}
              </p>
            </div>

            <div className="p-4 space-y-3">
              {!selectedHomework ? (
                <div className="text-center p-6 text-slate-400 text-xs">
                  Talabalar topshirgan ishlarni ko‘rish uchun chapdagi ro‘yxatdan vazifani bosing.
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs">
                  Hozircha hech bir talaba topshiriq yuklamagan.
                </div>
              ) : (
                submissions.map((sub) => {
                  const isReviewed = sub.status === 'reviewed';

                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{sub.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sub.student_code} · {sub.submitted_at}
                          </div>
                        </div>

                        {isReviewed ? (
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {sub.score} / 100 ball
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            Kutilmoqda
                          </span>
                        )}
                      </div>

                      {sub.comment && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100 italic">
                          &quot;{sub.comment}&quot;
                        </p>
                      )}

                      {sub.feedback && (
                        <div className="text-[11px] text-cyan-900 bg-cyan-50 p-2 rounded border border-cyan-100">
                          <span className="font-semibold">Ustoz fikri:</span> {sub.feedback}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">
                          Fayl: {sub.file_name || 'Kod yuklangan'}
                        </span>
                        <button
                          onClick={() => handleOpenReview(sub)}
                          className="px-2.5 py-1 rounded bg-slate-900 text-white font-semibold text-[11px] hover:bg-slate-800 transition-colors"
                        >
                          {isReviewed ? 'Bahoni o‘zgartirish' : 'Tekshirish & Baholash'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Homework Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-[#0F172A] text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Yangi Uy Vazifasi Qo‘shish</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateHomework} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Guruhni tanlang <span className="text-rose-500">*</span>
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.course_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Vazifa sarlavhasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="masalan: PostgreSQL: Triggers va Stored Procedures"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Tavsif va talablar <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vazifa shartlari, talab qilinadigan modellar, kutilgan natija..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Topshirish oxirgi muddati (Deadline) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="YYYY-MM-DD HH:MM"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saqlanmoqda...' : 'Vazifani e’lon qilish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-[#0F172A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Talaba ishini baholash</h3>
                <p className="text-xs text-cyan-400">{reviewingSubmission.student_name}</p>
              </div>
              <button
                onClick={() => setReviewingSubmission(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Ball (0 dan 100 gacha):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewScore}
                  onChange={(e) => setReviewScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  O‘qituvchi xulosasi & konstruktiv fikri:
                </label>
                <textarea
                  rows={3}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Yechim sifati, xatolar yoki tavsiyalar..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReviewingSubmission(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Bahoni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
