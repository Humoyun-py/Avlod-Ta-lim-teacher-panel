import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  AlertCircle,
  Check,
  RefreshCw,
  Calendar,
  Users2,
  MapPin,
  ShieldCheck,
  Info,
  Coins,
  Award,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { teacherService } from '../services/teacherService';
import { Lesson, Student, AttendanceStatus, AttendanceRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { AwardCoinsModal } from '../components/modals/AwardCoinsModal';
import { StudentCoinHistoryModal } from '../components/modals/StudentCoinHistoryModal';

interface StudentAttendanceItem {
  status: AttendanceStatus | null;
  lateMinutes: number;
  notes: string;
}

export const Attendance: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, StudentAttendanceItem>>({});
  const [existingRecords, setExistingRecords] = useState<AttendanceRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [autoAwardCoins, setAutoAwardCoins] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Coin Reward Modals State
  const [coinModalStudent, setCoinModalStudent] = useState<Student | null>(null);
  const [historyModalStudent, setHistoryModalStudent] = useState<Student | null>(null);
  const [coinRewardAlert, setCoinRewardAlert] = useState<{
    studentName: string;
    amount: number;
    newBalance: number;
    reason: string;
  } | null>(null);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const allLessons = await teacherService.getSchedule();
      setLessons(allLessons);

      const qLessonId = searchParams.get('lessonId');
      if (qLessonId && allLessons.some((l) => l.id === qLessonId)) {
        setSelectedLessonId(qLessonId);
        loadLessonStudentsAndAttendance(qLessonId, allLessons);
      } else {
        // Initially no lesson selected, user chooses manually
        setSelectedLessonId('');
        setStudents([]);
        setAttendanceState({});
        setExistingRecords([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadLessonStudentsAndAttendance = async (lessonId: string, lessonList = lessons) => {
    const lesson = lessonList.find((l) => l.id === lessonId);
    if (!lesson) return;

    setIsLoading(true);
    try {
      const [groupStudents, existing] = await Promise.all([
        teacherService.getStudents(lesson.group_id),
        teacherService.getLessonAttendance(lessonId),
      ]);

      setStudents(groupStudents);
      setExistingRecords(existing);

      const initialMap: Record<string, StudentAttendanceItem> = {};

      // User requirement: Every student starts completely blank / unselected (status: null)
      // The teacher selects the status manually for each student.
      groupStudents.forEach((student) => {
        initialMap[student.id] = {
          status: null,
          lateMinutes: 5,
          notes: '',
        };
      });

      setAttendanceState(initialMap);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLessonChange = (newLessonId: string) => {
    setSelectedLessonId(newLessonId);
    setSuccessMessage(null);
    setErrorMessage(null);
    setCoinRewardAlert(null);
    if (newLessonId) {
      loadLessonStudentsAndAttendance(newLessonId);
    } else {
      setStudents([]);
      setAttendanceState({});
      setExistingRecords([]);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const current = prev[studentId]?.status;
      const nextStatus = current === status ? null : status;
      return {
        ...prev,
        [studentId]: {
          status: nextStatus,
          lateMinutes: prev[studentId]?.lateMinutes ?? 5,
          notes: prev[studentId]?.notes || '',
        },
      };
    });
  };

  const handleLateMinutesChange = (studentId: string, minutes: number) => {
    const validMinutes = isNaN(minutes) ? 1 : Math.max(1, Math.min(180, minutes));
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: 'late',
        lateMinutes: validMinutes,
      },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, StudentAttendanceItem> = {};
    students.forEach((s) => {
      updated[s.id] = {
        status,
        lateMinutes: attendanceState[s.id]?.lateMinutes ?? 5,
        notes: attendanceState[s.id]?.notes || '',
      };
    });
    setAttendanceState(updated);
  };

  const handleClearAll = () => {
    const updated: Record<string, StudentAttendanceItem> = {};
    students.forEach((s) => {
      updated[s.id] = {
        status: null,
        lateMinutes: 5,
        notes: attendanceState[s.id]?.notes || '',
      };
    });
    setAttendanceState(updated);
  };

  const handleRestoreExisting = () => {
    if (existingRecords.length === 0) return;
    const restoredMap: Record<string, StudentAttendanceItem> = {};
    students.forEach((s) => {
      const found = existingRecords.find((e) => e.student_id === s.id);
      if (found) {
        restoredMap[s.id] = {
          status: found.status,
          lateMinutes: found.late_minutes ?? 5,
          notes: found.notes || '',
        };
      } else {
        restoredMap[s.id] = { status: null, lateMinutes: 5, notes: '' };
      }
    });
    setAttendanceState(restoredMap);
    setSuccessMessage('Oldingi saqlangan davomat yozuvlari tiklandi.');
  };

  // Coin Reward Calculation Rule:
  // - Bor (present): 2 coins
  // - Kechikdi <= 5 daqiqa: 2 coins
  // - Kechikdi > 5 daqiqa: 1 coin
  // - Yo'q / Sababli: 0 coins
  const getStudentCoinPreview = (status: AttendanceStatus | null, lateMinutes: number = 5) => {
    if (status === 'present') {
      return {
        amount: 2,
        label: '+2 coin',
        subtext: 'Darsga o‘z vaqtida keldi',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (status === 'late') {
      if (lateMinutes <= 5) {
        return {
          amount: 2,
          label: '+2 coin',
          subtext: `${lateMinutes} daq kechikdi (≤5 daq)`,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      }
      return {
        amount: 1,
        label: '+1 coin',
        subtext: `${lateMinutes} daq kechikdi (>5 daq)`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    if (status === 'absent') {
      return {
        amount: 0,
        label: '0 coin',
        subtext: 'Darsda yo‘q',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      };
    }
    if (status === 'excused') {
      return {
        amount: 0,
        label: '0 coin',
        subtext: 'Sababli',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      };
    }
    return {
      amount: 0,
      label: '—',
      subtext: 'Tanlanmagan',
      badgeClass: 'bg-slate-50 text-slate-400 border-dashed border-slate-200',
    };
  };

  const handleCoinAwarded = (
    studentId: string,
    newBalance: number,
    amountAwarded: number,
    reason: string
  ) => {
    const updatedStudent = students.find((s) => s.id === studentId);
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, coins_balance: newBalance } : s))
    );

    setCoinRewardAlert({
      studentName: updatedStudent?.full_name || 'Talaba',
      amount: amountAwarded,
      newBalance,
      reason,
    });
  };

  const handleBalanceUpdatedInModal = (studentId: string, newBalance: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, coins_balance: newBalance } : s))
    );
  };

  const handleSubmitAttendance = async () => {
    if (!selectedLessonId) return;

    const unmarked = students.filter((s) => !attendanceState[s.id]?.status);
    if (unmarked.length > 0) {
      setErrorMessage(
        `Diqqat: ${unmarked.length} nafar talabaning davomati hali belgilanmagan. Iltimos, barcha talabalar holatini belgilang yoki "Barchani Bor qilish" tugmasidan foydalaning.`
      );
      return;
    }

    setShowConfirmModal(false);
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = students.map((s) => ({
      student_id: s.id,
      status: (attendanceState[s.id]?.status || 'present') as AttendanceStatus,
      late_minutes: attendanceState[s.id]?.lateMinutes ?? 5,
      notes: attendanceState[s.id]?.notes,
      auto_reward_coins: autoAwardCoins,
    }));

    try {
      const res = await teacherService.submitLessonAttendance(selectedLessonId, payload);
      setIsSubmitting(false);

      // Refresh student list to reflect new coin balances
      const updatedStudents = await teacherService.getStudents(currentLesson?.group_id);
      setStudents(updatedStudents);

      let msg = `Davomat muvaffaqiyatli saqlandi! (${res.count} nafar talaba bo‘yicha qayd etildi).`;
      if (autoAwardCoins && res.totalCoinsAwarded > 0) {
        msg += ` Qoidaga muvofiq: ${res.rewardsCount} nafar talabaga jami +${res.totalCoinsAwarded} ta coin taqsimlandi.`;
      }
      setSuccessMessage(msg);
      const updatedExisting = await teacherService.getLessonAttendance(selectedLessonId);
      setExistingRecords(updatedExisting);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Davomatni saqlashda xatolik yuz berdi.');
    }
  };

  const currentLesson = lessons.find((l) => l.id === selectedLessonId);

  // Summary counts and Coin distribution statistics
  const summaryCounts = {
    present: Object.values(attendanceState).filter((s) => s.status === 'present').length,
    absent: Object.values(attendanceState).filter((s) => s.status === 'absent').length,
    late: Object.values(attendanceState).filter((s) => s.status === 'late').length,
    excused: Object.values(attendanceState).filter((s) => s.status === 'excused').length,
    unmarked: students.filter((s) => !attendanceState[s.id]?.status).length,
  };

  const rewardSummary = {
    presentCount: students.filter((s) => attendanceState[s.id]?.status === 'present').length,
    presentCoins: students.filter((s) => attendanceState[s.id]?.status === 'present').length * 2,
    lateUnder5Count: students.filter(
      (s) => attendanceState[s.id]?.status === 'late' && (attendanceState[s.id]?.lateMinutes ?? 5) <= 5
    ).length,
    lateUnder5Coins:
      students.filter(
        (s) => attendanceState[s.id]?.status === 'late' && (attendanceState[s.id]?.lateMinutes ?? 5) <= 5
      ).length * 2,
    lateOver5Count: students.filter(
      (s) => attendanceState[s.id]?.status === 'late' && (attendanceState[s.id]?.lateMinutes ?? 5) > 5
    ).length,
    lateOver5Coins:
      students.filter(
        (s) => attendanceState[s.id]?.status === 'late' && (attendanceState[s.id]?.lateMinutes ?? 5) > 5
      ).length * 1,
    absentCount: summaryCounts.absent,
    excusedCount: summaryCounts.excused,
    unmarkedCount: summaryCounts.unmarked,
  };

  const totalCalculatedCoins =
    rewardSummary.presentCoins + rewardSummary.lateUnder5Coins + rewardSummary.lateOver5Coins;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Coin Reward Modal */}
      <AwardCoinsModal
        student={coinModalStudent}
        lesson={currentLesson}
        isOpen={!!coinModalStudent}
        onClose={() => setCoinModalStudent(null)}
        onAwarded={handleCoinAwarded}
      />

      {/* Student Coin History & Shop Preview Modal */}
      <StudentCoinHistoryModal
        student={historyModalStudent}
        isOpen={!!historyModalStudent}
        onClose={() => setHistoryModalStudent(null)}
        onBalanceUpdated={handleBalanceUpdatedInModal}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Davomat nazorati va Rag‘batlantirish
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Guruh talabalari davomati, kechikish vaqti nazorati hamda qoidaga binoan tangalar (coin) taqsimlash
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-cyan-600" />
          <span>O‘qituvchi: {user?.full_name}</span>
        </div>
      </div>

      {/* Lesson Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-xl">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Darsni tanlang:
          </label>
          <select
            value={selectedLessonId}
            onChange={(e) => handleLessonChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white font-semibold focus:outline-hidden focus:ring-1 focus:ring-cyan-500 shadow-xs cursor-pointer"
          >
            <option value="">-- Darsni tanlang ({lessons.length} ta dars mavjud) --</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.date} · {lesson.start_time} - {lesson.end_time} · {lesson.group_name} ({lesson.course_name})
              </option>
            ))}
          </select>
        </div>

        {currentLesson && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-600" />
              <span className="font-mono">{currentLesson.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span className="font-mono">
                {currentLesson.start_time} - {currentLesson.end_time}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <span>{currentLesson.room}</span>
            </div>
          </div>
        )}
      </div>

      {/* Coin Reward Success Notification Banner */}
      {coinRewardAlert && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm">
                Talaba {coinRewardAlert.studentName} ga +{coinRewardAlert.amount} coin muvaffaqiyatli berildi!
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Sabab: {coinRewardAlert.reason} · Yangi balans:{' '}
                <strong className="font-mono">{coinRewardAlert.newBalance} coin</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCoinRewardAlert(null)}
            className="text-amber-700 hover:text-amber-950 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Yopish
          </button>
        </div>
      )}

      {/* Attendance Success / Error notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            Yopish
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold cursor-pointer"
          >
            Yopish
          </button>
        </div>
      )}

      {/* If no lesson is selected yet */}
      {!selectedLessonId ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Dars tanlanmagan</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            Talabalar davomatini olish va ularga coin berish uchun yuqoridagi <strong>&quot;Darsni tanlang&quot;</strong> menyusidan o‘zingizga biriktirilgan darsni tanlang.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 bg-cyan-50 px-3.5 py-1.5 rounded-lg border border-cyan-200">
            <span>Yuqoridagi ro‘yxatdan guruh va darsni tanlang</span>
          </div>
        </div>
      ) : (
        <>
          {/* Official Coin Rules Notice Banner */}
          <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">
                    Avlod Ta’lim — Davomat bo‘yicha tangalar qoidasi:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-bold text-[10px]">
                    Avtomatlashtirilgan
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 mt-1 text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <strong>Bor (Darsga keldi):</strong> +2 coin
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <strong>5 daqiqagacha kechikdi:</strong> +2 coin
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <strong>5 daqiqadan ko‘p kechikdi:</strong> +1 coin
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <strong>Yo‘q / Sababli:</strong> 0 coin
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 bg-white px-3.5 py-2 rounded-lg border border-amber-300 shadow-xs">
              <Coins className="w-4 h-4 text-amber-600" />
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Jami hisoblangan:</div>
                <div className="text-xs font-extrabold text-amber-900 font-mono">
                  {totalCalculatedCoins} coin ({rewardSummary.presentCount + rewardSummary.lateUnder5Count + rewardSummary.lateOver5Count} talaba)
                </div>
              </div>
            </div>
          </div>

          {/* Live Attendance Summary Counter */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Qatnashdi (Bor)</span>
                <span className="text-xl font-mono font-bold text-emerald-600">
                  {summaryCounts.present}
                </span>
                <span className="text-[10px] text-emerald-700 block font-semibold">+2 coin dan</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Kechikdi</span>
                <span className="text-xl font-mono font-bold text-amber-600">{summaryCounts.late}</span>
                <span className="text-[10px] text-amber-700 block font-semibold">
                  ≤5m (+2) | &gt;5m (+1)
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Qatnashmadi</span>
                <span className="text-xl font-mono font-bold text-rose-600">{summaryCounts.absent}</span>
                <span className="text-[10px] text-slate-400 block font-medium">0 coin</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Sababli</span>
                <span className="text-xl font-mono font-bold text-sky-600">{summaryCounts.excused}</span>
                <span className="text-[10px] text-slate-400 block font-medium">0 coin</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Tanlanmagan</span>
                <span className={`text-xl font-mono font-bold ${summaryCounts.unmarked > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {summaryCounts.unmarked}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {summaryCounts.unmarked === 0 ? 'Hammasi tanlandi' : 'Tanlash kutilmoqda'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Student Attendance & Reward Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users2 className="w-4 h-4 text-cyan-600" />
                <h2 className="font-bold text-slate-900 text-sm">
                  Guruh talabalari ({students.length} nafar)
                </h2>
                {summaryCounts.unmarked > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {summaryCounts.unmarked} ta tanlanmagan
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                {existingRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreExisting}
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-700 hover:text-cyan-900 font-semibold underline cursor-pointer"
                  >
                    Oldingi davomatni tiklash
                  </button>
                )}
                <div className="flex items-center gap-1.5 font-medium text-slate-600">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Coin balansi jonli bog‘langan</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">№</th>
                    <th className="py-3 px-3">Talaba F.I.Sh</th>
                    <th className="py-3 px-3 font-mono">Talaba ID</th>
                    <th className="py-3 px-3 text-center">Joriy Balans</th>
                    <th className="py-3 px-3 text-center">Davomat holati</th>
                    <th className="py-3 px-3 text-center">Qoidaga muvofiq Coin</th>
                    <th className="py-3 px-3">Izoh / Sabab</th>
                    <th className="py-3 px-3 text-right">Qo‘shimcha Coin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => {
                    const studentItem = attendanceState[student.id];
                    const currentStatus = studentItem?.status;
                    const lateMinutes = studentItem?.lateMinutes ?? 5;
                    const currentNotes = studentItem?.notes || '';
                    const coinPreview = getStudentCoinPreview(currentStatus, lateMinutes);

                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${
                          !currentStatus
                            ? 'bg-white hover:bg-slate-50/50'
                            : currentStatus === 'present'
                            ? 'bg-emerald-50/15 hover:bg-emerald-50/30'
                            : currentStatus === 'late'
                            ? 'bg-amber-50/15 hover:bg-amber-50/30'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {student.full_name}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {student.student_code}
                        </td>

                        {/* Student Coin Balance Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setHistoryModalStudent(student)}
                            title="Tangalar tarixi va talaba do‘konini ko‘rish"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-mono font-bold transition-colors cursor-pointer group shadow-2xs"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span>{student.coins_balance || 0}</span>
                          </button>
                        </td>

                        {/* Status Segmented Buttons */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <div
                              className={`inline-flex items-center gap-1 p-1 rounded-lg border transition-all ${
                                currentStatus
                                  ? 'bg-slate-100 border-slate-300 shadow-xs'
                                  : 'bg-slate-50/80 border-slate-200 border-dashed'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'present')}
                                title="Bor (Darsga o‘z vaqtida keldi: +2 coin)"
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                }`}
                              >
                                Bor
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'absent')}
                                title="Yo‘q (Kelmadi: 0 coin)"
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                }`}
                              >
                                Yo‘q
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'late')}
                                title="Kechikdi (≤5 daqiqagacha: +2 coin, >5 daqiqa: +1 coin)"
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                  currentStatus === 'late'
                                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                }`}
                              >
                                Kechikdi
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'excused')}
                                title="Sababli (0 coin)"
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                  currentStatus === 'excused'
                                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                }`}
                              >
                                Sababli
                              </button>
                            </div>

                            {/* If Kechikdi is selected, show late minutes controller */}
                            {currentStatus === 'late' ? (
                              <div className="flex items-center gap-1.5 mt-1 bg-amber-50 p-1 rounded-md border border-amber-200 text-[11px]">
                                <span className="text-amber-800 font-semibold">Kechikish:</span>
                                <button
                                  type="button"
                                  onClick={() => handleLateMinutesChange(student.id, 5)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    lateMinutes <= 5
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
                                  }`}
                                  title="5 daqiqagacha: +2 coin beriladi"
                                >
                                  ≤5 daq (+2)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLateMinutesChange(student.id, 10)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    lateMinutes > 5
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
                                  }`}
                                  title="5 daqiqadan ko'p: +1 coin beriladi"
                                >
                                  &gt;5 daq (+1)
                                </button>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={lateMinutes}
                                    onChange={(e) =>
                                      handleLateMinutesChange(student.id, parseInt(e.target.value) || 1)
                                    }
                                    className="w-10 px-1 py-0.5 text-center bg-white border border-amber-300 rounded text-[11px] font-mono font-bold text-amber-950 focus:outline-hidden"
                                    title="Aniq daqiqani kiriting"
                                  />
                                  <span className="text-[10px] text-amber-700 ml-0.5">daq</span>
                                </div>
                              </div>
                            ) : !currentStatus ? (
                              <span className="text-[10px] text-slate-400 italic">Tanlanmagan</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Calculated Coin Preview */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${coinPreview.badgeClass}`}
                            >
                              {coinPreview.amount > 0 && (
                                <Coins className="w-3 h-3 text-amber-500 fill-amber-500" />
                              )}
                              <span>{coinPreview.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              {coinPreview.subtext}
                            </span>
                          </div>
                        </td>

                        {/* Notes input */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={currentNotes}
                            onChange={(e) => handleNotesChange(student.id, e.target.value)}
                            placeholder={
                              currentStatus === 'late'
                                ? `${lateMinutes} daqiqa kechikdi...`
                                : 'masalan: uy vazifasini topshirdi...'
                            }
                            className="w-full max-w-[170px] px-2 py-1 rounded border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                          />
                        </td>

                        {/* Manual / Extra Coin Reward Button */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setCoinModalStudent(student)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-900 font-bold text-xs transition-colors border border-amber-300 shadow-2xs cursor-pointer group"
                            title="Ushbu talabaga alohida sabab bilan qo‘shimcha tanga berish"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-600 group-hover:text-slate-950" />
                            <span>Coin berish</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Submission Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAwardCoins}
                    onChange={(e) => setAutoAwardCoins(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                  />
                  <span>Davomat qoidasiga ko‘ra tangalarni avtomatik berish (+2 coin / +1 coin)</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleMarkAll('present')}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Barchani &quot;Bor&quot; qilish
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Tozalash (Bo‘sh qilish)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const unmarked = students.filter((s) => !attendanceState[s.id]?.status);
                    if (unmarked.length > 0) {
                      setErrorMessage(
                        `Diqqat: ${unmarked.length} nafar talabaning davomati hali tanlanmagan. Iltimos, barcha talabalar holatini belgilang yoki "Barchani Bor qilish" tugmasidan foydalaning.`
                      );
                      return;
                    }
                    setShowConfirmModal(true);
                  }}
                  disabled={isSubmitting || students.length === 0}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saqlanmoqda...' : 'Davomatni tasdiqlash va saqlash'}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden p-6 text-xs text-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Davomat va Tangalarni tasdiqlaysizmi?</h3>
                <p className="text-xs text-slate-500 font-mono">{currentLesson?.group_name}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                <span>Jami talabalar:</span>
                <span className="font-mono">{students.length} nafar</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Darsga o‘z vaqtida kelganlar (Bor):</span>
                <span className="font-mono font-bold">
                  {rewardSummary.presentCount} nafar (+{rewardSummary.presentCoins} coin)
                </span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>5 daqiqagacha kechikkanlar (≤5 daq):</span>
                <span className="font-mono font-bold">
                  {rewardSummary.lateUnder5Count} nafar (+{rewardSummary.lateUnder5Coins} coin)
                </span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>5 daqiqadan ko‘p kechikkanlar (&gt;5 daq):</span>
                <span className="font-mono font-bold">
                  {rewardSummary.lateOver5Count} nafar (+{rewardSummary.lateOver5Coins} coin)
                </span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Darsda yo‘q / Sababli:</span>
                <span className="font-mono font-bold">
                  {rewardSummary.absentCount + rewardSummary.excusedCount} nafar (0 coin)
                </span>
              </div>

              {autoAwardCoins && (
                <div className="flex justify-between text-amber-950 font-bold bg-amber-100/70 p-2 rounded-md border border-amber-300 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    Jami taqsimlanadigan tangalar:
                  </span>
                  <span className="font-mono text-sm">+{totalCalculatedCoins} coin</span>
                </div>
              )}
            </div>

            <p className="text-slate-600 leading-relaxed text-[11px]">
              Ushbu davomat o‘qituvchi <strong className="text-slate-900">{user?.full_name}</strong> tomonidan tasdiqlanadi va talabalar hisobiga tangalar avtomatik yoziladi.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Qaytish
              </button>
              <button
                type="button"
                onClick={handleSubmitAttendance}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Tasdiqlash va saqlash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
