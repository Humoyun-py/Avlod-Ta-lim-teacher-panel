import {
  User,
  Group,
  Student,
  Lesson,
  AttendanceRecord,
  Homework,
  HomeworkSubmission,
  Notification,
  Announcement,
  TeacherSalaryRecord,
  DashboardStats,
  AttendanceStatus,
  CoinTransaction,
  ShopItem,
} from '../types';
import {
  INITIAL_TEACHER,
  INITIAL_GROUPS,
  INITIAL_STUDENTS,
  INITIAL_LESSONS,
  INITIAL_ATTENDANCE,
  INITIAL_HOMEWORK,
  INITIAL_SUBMISSIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_SALARY_RECORDS,
  INITIAL_COIN_TRANSACTIONS,
  INITIAL_SHOP_ITEMS,
} from './mockData';

export const MAX_COIN_REWARD_LIMIT = 50;

// Frontend state store with localStorage persistence for a complete frontend-only experience
class FrontendDataStore {
  private teacher: User = { ...INITIAL_TEACHER };
  private groups: Group[] = [...INITIAL_GROUPS];
  private students: Student[] = [...INITIAL_STUDENTS];
  private lessons: Lesson[] = [...INITIAL_LESSONS];
  private attendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
  private homework: Homework[] = [...INITIAL_HOMEWORK];
  private submissions: HomeworkSubmission[] = [...INITIAL_SUBMISSIONS];
  private notifications: Notification[] = [...INITIAL_NOTIFICATIONS];
  private announcements: Announcement[] = [...INITIAL_ANNOUNCEMENTS];
  private salary: TeacherSalaryRecord[] = [...INITIAL_SALARY_RECORDS];
  private coinTransactions: CoinTransaction[] = [...INITIAL_COIN_TRANSACTIONS];
  private shopItems: ShopItem[] = [...INITIAL_SHOP_ITEMS];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem('avlod_frontend_store_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.teacher) this.teacher = parsed.teacher;
        if (parsed.groups) this.groups = parsed.groups;
        if (parsed.students) this.students = parsed.students;
        if (parsed.lessons) this.lessons = parsed.lessons;
        if (parsed.attendance) this.attendance = parsed.attendance;
        if (parsed.homework) this.homework = parsed.homework;
        if (parsed.submissions) this.submissions = parsed.submissions;
        if (parsed.notifications) this.notifications = parsed.notifications;
        if (parsed.coinTransactions) this.coinTransactions = parsed.coinTransactions;
        if (parsed.shopItems) this.shopItems = parsed.shopItems;
      }
    } catch {
      // Fallback to initial seeds
    }
  }

  public save() {
    try {
      localStorage.setItem(
        'avlod_frontend_store_v3',
        JSON.stringify({
          teacher: this.teacher,
          groups: this.groups,
          students: this.students,
          lessons: this.lessons,
          attendance: this.attendance,
          homework: this.homework,
          submissions: this.submissions,
          notifications: this.notifications,
          coinTransactions: this.coinTransactions,
          shopItems: this.shopItems,
        })
      );
    } catch {
      // ignore
    }
  }

  public resetToDefault() {
    this.teacher = { ...INITIAL_TEACHER };
    this.groups = [...INITIAL_GROUPS];
    this.students = [...INITIAL_STUDENTS];
    this.lessons = [...INITIAL_LESSONS];
    this.attendance = [...INITIAL_ATTENDANCE];
    this.homework = [...INITIAL_HOMEWORK];
    this.submissions = [...INITIAL_SUBMISSIONS];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.announcements = [...INITIAL_ANNOUNCEMENTS];
    this.salary = [...INITIAL_SALARY_RECORDS];
    this.coinTransactions = [...INITIAL_COIN_TRANSACTIONS];
    this.shopItems = [...INITIAL_SHOP_ITEMS];
    localStorage.removeItem('avlod_frontend_store');
  }

  public getTeacher() { return this.teacher; }
  public getGroups() { return this.groups; }
  public getStudents() { return this.students; }
  public getLessons() { return this.lessons; }
  public getAttendance() { return this.attendance; }
  public getHomework() { return this.homework; }
  public getSubmissions() { return this.submissions; }
  public getNotifications() { return this.notifications; }
  public getAnnouncements() { return this.announcements; }
  public getSalary() { return this.salary; }
  public getCoinTransactions() { return this.coinTransactions; }
  public getShopItems() { return this.shopItems; }

  public updateTeacher(data: Partial<User>) {
    this.teacher = { ...this.teacher, ...data };
    this.save();
    return this.teacher;
  }

  public addAttendanceRecords(records: AttendanceRecord[]) {
    // Avoid duplicate entries for same student and lesson
    const existingKeys = new Set(records.map(r => `${r.lesson_id}_${r.student_id}`));
    this.attendance = this.attendance.filter(r => !existingKeys.has(`${r.lesson_id}_${r.student_id}`));
    this.attendance.push(...records);

    // Update lesson attendance status
    const lessonId = records[0]?.lesson_id;
    if (lessonId) {
      const l = this.lessons.find(item => item.id === lessonId);
      if (l) {
        l.attendance_submitted = true;
      }
    }
    this.recalculateStudentStats();
    this.save();
  }

  public completeLesson(lessonId: string, details: {
    topic: string;
    summary: string;
    covered_material: string;
    homework_assigned?: string;
    additional_notes?: string;
  }) {
    const lesson = this.lessons.find(l => l.id === lessonId);
    if (!lesson) throw new Error('Dars topilmadi');
    lesson.status = 'completed';
    lesson.topic = details.topic;
    lesson.summary = details.summary;
    lesson.covered_material = details.covered_material;
    lesson.homework_assigned = details.homework_assigned;
    lesson.additional_notes = details.additional_notes;
    lesson.completed_at = new Date().toISOString().replace('T', ' ').slice(0, 16);
    lesson.completed_by = this.teacher.full_name;
    this.save();
    return lesson;
  }

  public submitVideo(lessonId: string, videoUrl: string) {
    const lesson = this.lessons.find(l => l.id === lessonId);
    if (!lesson) throw new Error('Dars topilmadi');
    lesson.video_status = 'pending_review';
    lesson.video_url = videoUrl;
    lesson.video_submitted_at = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.save();
    return lesson;
  }

  public addHomework(data: Omit<Homework, 'id' | 'created_at' | 'submissions_count' | 'reviewed_count'>) {
    const group = this.groups.find(g => g.id === data.group_id);
    const newHw: Homework = {
      ...data,
      id: `hw-${Date.now()}`,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      group_name: group?.name || 'Group',
      course_name: group?.course_name || 'Course',
      total_students: group?.student_count || 14,
      submissions_count: 0,
      reviewed_count: 0,
    };
    this.homework.unshift(newHw);
    this.save();
    return newHw;
  }

  public reviewSubmission(submissionId: string, score: number, feedback: string) {
    const sub = this.submissions.find(s => s.id === submissionId);
    if (!sub) throw new Error('Topshiriq topilmadi');
    sub.status = 'reviewed';
    sub.score = score;
    sub.feedback = feedback;
    sub.reviewed_at = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const hw = this.homework.find(h => h.id === sub.homework_id);
    if (hw) {
      hw.reviewed_count = this.submissions.filter(
        s => s.homework_id === hw.id && s.status === 'reviewed'
      ).length;
    }

    this.save();
    return sub;
  }

  public markNotificationRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }

  public markAllNotificationsRead() {
    this.notifications.forEach(n => { n.read = true; });
    this.save();
  }

  // --- Student Coin Reward Methods ---
  public awardCoins(params: {
    student_id: string;
    amount: number;
    reason: string;
    comment?: string;
    lesson_id?: string;
  }): { success: boolean; new_balance: number; transaction: CoinTransaction } {
    const student = this.students.find(s => s.id === params.student_id);
    if (!student) {
      throw new Error('Talaba tizimda topilmadi.');
    }

    // Verify student belongs to assigned groups
    const assignedGroupIds = new Set(this.groups.map(g => g.id));
    if (!assignedGroupIds.has(student.group_id)) {
      throw new Error('Siz faqat o‘zingizga biriktirilgan guruh talabalariga coin bera olasiz.');
    }

    if (!params.amount || params.amount <= 0 || !Number.isInteger(params.amount)) {
      throw new Error('Coin miqdori 0 dan katta butun son bo‘lishi lozim.');
    }

    if (params.amount > MAX_COIN_REWARD_LIMIT) {
      throw new Error(`Bitta rag‘batlantirish uchun maksimal limit ${MAX_COIN_REWARD_LIMIT} coin.`);
    }

    if (!params.reason || !params.reason.trim()) {
      throw new Error('Rag‘batlantirish sababini ko‘rsatish majburiy.');
    }

    // Atomically increment student's coin balance
    student.coins_balance = (student.coins_balance || 0) + params.amount;

    // Create separate audit transaction record
    const newTx: CoinTransaction = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      student_id: student.id,
      student_name: student.full_name,
      student_code: student.student_code,
      teacher_id: this.teacher.id,
      teacher_name: this.teacher.full_name,
      group_id: student.group_id,
      group_name: student.group_name,
      lesson_id: params.lesson_id,
      amount: params.amount,
      transaction_type: 'reward',
      reason: params.reason.trim(),
      comment: params.comment?.trim() || undefined,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    this.coinTransactions.unshift(newTx);
    this.save();

    return {
      success: true,
      new_balance: student.coins_balance,
      transaction: newTx,
    };
  }

  // Coin spending in Student Panel / Shop
  public spendCoins(student_id: string, item_id: string): {
    success: boolean;
    new_balance: number;
    transaction: CoinTransaction;
  } {
    const student = this.students.find(s => s.id === student_id);
    if (!student) throw new Error('Talaba topilmadi.');

    const item = this.shopItems.find(i => i.id === item_id);
    if (!item) throw new Error('Do‘kon mahsuloti topilmadi.');

    if (item.stock <= 0) throw new Error('Mahsulot qolmagan.');

    if (student.coins_balance < item.cost_coins) {
      throw new Error(`Yetarli coin mavjud emas. Balans: ${student.coins_balance}, Kerak: ${item.cost_coins}`);
    }

    // Deduct coins & reduce stock
    student.coins_balance -= item.cost_coins;
    item.stock -= 1;

    const newTx: CoinTransaction = {
      id: `ctx-spent-${Date.now()}`,
      student_id: student.id,
      student_name: student.full_name,
      student_code: student.student_code,
      teacher_id: 'shop-system',
      teacher_name: 'Avlod Ta’lim Do‘koni',
      group_id: student.group_id,
      group_name: student.group_name,
      amount: -item.cost_coins,
      transaction_type: 'spent',
      reason: `Xarid qilindi: ${item.title}`,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    this.coinTransactions.unshift(newTx);
    this.save();

    return {
      success: true,
      new_balance: student.coins_balance,
      transaction: newTx,
    };
  }

  private recalculateStudentStats() {
    this.students.forEach(student => {
      const records = this.attendance.filter(r => r.student_id === student.id);
      if (records.length > 0) {
        student.total_lessons = records.length;
        student.attended_lessons = records.filter(r => r.status === 'present').length;
        student.missed_lessons = records.filter(r => r.status === 'absent').length;
        student.late_lessons = records.filter(r => r.status === 'late').length;
        student.attendance_rate = Math.round(
          ((student.attended_lessons + student.late_lessons * 0.8) / student.total_lessons) * 1000
        ) / 10;
      }
    });
  }
}

export const localStore = new FrontendDataStore();

// Complete Frontend Service Layer
export const teacherService = {
  // 1. Dashboard Stats (dynamically calculated)
  async getDashboardStats(): Promise<DashboardStats> {
    const groups = localStore.getGroups();
    const students = localStore.getStudents();
    const lessons = localStore.getLessons();
    const homework = localStore.getHomework();
    const todayStr = '2026-10-16';

    const lessonsToday = lessons.filter(l => l.date === todayStr).length;
    const lessonsThisMonth = lessons.filter(l => l.date.startsWith('2026-10')).length;

    const totalStudentRate = students.reduce((acc, s) => acc + s.attendance_rate, 0);
    const avgAttendance = students.length > 0 ? Math.round((totalStudentRate / students.length) * 10) / 10 : 0;
    const pendingHomework = homework.reduce((acc, h) => acc + (h.submissions_count - h.reviewed_count), 0);

    return {
      my_groups_count: groups.length,
      my_students_count: students.length,
      lessons_today_count: lessonsToday,
      lessons_this_month: lessonsThisMonth,
      attendance_rate: avgAttendance,
      pending_homework_count: pendingHomework,
    };
  },

  // 2. Groups
  async getGroups(): Promise<Group[]> {
    return [...localStore.getGroups()];
  },

  async getGroupById(id: string): Promise<Group | undefined> {
    return localStore.getGroups().find(g => g.id === id);
  },

  // 3. Students
  async getStudents(groupId?: string): Promise<Student[]> {
    const all = localStore.getStudents();
    return groupId ? all.filter(s => s.group_id === groupId) : all;
  },

  async getStudentById(id: string): Promise<Student | undefined> {
    return localStore.getStudents().find(s => s.id === id);
  },

  // 4. Schedule & Lessons
  async getSchedule(dateFilter?: string): Promise<Lesson[]> {
    const lessons = localStore.getLessons();
    if (dateFilter) {
      return lessons.filter(l => l.date === dateFilter);
    }
    return lessons;
  },

  async getLessonById(id: string): Promise<Lesson | undefined> {
    return localStore.getLessons().find(l => l.id === id);
  },

  // 5. Attendance Management
  async getAttendance(): Promise<AttendanceRecord[]> {
    return localStore.getAttendance();
  },

  async getLessonAttendance(lessonId: string): Promise<AttendanceRecord[]> {
    return localStore.getAttendance().filter(a => a.lesson_id === lessonId);
  },

  async submitLessonAttendance(
    lessonId: string,
    records: {
      student_id: string;
      status: AttendanceStatus;
      late_minutes?: number;
      notes?: string;
      auto_reward_coins?: boolean;
    }[]
  ): Promise<{ success: boolean; count: number; totalCoinsAwarded: number; rewardsCount: number }> {
    const teacher = localStore.getTeacher();
    const students = localStore.getStudents();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    let totalCoinsAwarded = 0;
    let rewardsCount = 0;

    const formattedRecords: AttendanceRecord[] = records.map(r => {
      const std = students.find(s => s.id === r.student_id);
      
      // Calculate coin reward according to rules:
      // - Bor (present): 2 coins
      // - Kechikdi <= 5 daqiqa: 2 coins
      // - Kechikdi > 5 daqiqa: 1 coin
      // - Yo'q / Sababli: 0 coins
      let coins = 0;
      let reason = '';

      if (r.status === 'present') {
        coins = 2;
        reason = 'Darsga o‘z vaqtida kelganligi uchun (Davomat: Bor)';
      } else if (r.status === 'late') {
        const mins = r.late_minutes ?? 5;
        if (mins <= 5) {
          coins = 2;
          reason = `Darsga kechikish (${mins} daqiqagacha kechikdi)`;
        } else {
          coins = 1;
          reason = `Darsga kechikish (${mins} daqiqadan ko‘p kechikdi)`;
        }
      }

      const shouldAward = r.auto_reward_coins !== false && coins > 0;
      if (shouldAward) {
        try {
          localStore.awardCoins({
            student_id: r.student_id,
            amount: coins,
            reason,
            comment: r.notes || (r.status === 'late' ? `${r.late_minutes ?? 5} daqiqa kechikkan` : undefined),
            lesson_id: lessonId,
          });
          totalCoinsAwarded += coins;
          rewardsCount += 1;
        } catch {
          // Ignore if already awarded or limit reached
        }
      }

      return {
        id: `att-${Date.now()}-${r.student_id}`,
        lesson_id: lessonId,
        student_id: r.student_id,
        student_name: std?.full_name || 'Student',
        student_code: std?.student_code || 'AVL-0000',
        status: r.status,
        late_minutes: r.status === 'late' ? (r.late_minutes ?? 5) : undefined,
        coins_awarded: shouldAward ? coins : 0,
        notes: r.notes,
        marked_by: teacher.full_name,
        marked_at: now,
      };
    });

    localStore.addAttendanceRecords(formattedRecords);
    return { success: true, count: formattedRecords.length, totalCoinsAwarded, rewardsCount };
  },

  // 6. Lesson Completion
  async completeLesson(
    lessonId: string,
    details: {
      topic: string;
      summary: string;
      covered_material: string;
      homework_assigned?: string;
      additional_notes?: string;
    }
  ): Promise<Lesson> {
    return localStore.completeLesson(lessonId, details);
  },

  // 7. Video Submission
  async submitLessonVideo(lessonId: string, videoUrl: string): Promise<Lesson> {
    return localStore.submitVideo(lessonId, videoUrl);
  },

  // 8. Homework Management
  async getHomework(groupId?: string): Promise<Homework[]> {
    const all = localStore.getHomework();
    return groupId ? all.filter(h => h.group_id === groupId) : all;
  },

  async createHomework(data: {
    group_id: string;
    title: string;
    description: string;
    deadline: string;
    attachments?: { name: string; url: string; size: string }[];
  }): Promise<Homework> {
    const group = localStore.getGroups().find(g => g.id === data.group_id);
    return localStore.addHomework({
      ...data,
      group_name: group?.name || 'Group',
      course_name: group?.course_name || 'Course',
      total_students: group?.student_count || 14,
      attachments: data.attachments || [],
    });
  },

  async getSubmissions(homeworkId: string): Promise<HomeworkSubmission[]> {
    return localStore.getSubmissions().filter(s => s.homework_id === homeworkId);
  },

  async reviewSubmission(
    submissionId: string,
    score: number,
    feedback: string
  ): Promise<HomeworkSubmission> {
    return localStore.reviewSubmission(submissionId, score, feedback);
  },

  // 9. Notifications
  async getNotifications(): Promise<Notification[]> {
    return localStore.getNotifications();
  },

  async markNotificationRead(id: string): Promise<void> {
    localStore.markNotificationRead(id);
  },

  async markAllNotificationsRead(): Promise<void> {
    localStore.markAllNotificationsRead();
  },

  // 10. Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return localStore.getAnnouncements();
  },

  // 11. Profile
  async getProfile(): Promise<User> {
    return localStore.getTeacher();
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return localStore.updateTeacher(data);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (currentPassword !== 'password123') {
      throw new Error('Joriy parol noto\'g\'ri kiritildi.');
    }
    if (newPassword.length < 8) {
      throw new Error('Yangi parol kamida 8 ta belgidan iborat bo\'lishi kerak.');
    }
    return { success: true, message: 'Parol muvaffaqiyatli yangilandi.' };
  },

  // 12. Salary (Permission-based)
  async getSalaryInfo(): Promise<TeacherSalaryRecord[]> {
    return localStore.getSalary();
  },

  // 13. Reports
  async getReports(params?: { groupId?: string; dateRange?: string }) {
    const lessons = localStore.getLessons();
    const students = localStore.getStudents();
    const groups = localStore.getGroups();

    const completedLessons = lessons.filter(l => l.status === 'completed');
    const plannedLessons = lessons.filter(l => l.status === 'planned');

    return {
      total_lessons: lessons.length,
      completed_lessons: completedLessons.length,
      planned_lessons: plannedLessons.length,
      attendance_rate: 94.2,
      groups_summary: groups.map(g => {
        const gStudents = students.filter(s => s.group_id === g.id);
        const avgAtt = gStudents.length
          ? Math.round((gStudents.reduce((a, b) => a + b.attendance_rate, 0) / gStudents.length) * 10) / 10
          : 0;
        return {
          group_id: g.id,
          group_name: g.name,
          course_name: g.course_name,
          student_count: g.student_count,
          avg_attendance: avgAtt,
          completed_lessons: lessons.filter(l => l.group_id === g.id && l.status === 'completed').length,
        };
      }),
    };
  },

  // 14. Student Coin Rewards & Shop API
  async awardCoins(
    studentId: string,
    amount: number,
    reason: string,
    comment?: string,
    lessonId?: string
  ): Promise<{ success: boolean; new_balance: number; transaction: CoinTransaction }> {
    return localStore.awardCoins({
      student_id: studentId,
      amount,
      reason,
      comment,
      lesson_id: lessonId,
    });
  },

  async getCoinTransactions(studentId?: string): Promise<CoinTransaction[]> {
    const list = localStore.getCoinTransactions();
    return studentId ? list.filter(t => t.student_id === studentId) : list;
  },

  async getShopItems(): Promise<ShopItem[]> {
    return localStore.getShopItems();
  },

  async purchaseShopItem(studentId: string, itemId: string): Promise<{
    success: boolean;
    new_balance: number;
    transaction: CoinTransaction;
  }> {
    return localStore.spendCoins(studentId, itemId);
  },
};
