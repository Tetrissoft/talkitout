// User roles
export type UserRole = 'admin' | 'therapist' | 'intern' | 'customer';

// Doctor types
export type DoctorType = 'therapist' | 'intern';

// Appointment status
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  telegramId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Doctor interface
export interface Doctor {
  id: string;
  userId: string;
  user: User;
  type: DoctorType;
  specialization?: string;
  licenseNumber?: string;
  assignedToId?: string; // For interns - ID of supervising doctor
  assignedTo?: Doctor; // Supervising doctor (only for interns)
  interns?: Doctor[]; // List of interns (only for therapists)
  availableSlots?: TimeSlot[];
  createdAt: string;
  updatedAt: string;
}

// Customer interface
export interface Customer {
  id: string;
  userId: string;
  user: User;
  assignedInternId?: string;
  assignedIntern?: Doctor;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Time slot interface
export interface TimeSlot {
  id: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
}

// Appointment interface
export interface Appointment {
  id: string;
  customerId: string;
  customer: Customer;
  doctorId: string;
  doctor: Doctor;
  scheduledBy: string; // User ID of who scheduled it
  scheduledByUser: User;
  date: string;
  timeSlotId: string;
  timeSlot: TimeSlot;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Form types
export interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  telegramId?: string;
}

export interface CreateDoctorForm {
  userId: string;
  type: DoctorType;
  specialization?: string;
  licenseNumber?: string;
  assignedToId?: string;
}

export interface CreateCustomerForm {
  userId: string;
  assignedInternId?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
}

export interface CreateAppointmentForm {
  customerId: string;
  doctorId: string;
  date: string;
  timeSlotId: string;
  notes?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Session Notes ───

export interface SessionNote {
  id: string;
  appointmentId: string;
  doctorId: string;
  customerId: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
  customer?: Customer;
  appointment?: Appointment;
}

export interface CreateSessionNoteForm {
  appointmentId: string;
  customerId: string;
  content: string;
  isPrivate?: boolean;
}

// ─── Daily Check-ins ───

export type CheckInQuestionCategory =
  | 'mood'
  | 'anxiety'
  | 'sleep'
  | 'energy'
  | 'social'
  | 'stress'
  | 'mindfulness'
  | 'general';

export type CheckInQuestionType = 'multiple_choice' | 'scale' | 'free_text';

export interface CheckInQuestion {
  id: string;
  text: string;
  type: CheckInQuestionType;
  category: CheckInQuestionCategory;
  tags: string[];
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DailyCheckIn {
  id: string;
  customerId: string;
  date: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  responses: CheckInResponse[];
  customer?: Customer;
}

export interface CheckInResponse {
  id: string;
  checkInId: string;
  questionId: string;
  question?: CheckInQuestion;
  answerText?: string;
  answerScale?: number;
  answerChoice?: string;
}

export interface CheckInAnswer {
  questionId: string;
  answerText?: string;
  answerScale?: number;
  answerChoice?: string;
}

export interface CheckInSummary {
  customerId: string;
  totalCheckIns: number;
  categoryTrends: Record<string, { date: string; average: number }[]>;
}
