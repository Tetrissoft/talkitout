import { useState, useEffect } from 'react';
import { sessionNotesApi, appointmentsApi, customersApi } from '@/services/api';
import type { SessionNote, Appointment, Customer, CreateSessionNoteForm } from '@/types/admin';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
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

export default function SessionNotes() {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [deleteNote, setDeleteNote] = useState<SessionNote | null>(null);
  const [viewNote, setViewNote] = useState<SessionNote | null>(null);

  const [formData, setFormData] = useState<CreateSessionNoteForm>({
    appointmentId: '',
    customerId: '',
    content: '',
    isPrivate: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notesRes, appointmentsRes, customersRes] = await Promise.all([
        sessionNotesApi.getAll(),
        appointmentsApi.getAll(),
        customersApi.getAll(),
      ]);

      if (notesRes.success && Array.isArray(notesRes)) {
        setNotes(notesRes as unknown as SessionNote[]);
      } else if (notesRes.success && notesRes.data) {
        setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      } else if (Array.isArray(notesRes)) {
        setNotes(notesRes as unknown as SessionNote[]);
      }

      if (appointmentsRes.success && appointmentsRes.data) {
        const items = (appointmentsRes.data as any).items || appointmentsRes.data;
        setAppointments(Array.isArray(items) ? items : []);
      }

      if (customersRes.success && customersRes.data) {
        const items = (customersRes.data as any).items || customersRes.data;
        setCustomers(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNote) {
        const response = await sessionNotesApi.update(editingNote.id, {
          content: formData.content,
          isPrivate: formData.isPrivate,
        });
        if (response.success) {
          toast.success('Note updated successfully');
          loadData();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(response.error || 'Failed to update note');
        }
      } else {
        const response = await sessionNotesApi.create(formData);
        if (response.success) {
          toast.success('Note created successfully');
          loadData();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(response.error || 'Failed to create note');
        }
      }
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleEdit = (note: SessionNote) => {
    setEditingNote(note);
    setFormData({
      appointmentId: note.appointmentId,
      customerId: note.customerId,
      content: note.content,
      isPrivate: note.isPrivate,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteNote) return;
    try {
      const response = await sessionNotesApi.delete(deleteNote.id);
      if (response.success) {
        toast.success('Note deleted successfully');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to delete note');
    } finally {
      setDeleteNote(null);
    }
  };

  const resetForm = () => {
    setFormData({ appointmentId: '', customerId: '', content: '', isPrivate: true });
    setEditingNote(null);
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
          <h1 className="text-3xl font-bold text-slate-900">Session Notes</h1>
          <p className="text-slate-600 mt-2">Therapist notes from appointments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Create Session Note'}</DialogTitle>
              <DialogDescription>
                {editingNote ? 'Update the session note' : 'Add a note for an appointment'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingNote && (
                <>
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select
                      value={formData.customerId}
                      onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.user.name} ({c.user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Appointment</Label>
                    <Select
                      value={formData.appointmentId}
                      onValueChange={(value) => setFormData({ ...formData, appointmentId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointments
                          .filter((a) => !formData.customerId || a.customerId === formData.customerId)
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {new Date(a.date).toLocaleDateString()} - {a.customer?.user?.name || 'Unknown'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Note Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter session notes..."
                  rows={6}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isPrivate" className="cursor-pointer">
                  Private note (not visible to customer)
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingNote ? 'Update' : 'Create'} Note
                </Button>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Session Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Note Preview</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No session notes found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{new Date(note.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">
                      {note.customer?.user?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{note.doctor?.user?.name || 'Unknown'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {note.content.substring(0, 80)}{note.content.length > 80 ? '...' : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={note.isPrivate ? 'secondary' : 'default'}>
                        {note.isPrivate ? (
                          <><EyeOff className="h-3 w-3 mr-1" /> Private</>
                        ) : (
                          <><Eye className="h-3 w-3 mr-1" /> Visible</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setViewNote(note)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(note)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteNote(note)}>
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

      {/* View Note Dialog */}
      <Dialog open={!!viewNote} onOpenChange={() => setViewNote(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Session Note</DialogTitle>
            <DialogDescription>
              {viewNote && `${viewNote.customer?.user?.name} - ${new Date(viewNote.createdAt).toLocaleDateString()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="outline">By: {viewNote?.doctor?.user?.name}</Badge>
              <Badge variant={viewNote?.isPrivate ? 'secondary' : 'default'}>
                {viewNote?.isPrivate ? 'Private' : 'Visible to customer'}
              </Badge>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
              {viewNote?.content}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteNote} onOpenChange={() => setDeleteNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this session note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
