import { useState, useEffect } from 'react';
import { appointmentsApi, customersApi, doctorsApi, timeSlotsApi } from '@/services/api';
import type {
  Appointment,
  Customer,
  Doctor,
  TimeSlot,
  CreateAppointmentForm,
  AppointmentStatus,
} from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${minute} ${ampm}`;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deleteAppointment, setDeleteAppointment] = useState<Appointment | null>(null);

  const [formData, setFormData] = useState<CreateAppointmentForm & { status?: AppointmentStatus }>({
    customerId: '',
    doctorId: '',
    date: '',
    timeSlotId: '',
    notes: '',
    status: 'scheduled',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Fetch time slots when doctor changes
  useEffect(() => {
    if (formData.doctorId) {
      loadTimeSlots(formData.doctorId);
    } else {
      setTimeSlots([]);
    }
  }, [formData.doctorId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appointmentsRes, customersRes, doctorsRes] = await Promise.all([
        appointmentsApi.getAll(),
        customersApi.getAll(),
        doctorsApi.getAll(),
      ]);

      if (appointmentsRes.success && appointmentsRes.data) {
        setAppointments(appointmentsRes.data.items);
      }
      if (customersRes.success && customersRes.data) {
        setCustomers(customersRes.data.items);
      }
      if (doctorsRes.success && doctorsRes.data) {
        setDoctors(doctorsRes.data.items);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeSlots = async (doctorId: string) => {
    setIsSlotsLoading(true);
    try {
      const response = await timeSlotsApi.getByDoctorId(doctorId);
      if (response.success && response.data) {
        setTimeSlots(response.data);
      } else {
        setTimeSlots([]);
      }
    } catch (error) {
      toast.error('Failed to load time slots');
      setTimeSlots([]);
    } finally {
      setIsSlotsLoading(false);
    }
  };

  const availableTimeSlots = timeSlots.filter((slot) => slot.isAvailable);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAppointment) {
        const response = await appointmentsApi.update(editingAppointment.id, {
          ...formData,
          id: editingAppointment.id,
        });

        if (response.success) {
          toast.success('Appointment updated successfully');
          loadData();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(response.error || 'Failed to update appointment');
        }
      } else {
        const response = await appointmentsApi.create(formData);
        if (response.success) {
          toast.success('Appointment created successfully');
          loadData();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(response.error || 'Failed to create appointment');
        }
      }
    } catch (error) {
      toast.error('Failed to save appointment');
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      customerId: appointment.customerId,
      doctorId: appointment.doctorId,
      date: appointment.date.split('T')[0],
      timeSlotId: appointment.timeSlotId,
      notes: appointment.notes || '',
      status: appointment.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteAppointment) return;

    try {
      const response = await appointmentsApi.delete(deleteAppointment.id);
      if (response.success) {
        toast.success('Appointment cancelled successfully');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to cancel appointment');
    } finally {
      setDeleteAppointment(null);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      doctorId: '',
      date: '',
      timeSlotId: '',
      notes: '',
      status: 'scheduled',
    });
    setEditingAppointment(null);
    setTimeSlots([]);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const getStatusBadgeColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-600 mt-2">
            Manage and schedule appointments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment
                  ? 'Edit Appointment'
                  : 'Schedule New Appointment'}
              </DialogTitle>
              <DialogDescription>
                {editingAppointment
                  ? 'Update appointment details'
                  : 'Book a new appointment slot'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customerId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">
                        No customers available. Create one first.
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.user.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor/Intern</Label>
                <Select
                  value={formData.doctorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, doctorId: value, timeSlotId: '' })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor or intern" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.user.name} ({doctor.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeSlotId">Time Slot</Label>
                  <Select
                    value={formData.timeSlotId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, timeSlotId: value })
                    }
                    required
                    disabled={!formData.doctorId || isSlotsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !formData.doctorId
                            ? 'Select a doctor first'
                            : isSlotsLoading
                              ? 'Loading slots...'
                              : 'Select time'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.length === 0 ? (
                        <div className="p-2 text-sm text-slate-500">
                          No available time slots for this doctor.
                        </div>
                      ) : (
                        availableTimeSlots.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id}>
                            {DAY_NAMES[slot.dayOfWeek]} {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editingAppointment && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: AppointmentStatus) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no-show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Add any additional notes..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={customers.length === 0}>
                  {editingAppointment ? 'Update' : 'Schedule'} Appointment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              <strong>Note:</strong> You need to create patients before you can
              schedule appointments.{' '}
              <a href="/admin/customers" className="underline font-semibold">
                Go to Patients
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Doctor/Intern</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No appointments scheduled yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {appointment.customer?.user?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {appointment.doctor?.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {appointment.doctor?.type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {format(new Date(appointment.date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {appointment.timeSlot
                            ? `${formatTime(appointment.timeSlot.startTime)} - ${formatTime(appointment.timeSlot.endTime)}`
                            : 'TBD'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">
                        {appointment.notes || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(appointment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAppointment(appointment)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteAppointment}
        onOpenChange={() => setDeleteAppointment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently cancel the
              appointment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
