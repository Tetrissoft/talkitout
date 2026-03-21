import { useState, useEffect } from 'react';
import { customersApi, doctorsApi } from '@/services/api';
import type { Customer, Doctor } from '@/types/admin';
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
import { UserCog, Pencil, Trash2, UserPlus, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interns, setInterns] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [assigningCustomer, setAssigningCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    assignedInternId: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    notes: '',
  });

  const [assignInternId, setAssignInternId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customersRes, doctorsRes] = await Promise.all([
        customersApi.getAll(),
        doctorsApi.getAll(),
      ]);

      if (customersRes.success && customersRes.data) {
        setCustomers(customersRes.data.items);
      }
      if (doctorsRes.success && doctorsRes.data) {
        const internsList = doctorsRes.data.items.filter((d) => d.type === 'intern');
        setInterns(internsList);
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
      if (editingCustomer) {
        const updateData: Record<string, any> = {};
        const internId = formData.assignedInternId;
        if (internId && internId !== 'none') {
          updateData.assignedInternId = internId;
        }
        if (formData.dateOfBirth) updateData.dateOfBirth = formData.dateOfBirth;
        if (formData.address) updateData.address = formData.address;
        if (formData.emergencyContact) updateData.emergencyContact = formData.emergencyContact;
        if (formData.notes) updateData.notes = formData.notes;

        const response = await customersApi.update(editingCustomer.id, {
          ...updateData,
          id: editingCustomer.id,
        });

        if (response.success) {
          toast.success('Patient updated successfully');
          loadData();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(response.error || 'Failed to update patient');
        }
      } else {
        // Create new patient (User + Customer in one step)
        const createData: Record<string, any> = {
          name: formData.name,
          email: formData.email,
        };
        if (formData.password) createData.password = formData.password;
        if (formData.phone) createData.phone = formData.phone;
        const internId = formData.assignedInternId;
        if (internId && internId !== 'none') createData.assignedInternId = internId;
        if (formData.dateOfBirth) createData.dateOfBirth = formData.dateOfBirth;
        if (formData.address) createData.address = formData.address;
        if (formData.emergencyContact) createData.emergencyContact = formData.emergencyContact;
        if (formData.notes) createData.notes = formData.notes;

        const response = await customersApi.createPatient(createData as any);
        if (response.success) {
          toast.success('Patient created successfully');
          loadData();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(response.error || 'Failed to create patient');
        }
      }
    } catch (error) {
      toast.error('Failed to save patient');
    }
  };

  const handleAssignIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningCustomer) return;

    try {
      const response = await customersApi.assignToIntern(
        assigningCustomer.id,
        assignInternId
      );

      if (response.success) {
        toast.success('Patient assigned to intern successfully');
        loadData();
        setIsAssignDialogOpen(false);
        setAssigningCustomer(null);
        setAssignInternId('');
      }
    } catch (error) {
      toast.error('Failed to assign patient');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.user.name,
      email: customer.user.email,
      password: '',
      phone: customer.user.phone || '',
      assignedInternId: customer.assignedInternId || '',
      dateOfBirth: customer.dateOfBirth || '',
      address: customer.address || '',
      emergencyContact: customer.emergencyContact || '',
      notes: customer.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;

    try {
      const response = await customersApi.delete(deleteCustomer.id);
      if (response.success) {
        toast.success('Patient deleted successfully');
        loadData();
      }
    } catch (error) {
      toast.error('Failed to delete patient');
    } finally {
      setDeleteCustomer(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      assignedInternId: '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
      notes: '',
    });
    setEditingCustomer(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const openAssignDialog = (customer: Customer) => {
    setAssigningCustomer(customer);
    setAssignInternId(customer.assignedInternId || '');
    setIsAssignDialogOpen(true);
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
          <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
          <p className="text-slate-600 mt-2">Manage patient accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserCog className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Patient' : 'Create New Patient'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? 'Update patient information'
                  : 'Add a new patient to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingCustomer && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Patient's full name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="patient@example.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="assignedInternId">Assigned Intern</Label>
                <Select
                  value={formData.assignedInternId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedInternId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select intern (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {interns.map((intern) => (
                      <SelectItem key={intern.id} value={intern.id}>
                        {intern.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  type="tel"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingCustomer ? 'Update' : 'Create'} Patient
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

      <Card>
        <CardHeader>
          <CardTitle>All Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned Intern</TableHead>
                <TableHead>Emergency Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No patients found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-left font-medium"
                        onClick={() => navigate(`/admin/customers/${customer.id}`)}
                      >
                        {customer.user.name}
                      </Button>
                    </TableCell>
                    <TableCell>{customer.user.email}</TableCell>
                    <TableCell>{customer.user.phone || '-'}</TableCell>
                    <TableCell>
                      {customer.assignedIntern ? (
                        <div>
                          <p className="font-medium">
                            {customer.assignedIntern.user.name}
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => openAssignDialog(customer)}
                          >
                            Reassign
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(customer)}
                        >
                          Assign Intern
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{customer.emergencyContact || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View Check-ins"
                          onClick={() => navigate(`/admin/customers/${customer.id}/checkins`)}
                        >
                          <ClipboardList className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteCustomer(customer)}
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

      {/* Assign Intern Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Patient to Intern</DialogTitle>
            <DialogDescription>
              Select an intern to assign to {assigningCustomer?.user.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignIntern} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intern">Intern</Label>
              <Select
                value={assignInternId}
                onValueChange={setAssignInternId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select intern" />
                </SelectTrigger>
                <SelectContent>
                  {interns.map((intern) => (
                    <SelectItem key={intern.id} value={intern.id}>
                      {intern.user.name} - {intern.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Assign
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false);
                  setAssigningCustomer(null);
                  setAssignInternId('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteCustomer}
        onOpenChange={() => setDeleteCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              patient profile for {deleteCustomer?.user.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
