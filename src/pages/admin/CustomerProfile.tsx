import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersApi, appointmentsApi, sessionNotesApi, checkinsApi, miraApi } from '@/services/api';
import { config } from '@/lib/config';
import type {
  Customer,
  Appointment,
  SessionNote,
  DailyCheckIn,
  CheckInSummary,
  CheckInQuestion,
  CheckInAnswer,
  CreateSessionNoteForm,
  MiraConversation,
  CrisisAlert,
} from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  TrendingUp,
  User,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  AlertCircle,
  Save,
  Info,
  Bot,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  'no-show': 'bg-yellow-100 text-yellow-800',
};

const categoryColors: Record<string, string> = {
  mood: 'bg-yellow-500',
  anxiety: 'bg-red-500',
  sleep: 'bg-indigo-500',
  energy: 'bg-orange-500',
  social: 'bg-green-500',
  stress: 'bg-pink-500',
  mindfulness: 'bg-purple-500',
  general: 'bg-slate-500',
};

export default function CustomerProfile() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notesByAppointment, setNotesByAppointment] = useState<Record<string, SessionNote[]>>({});
  const [allNotes, setAllNotes] = useState<SessionNote[]>([]);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Note form state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteAppointmentId, setNoteAppointmentId] = useState('');
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteIsPrivate, setNoteIsPrivate] = useState(true);

  // Check-in expand state
  const [expandedCheckIn, setExpandedCheckIn] = useState<string | null>(null);

  // Info tab edit state
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    telegramId: '',
    telegramChatId: '',
    phone: '',
    address: '',
    emergencyContact: '',
    notes: '',
    checkinCategories: [] as string[],
  });

  const ALL_CATEGORIES = ['mood', 'anxiety', 'sleep', 'energy', 'social', 'stress', 'mindfulness', 'general'];

  // Fill check-in state
  const [fillCheckInOpen, setFillCheckInOpen] = useState(false);
  const [fillCheckInQuestions, setFillCheckInQuestions] = useState<CheckInQuestion[]>([]);
  const [fillCheckInId, setFillCheckInId] = useState<string | null>(null);
  const [fillAnswers, setFillAnswers] = useState<Record<string, CheckInAnswer>>({});
  const [fillLoading, setFillLoading] = useState(false);

  // Mira conversations state
  const [miraConversations, setMiraConversations] = useState<MiraConversation[]>([]);
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) loadData();
  }, [customerId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customerRes, appointmentsRes, notesRes, checkInsRes, summaryRes, miraRes, alertsRes] = await Promise.all([
        customersApi.getById(customerId!),
        appointmentsApi.getAll(),
        sessionNotesApi.getByCustomer(customerId!),
        checkinsApi.getCustomerCheckIns(customerId!),
        checkinsApi.getCustomerSummary(customerId!),
        miraApi.getConversations(customerId!),
        miraApi.getCrisisAlerts(customerId!),
      ]);

      if (customerRes.success && customerRes.data) {
        setCustomer(customerRes.data);
      }

      if (appointmentsRes.success && appointmentsRes.data) {
        const items = (appointmentsRes.data as any).items || appointmentsRes.data;
        const customerAppts = (Array.isArray(items) ? items : []).filter(
          (a: Appointment) => a.customerId === customerId
        );
        setAppointments(customerAppts.sort((a: Appointment, b: Appointment) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }

      // Build notes map by appointmentId and keep full list
      const notesData = extractArray(notesRes);
      setAllNotes(notesData);
      const notesMap: Record<string, SessionNote[]> = {};
      notesData.forEach((note: SessionNote) => {
        if (!notesMap[note.appointmentId]) notesMap[note.appointmentId] = [];
        notesMap[note.appointmentId].push(note);
      });
      setNotesByAppointment(notesMap);

      setCheckIns(extractArray(checkInsRes));

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      } else if ((summaryRes as any).totalCheckIns !== undefined) {
        setSummary(summaryRes as unknown as CheckInSummary);
      }

      setMiraConversations(extractArray(miraRes));
      setCrisisAlerts(extractArray(alertsRes));
    } catch (error) {
      toast.error('Failed to load customer data');
    } finally {
      setIsLoading(false);
    }
  };

  const extractArray = (res: any): any[] => {
    if (Array.isArray(res)) return res;
    if (res.success && Array.isArray(res.data)) return res.data;
    if (res.data?.items) return res.data.items;
    return [];
  };

  // ─── Session Note Handlers ───

  const openAddNote = (appointmentId: string) => {
    setNoteAppointmentId(appointmentId);
    setEditingNote(null);
    setNoteContent('');
    setNoteIsPrivate(true);
    setNoteDialogOpen(true);
  };

  const openEditNote = (note: SessionNote) => {
    setNoteAppointmentId(note.appointmentId);
    setEditingNote(note);
    setNoteContent(note.content);
    setNoteIsPrivate(note.isPrivate);
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNote) {
        const res = await sessionNotesApi.update(editingNote.id, {
          content: noteContent,
          isPrivate: noteIsPrivate,
        });
        if (res.success) {
          toast.success('Note updated');
          loadData();
          setNoteDialogOpen(false);
        } else {
          toast.error(res.error || 'Failed to update note');
        }
      } else {
        const data: CreateSessionNoteForm = {
          appointmentId: noteAppointmentId,
          customerId: customerId!,
          content: noteContent,
          isPrivate: noteIsPrivate,
        };
        const res = await sessionNotesApi.create(data);
        if (res.success) {
          toast.success('Note added');
          loadData();
          setNoteDialogOpen(false);
        } else {
          toast.error(res.error || 'Failed to create note');
        }
      }
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  // ─── Info Tab Handlers ───

  const startEditInfo = () => {
    if (!customer) return;
    setInfoForm({
      telegramId: customer.user.telegramId || '',
      telegramChatId: customer.telegramChatId || '',
      phone: customer.user.phone || '',
      address: customer.address || '',
      emergencyContact: customer.emergencyContact || '',
      notes: customer.notes || '',
      checkinCategories: (customer.checkinCategories as string[]) || [],
    });
    setEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    if (!customer) return;
    try {
      // Update user fields (telegramId, phone)
      const userUpdateRes = await fetch(`${config.apiUrl}/users/${customer.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          telegramId: infoForm.telegramId || null,
          phone: infoForm.phone || null,
        }),
      });

      // Update customer fields (including telegramChatId)
      const customerRes = await customersApi.update(customer.id, {
        address: infoForm.address,
        emergencyContact: infoForm.emergencyContact,
        notes: infoForm.notes,
        checkinCategories: infoForm.checkinCategories,
        telegramChatId: infoForm.telegramChatId || null,
      } as any);

      if (customerRes.success) {
        toast.success('Profile updated');
        setEditingInfo(false);
        loadData();
      } else {
        toast.error(customerRes.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to save profile');
    }
  };

  const toggleCategory = (category: string) => {
    setInfoForm((prev) => ({
      ...prev,
      checkinCategories: prev.checkinCategories.includes(category)
        ? prev.checkinCategories.filter((c) => c !== category)
        : [...prev.checkinCategories, category],
    }));
  };

  // ─── Fill Check-in on Behalf ───

  const handleStartFillCheckIn = async () => {
    if (!customerId) return;
    setFillLoading(true);
    try {
      const res = await checkinsApi.startCheckInForPatient(customerId);
      if (res.success && res.data) {
        const { checkIn, questions } = res.data;
        setFillCheckInId(checkIn.id);
        setFillCheckInQuestions(questions);
        setFillAnswers({});

        // Pre-fill existing responses if check-in already has some
        if (checkIn.responses) {
          const existing: Record<string, CheckInAnswer> = {};
          checkIn.responses.forEach((r) => {
            existing[r.questionId] = {
              questionId: r.questionId,
              answerText: r.answerText || undefined,
              answerScale: r.answerScale || undefined,
              answerChoice: r.answerChoice || undefined,
            };
          });
          setFillAnswers(existing);
        }

        setFillCheckInOpen(true);
      } else {
        toast.error((res as any).error || 'Failed to start check-in');
      }
    } catch (error) {
      toast.error('Failed to start check-in');
    } finally {
      setFillLoading(false);
    }
  };

  const updateFillAnswer = (questionId: string, update: Partial<CheckInAnswer>) => {
    setFillAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, ...update },
    }));
  };

  const handleSubmitFillCheckIn = async () => {
    if (!customerId || !fillCheckInId) return;
    const answers = Object.values(fillAnswers).filter(
      (a) => a.answerText || a.answerScale !== undefined || a.answerChoice
    );
    if (answers.length === 0) {
      toast.error('Please answer at least one question');
      return;
    }
    try {
      const res = await checkinsApi.submitResponsesForPatient(customerId, fillCheckInId, answers);
      if (res.success) {
        toast.success('Check-in submitted');
        setFillCheckInOpen(false);
        loadData();
      } else {
        toast.error((res as any).error || 'Failed to submit');
      }
    } catch (error) {
      toast.error('Failed to submit check-in');
    }
  };

  // ─── Check-in Rendering ───

  const renderAnswer = (response: any) => {
    const q = response.question;
    if (!q) return <span className="text-slate-400">-</span>;

    if (q.type === 'scale' && response.answerScale !== null) {
      const pct = ((response.answerScale - (q.scaleMin || 1)) / ((q.scaleMax || 10) - (q.scaleMin || 1))) * 100;
      return (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-medium">{response.answerScale}/{q.scaleMax || 10}</span>
        </div>
      );
    }

    if (q.type === 'multiple_choice' && response.answerChoice) {
      return <Badge variant="outline">{response.answerChoice}</Badge>;
    }

    if (q.type === 'free_text' && response.answerText) {
      return <span className="text-sm text-slate-700">{response.answerText}</span>;
    }

    return <span className="text-slate-400">No answer</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Customer not found.</p>
        <Button variant="link" onClick={() => navigate('/admin/customers')}>
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/customers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{customer.user.name}</h1>
          <p className="text-slate-600 mt-1">Customer Profile</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium">{customer.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm font-medium">{customer.user.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Telegram ID</p>
                <p className="text-sm font-medium">{customer.user.telegramId || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Date of Birth</p>
                <p className="text-sm font-medium">
                  {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-sm font-medium">{customer.address || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Emergency Contact</p>
                <p className="text-sm font-medium">{customer.emergencyContact || '-'}</p>
              </div>
            </div>
            {customer.assignedIntern && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Assigned Intern</p>
                  <p className="text-sm font-medium">{customer.assignedIntern.user.name}</p>
                </div>
              </div>
            )}
          </div>
          {customer.notes && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Appointments + Notes | Daily Check-ins */}
      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments" className="gap-2">
            <Calendar className="h-4 w-4" />
            Appointments ({appointments.length}) & Notes ({allNotes.length})
          </TabsTrigger>
          <TabsTrigger value="checkins" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Daily Check-ins ({checkIns.length})
          </TabsTrigger>
          <TabsTrigger value="mira" className="gap-2">
            <Bot className="h-4 w-4" />
            Mira ({miraConversations.length})
            {crisisAlerts.length > 0 && (
              <span className="ml-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {crisisAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <Info className="h-4 w-4" />
            Info
          </TabsTrigger>
        </TabsList>

        {/* ─── Appointments & Session Notes Tab ─── */}
        <TabsContent value="appointments" className="space-y-4">
          {/* All Session Notes Summary — always visible */}
          {allNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  All Session Notes ({allNotes.length})
                </CardTitle>
                <CardDescription>Complete notes history for this customer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {allNotes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-400">
                            {note.doctor?.user?.name || 'Therapist'} &middot;{' '}
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                          <Badge variant="secondary" className="text-xs h-5">
                            {note.isPrivate ? (
                              <><EyeOff className="h-2.5 w-2.5 mr-1" />Private</>
                            ) : (
                              <><Eye className="h-2.5 w-2.5 mr-1" />Visible</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => openEditNote(note)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Appointments with inline notes */}
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-500">
                No appointments found for this customer.
              </CardContent>
            </Card>
          ) : (
            appointments.map((appt) => {
              const notes = notesByAppointment[appt.id] || [];
              return (
                <Card key={appt.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {new Date(appt.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </CardTitle>
                          <CardDescription>
                            with {appt.doctor?.user?.name || 'Unknown Doctor'}
                            {appt.timeSlot && ` | ${appt.timeSlot.startTime} - ${appt.timeSlot.endTime}`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[appt.status] || ''}>
                          {appt.status}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => openAddNote(appt.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Note
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Appointment notes */}
                  {appt.notes && (
                    <CardContent className="pt-0 pb-3">
                      <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                        <span className="text-xs text-slate-400">Appointment notes: </span>
                        {appt.notes}
                      </div>
                    </CardContent>
                  )}

                  {/* Session Notes */}
                  {notes.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Session Notes ({notes.length})
                        </p>
                        {notes.map((note) => (
                          <div key={note.id} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-slate-400">
                                    {note.doctor?.user?.name || 'Therapist'} &middot;{' '}
                                    {new Date(note.createdAt).toLocaleString()}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs h-5"
                                  >
                                    {note.isPrivate ? (
                                      <><EyeOff className="h-2.5 w-2.5 mr-1" />Private</>
                                    ) : (
                                      <><Eye className="h-2.5 w-2.5 mr-1" />Visible</>
                                    )}
                                  </Badge>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => openEditNote(note)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ─── Daily Check-ins Tab ─── */}
        <TabsContent value="checkins" className="space-y-4">
          {/* Fill Check-in Button */}
          <div className="flex justify-end">
            <Button onClick={handleStartFillCheckIn} disabled={fillLoading}>
              <Plus className="h-4 w-4 mr-2" />
              {fillLoading ? 'Loading...' : 'Fill Check-in for Patient'}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Check-ins</p>
                    <p className="text-2xl font-bold">{summary?.totalCheckIns || checkIns.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="text-2xl font-bold">
                      {checkIns.filter((c) => c.completedAt).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Categories Tracked</p>
                    <p className="text-2xl font-bold">
                      {summary?.categoryTrends ? Object.keys(summary.categoryTrends).length : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Trends */}
          {summary?.categoryTrends && Object.keys(summary.categoryTrends).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Category Averages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(summary.categoryTrends).map(([category, data]) => {
                    const latest = data[data.length - 1];
                    if (!latest) return null;
                    return (
                      <div key={category} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${categoryColors[category] || 'bg-slate-400'}`} />
                          <span className="text-xs font-medium capitalize">{category}</span>
                        </div>
                        <p className="text-xl font-bold">{latest.average}</p>
                        <p className="text-xs text-slate-400">{data.length} data points</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check-in History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Check-in History</CardTitle>
            </CardHeader>
            <CardContent>
              {checkIns.length === 0 ? (
                <p className="text-center text-slate-500 py-6">No check-ins recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {checkIns.map((checkIn) => (
                    <div key={checkIn.id} className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                        onClick={() => setExpandedCheckIn(expandedCheckIn === checkIn.id ? null : checkIn.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1 rounded-full ${checkIn.completedAt ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            {checkIn.completedAt ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(checkIn.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-slate-400">
                              {checkIn.responses?.length || 0} responses
                              {checkIn.filledBy && (
                                <span className="ml-1">
                                  &middot; Filled by {checkIn.filledBy.name} ({checkIn.filledBy.role})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {checkIn.source === 'telegram' && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              via Telegram
                            </Badge>
                          )}
                          {checkIn.filledBy && (
                            <Badge variant="outline" className="text-xs">
                              On behalf
                            </Badge>
                          )}
                          <Badge variant={checkIn.completedAt ? 'default' : 'secondary'} className="text-xs">
                            {checkIn.completedAt ? 'Done' : 'Pending'}
                          </Badge>
                        </div>
                      </button>

                      {expandedCheckIn === checkIn.id && checkIn.responses && (
                        <div className="border-t bg-slate-50 p-3 space-y-2">
                          {checkIn.responses.map((response) => (
                            <div key={response.id} className="flex items-start justify-between gap-3">
                              <p className="text-sm text-slate-700 flex-1">{response.question?.text}</p>
                              <div className="shrink-0">{renderAnswer(response)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Mira Conversations Tab ─── */}
        <TabsContent value="mira" className="space-y-4">
          {/* Crisis Alerts */}
          {crisisAlerts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-800">
                  <ShieldAlert className="h-4 w-4" />
                  Active Crisis Alerts ({crisisAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {crisisAlerts.map((alert) => (
                  <div key={alert.id} className="border border-red-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="destructive"
                            className={
                              alert.severity === 'high'
                                ? 'bg-red-600'
                                : alert.severity === 'medium'
                                  ? 'bg-orange-500'
                                  : 'bg-yellow-500'
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(alert.notifiedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">"{alert.triggerMessage}"</p>
                      </div>
                      {!alert.resolvedAt && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const res = await miraApi.resolveAlert(alert.id);
                            if (res.success) {
                              toast.success('Alert resolved');
                              loadData();
                            } else {
                              toast.error('Failed to resolve alert');
                            }
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Conversations */}
          {miraConversations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No Mira conversations yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Conversations will appear here when this patient chats with Mira via Telegram
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            miraConversations.map((conv) => (
              <Card key={conv.id}>
                <CardHeader
                  className="pb-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() =>
                    setExpandedConversation(
                      expandedConversation === conv.id ? null : conv.id
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        {new Date(conv.startedAt).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          conv.mode === 'checkin'
                            ? 'border-blue-200 text-blue-700 bg-blue-50'
                            : 'border-purple-200 text-purple-700 bg-purple-50'
                        }
                      >
                        {conv.mode === 'checkin' ? 'Check-in' : 'Free Chat'}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {conv.messages?.length || 0} messages
                      </span>
                    </div>
                    {expandedConversation === conv.id ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </CardHeader>
                {expandedConversation === conv.id && (
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(conv.messages || [])
                        .filter((m) => m.role !== 'system')
                        .map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* ─── Info Tab ─── */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Profile Details</CardTitle>
                {!editingInfo ? (
                  <Button size="sm" variant="outline" onClick={startEditInfo}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveInfo}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingInfo(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phone</label>
                    <Input
                      value={infoForm.phone}
                      onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Telegram ID</label>
                    <Input
                      value={infoForm.telegramId}
                      onChange={(e) => setInfoForm({ ...infoForm, telegramId: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Telegram Chat ID</label>
                    <Input
                      value={infoForm.telegramChatId}
                      onChange={(e) => setInfoForm({ ...infoForm, telegramChatId: e.target.value })}
                      placeholder="Numeric chat ID (for bot messages)"
                    />
                    <p className="text-xs text-slate-400">Required for automated Telegram check-ins</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Address</label>
                    <Input
                      value={infoForm.address}
                      onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })}
                      placeholder="Address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Emergency Contact</label>
                    <Input
                      value={infoForm.emergencyContact}
                      onChange={(e) => setInfoForm({ ...infoForm, emergencyContact: e.target.value })}
                      placeholder="Emergency contact"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Notes</label>
                    <Textarea
                      value={infoForm.notes}
                      onChange={(e) => setInfoForm({ ...infoForm, notes: e.target.value })}
                      placeholder="General notes about this customer"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm font-medium">{customer.user.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Telegram ID</p>
                    <p className="text-sm font-medium">{customer.user.telegramId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Telegram Chat ID</p>
                    <p className="text-sm font-medium">{customer.telegramChatId || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="text-sm font-medium">{customer.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Emergency Contact</p>
                    <p className="text-sm font-medium">{customer.emergencyContact || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date of Birth</p>
                    <p className="text-sm font-medium">
                      {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  {customer.notes && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500">Notes</p>
                      <p className="text-sm">{customer.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check-in Category Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Check-in Focus Categories</CardTitle>
              <CardDescription>
                Select which categories of questions this customer receives in their daily check-ins.
                If none selected, questions from all categories will be included.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingInfo ? (
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const isSelected = infoForm.checkinCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {((customer.checkinCategories as string[]) || []).length > 0 ? (
                    ((customer.checkinCategories as string[]) || []).map((cat) => (
                      <Badge key={cat} className="capitalize">{cat}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">All categories (no specific focus assigned)</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Add/Edit Session Note Dialog ─── */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Session Note' : 'Add Session Note'}</DialogTitle>
            <DialogDescription>
              {editingNote ? 'Update note for this appointment' : 'Write a note for this appointment'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNote} className="space-y-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Session observations, progress, follow-up items..."
                rows={6}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notePrivate"
                checked={noteIsPrivate}
                onChange={(e) => setNoteIsPrivate(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="notePrivate" className="cursor-pointer text-sm">
                Private (not visible to customer)
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                {editingNote ? 'Update' : 'Save'} Note
              </Button>
              <Button type="button" variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Fill Check-in on Behalf Dialog ─── */}
      <Dialog open={fillCheckInOpen} onOpenChange={setFillCheckInOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fill Daily Check-in</DialogTitle>
            <DialogDescription>
              Filling check-in on behalf of {customer.user.name} for today
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {fillCheckInQuestions.map((q, idx) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium">
                  {idx + 1}. {q.text}
                </p>
                <Badge variant="outline" className="text-xs capitalize mb-2">
                  {q.category}
                </Badge>

                {q.type === 'scale' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{q.scaleMinLabel || q.scaleMin || 1}</span>
                      <span>{q.scaleMaxLabel || q.scaleMax || 10}</span>
                    </div>
                    <input
                      type="range"
                      min={q.scaleMin || 1}
                      max={q.scaleMax || 10}
                      value={fillAnswers[q.id]?.answerScale ?? Math.ceil(((q.scaleMin || 1) + (q.scaleMax || 10)) / 2)}
                      onChange={(e) => updateFillAnswer(q.id, { answerScale: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center text-lg font-bold">
                      {fillAnswers[q.id]?.answerScale ?? '-'}
                    </p>
                  </div>
                )}

                {q.type === 'multiple_choice' && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {(q.options as string[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateFillAnswer(q.id, { answerChoice: option })}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          fillAnswers[q.id]?.answerChoice === option
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'free_text' && (
                  <Textarea
                    value={fillAnswers[q.id]?.answerText || ''}
                    onChange={(e) => updateFillAnswer(q.id, { answerText: e.target.value })}
                    placeholder="Enter response..."
                    rows={2}
                  />
                )}
              </div>
            ))}

            {fillCheckInQuestions.length === 0 && (
              <p className="text-center text-slate-500 py-4">
                No check-in questions available. Add questions in the Check-in Questions page first.
              </p>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleSubmitFillCheckIn}
                className="flex-1"
                disabled={fillCheckInQuestions.length === 0}
              >
                Submit Check-in
              </Button>
              <Button variant="outline" onClick={() => setFillCheckInOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
