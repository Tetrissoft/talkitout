import { config } from '@/lib/config';
import type {
  User,
  Doctor,
  Customer,
  Appointment,
  CreateUserForm,
  CreateDoctorForm,
  CreateCustomerForm,
  CreateAppointmentForm,
  LoginCredentials,
  AuthUser,
  ApiResponse,
  PaginatedResponse,
  TimeSlot,
  SessionNote,
  CreateSessionNoteForm,
  CheckInQuestion,
  DailyCheckIn,
  CheckInAnswer,
  CheckInSummary,
  MiraConversation,
  CrisisAlert,
} from '@/types/admin';

const API_URL = config.apiUrl;

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'An error occurred',
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Authentication API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> => {
    return apiRequest<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  validateToken: async (token: string): Promise<ApiResponse<AuthUser>> => {
    return apiRequest<AuthUser>('/auth/validate', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  signup: async (data: CreateUserForm): Promise<ApiResponse<AuthUser>> => {
    return apiRequest<AuthUser>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSetupStatus: async (): Promise<ApiResponse<{ setupRequired: boolean }>> => {
    return apiRequest<{ setupRequired: boolean }>('/auth/setup-status', {
      method: 'GET',
    });
  },

  setupAdmin: async (data: { name: string; email: string; password: string; phone?: string }): Promise<ApiResponse<AuthUser>> => {
    return apiRequest<AuthUser>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<ApiResponse<PaginatedResponse<User>>> => {
    return apiRequest<PaginatedResponse<User>>('/users');
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    return apiRequest<User>(`/users/${id}`);
  },

  create: async (data: CreateUserForm): Promise<ApiResponse<User>> => {
    return apiRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    return apiRequest<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Doctors API
export const doctorsApi = {
  getAll: async (): Promise<ApiResponse<PaginatedResponse<Doctor>>> => {
    return apiRequest<PaginatedResponse<Doctor>>('/doctors');
  },

  getById: async (id: string): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>(`/doctors/${id}`);
  },

  getTherapists: async (): Promise<ApiResponse<Doctor[]>> => {
    return apiRequest<Doctor[]>('/doctors/therapists');
  },

  create: async (data: CreateDoctorForm): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>('/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Doctor>): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>(`/doctors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  assignIntern: async (internId: string, therapistId: string): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>('/doctors/assign-intern', {
      method: 'POST',
      body: JSON.stringify({ internId, therapistId }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/doctors/${id}`, {
      method: 'DELETE',
    });
  },
};

// Customers API
export const customersApi = {
  getAll: async (): Promise<ApiResponse<PaginatedResponse<Customer>>> => {
    return apiRequest<PaginatedResponse<Customer>>('/customers');
  },

  getById: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiRequest<Customer>(`/customers/${id}`);
  },

  create: async (data: CreateCustomerForm): Promise<ApiResponse<Customer>> => {
    return apiRequest<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    return apiRequest<Customer>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  assignToIntern: async (customerId: string, internId: string): Promise<ApiResponse<Customer>> => {
    return apiRequest<Customer>('/customers/assign-intern', {
      method: 'POST',
      body: JSON.stringify({ customerId, internId }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },

  generateTelegramLink: async (customerId: string): Promise<ApiResponse<{ link: string; token: string; expiresAt: string }>> => {
    return apiRequest<{ link: string; token: string; expiresAt: string }>(`/customers/${customerId}/telegram-link`, {
      method: 'POST',
    });
  },
};

// Appointments API
export const appointmentsApi = {
  getAll: async (): Promise<ApiResponse<PaginatedResponse<Appointment>>> => {
    return apiRequest<PaginatedResponse<Appointment>>('/appointments');
  },

  create: async (data: CreateAppointmentForm): Promise<ApiResponse<Appointment>> => {
    return apiRequest<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Appointment>): Promise<ApiResponse<Appointment>> => {
    return apiRequest<Appointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Time Slots API
export const timeSlotsApi = {
  getByDoctorId: async (doctorId: string): Promise<ApiResponse<TimeSlot[]>> => {
    return apiRequest<TimeSlot[]>(`/time-slots/doctor/${doctorId}`);
  },

  create: async (slot: Omit<TimeSlot, 'id'>): Promise<ApiResponse<TimeSlot>> => {
    return apiRequest<TimeSlot>('/time-slots', {
      method: 'POST',
      body: JSON.stringify(slot),
    });
  },

  bulkCreate: async (data: any): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/time-slots/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/time-slots/${id}`, {
      method: 'DELETE',
    });
  },
};

// Session Notes API
export const sessionNotesApi = {
  getAll: async (): Promise<ApiResponse<SessionNote[]>> => {
    return apiRequest<SessionNote[]>('/session-notes');
  },

  getByCustomer: async (customerId: string): Promise<ApiResponse<SessionNote[]>> => {
    return apiRequest<SessionNote[]>(`/session-notes/customer/${customerId}`);
  },

  getById: async (id: string): Promise<ApiResponse<SessionNote>> => {
    return apiRequest<SessionNote>(`/session-notes/${id}`);
  },

  create: async (data: CreateSessionNoteForm): Promise<ApiResponse<SessionNote>> => {
    return apiRequest<SessionNote>('/session-notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<CreateSessionNoteForm>): Promise<ApiResponse<SessionNote>> => {
    return apiRequest<SessionNote>(`/session-notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/session-notes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Check-ins API
export const checkinsApi = {
  // Question Library
  getQuestions: async (category?: string, tag?: string): Promise<ApiResponse<CheckInQuestion[]>> => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<CheckInQuestion[]>(`/checkins/questions${query}`);
  },

  getAllQuestions: async (): Promise<ApiResponse<CheckInQuestion[]>> => {
    return apiRequest<CheckInQuestion[]>('/checkins/questions/all');
  },

  createQuestion: async (data: Partial<CheckInQuestion>): Promise<ApiResponse<CheckInQuestion>> => {
    return apiRequest<CheckInQuestion>('/checkins/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuestion: async (id: string, data: Partial<CheckInQuestion>): Promise<ApiResponse<CheckInQuestion>> => {
    return apiRequest<CheckInQuestion>(`/checkins/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/checkins/questions/${id}`, {
      method: 'DELETE',
    });
  },

  // Daily Check-ins
  startCheckIn: async (): Promise<ApiResponse<DailyCheckIn>> => {
    return apiRequest<DailyCheckIn>('/checkins', {
      method: 'POST',
    });
  },

  submitResponses: async (checkInId: string, answers: CheckInAnswer[]): Promise<ApiResponse<DailyCheckIn>> => {
    return apiRequest<DailyCheckIn>(`/checkins/${checkInId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  getMyCheckIns: async (dateFrom?: string, dateTo?: string): Promise<ApiResponse<DailyCheckIn[]>> => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<DailyCheckIn[]>(`/checkins/my${query}`);
  },

  getCustomerCheckIns: async (customerId: string, dateFrom?: string, dateTo?: string): Promise<ApiResponse<DailyCheckIn[]>> => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<DailyCheckIn[]>(`/checkins/customer/${customerId}${query}`);
  },

  getCheckIn: async (id: string): Promise<ApiResponse<DailyCheckIn>> => {
    return apiRequest<DailyCheckIn>(`/checkins/${id}`);
  },

  // Fill check-in on behalf of patient
  startCheckInForPatient: async (customerId: string): Promise<ApiResponse<{ checkIn: DailyCheckIn; questions: CheckInQuestion[] }>> => {
    return apiRequest<{ checkIn: DailyCheckIn; questions: CheckInQuestion[] }>(`/checkins/customer/${customerId}/fill`, {
      method: 'POST',
    });
  },

  submitResponsesForPatient: async (customerId: string, checkInId: string, answers: CheckInAnswer[]): Promise<ApiResponse<DailyCheckIn>> => {
    return apiRequest<DailyCheckIn>(`/checkins/customer/${customerId}/${checkInId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  getCustomerSummary: async (customerId: string, dateFrom?: string, dateTo?: string): Promise<ApiResponse<CheckInSummary>> => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<CheckInSummary>(`/checkins/customer/${customerId}/summary${query}`);
  },
};

// Mira AI Companion API
export const miraApi = {
  getConversations: async (customerId: string): Promise<ApiResponse<MiraConversation[]>> => {
    return apiRequest<MiraConversation[]>(`/mira/conversations/${customerId}`);
  },

  getConversationSummary: async (conversationId: string): Promise<ApiResponse<MiraConversation>> => {
    return apiRequest<MiraConversation>(`/mira/conversations/${conversationId}/summary`);
  },

  getCrisisAlerts: async (customerId?: string): Promise<ApiResponse<CrisisAlert[]>> => {
    const query = customerId ? `?customerId=${customerId}` : '';
    return apiRequest<CrisisAlert[]>(`/mira/crisis-alerts${query}`);
  },

  resolveAlert: async (alertId: string): Promise<ApiResponse<CrisisAlert>> => {
    return apiRequest<CrisisAlert>(`/mira/crisis-alerts/${alertId}/resolve`, {
      method: 'PATCH',
    });
  },
};
