import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, doctorsApi, customersApi, appointmentsApi, miraApi } from '@/services/api';
import type { CrisisAlert } from '@/types/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Stethoscope, UserCog, Calendar, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    therapistCount: 0,
    internCount: 0,
    totalCustomers: 0,
    totalAppointments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const [usersRes, doctorsRes, customersRes, appointmentsRes, alertsRes] = await Promise.all([
          usersApi.getAll(),
          doctorsApi.getAll(),
          customersApi.getAll(),
          appointmentsApi.getAll(),
          (user?.role === 'admin' || user?.role === 'therapist') ? miraApi.getCrisisAlerts() : Promise.resolve({ success: true, data: [] }),
        ]);

        setStats({
          totalUsers: usersRes.success && usersRes.data ? usersRes.data.total : 0,
          totalDoctors: doctorsRes.success && doctorsRes.data ? doctorsRes.data.total : 0,
          therapistCount: doctorsRes.success && doctorsRes.data
            ? doctorsRes.data.items.filter((d) => d.type === 'therapist').length
            : 0,
          internCount: doctorsRes.success && doctorsRes.data
            ? doctorsRes.data.items.filter((d) => d.type === 'intern').length
            : 0,
          totalCustomers: customersRes.success && customersRes.data ? customersRes.data.total : 0,
          totalAppointments: appointmentsRes.success && appointmentsRes.data ? appointmentsRes.data.total : 0,
        });

        if (alertsRes.success && Array.isArray(alertsRes.data)) {
          setCrisisAlerts(alertsRes.data as CrisisAlert[]);
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Registered users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Doctors',
      value: stats.totalDoctors,
      icon: Stethoscope,
      description: `${stats.therapistCount} Therapist${stats.therapistCount !== 1 ? 's' : ''}, ${stats.internCount} Intern${stats.internCount !== 1 ? 's' : ''}`,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Patients',
      value: stats.totalCustomers,
      icon: UserCog,
      description: 'Active patients',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Appointments',
      value: stats.totalAppointments,
      icon: Calendar,
      description: 'Scheduled appointments',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-slate-600 mt-2">
          Here's what's happening with your platform today.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-8 w-12 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Crisis Alerts Panel */}
      {crisisAlerts.length > 0 && (user?.role === 'admin' || user?.role === 'therapist') && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <ShieldAlert className="h-5 w-5" />
              Active Crisis Alerts ({crisisAlerts.length})
            </CardTitle>
            <CardDescription className="text-red-600">
              These patients may need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {crisisAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between gap-3 p-3 bg-white rounded-lg border border-red-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {alert.customer?.user?.name || 'Unknown Patient'}
                    </span>
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
                  <p className="text-sm text-slate-600">"{alert.triggerMessage}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {alert.customer && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/customers/${alert.customerId}`)}
                    >
                      View Profile
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      const res = await miraApi.resolveAlert(alert.id);
                      if (res.success) {
                        toast.success('Alert resolved');
                        setCrisisAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                      } else {
                        toast.error('Failed to resolve alert');
                      }
                    }}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {user?.role === 'admin' && (
              <>
                <a
                  href="/admin/users"
                  className="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium">Create New User</p>
                  <p className="text-sm text-slate-600">
                    Add users, doctors, or patients
                  </p>
                </a>
                <a
                  href="/admin/doctors"
                  className="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium">Manage Doctors</p>
                  <p className="text-sm text-slate-600">
                    Assign interns to therapists
                  </p>
                </a>
              </>
            )}
            <a
              href="/admin/appointments"
              className="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <p className="font-medium">Schedule Appointment</p>
              <p className="text-sm text-slate-600">
                Book slots for patients
              </p>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Name:</span>
              <span className="text-sm font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Email:</span>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Role:</span>
              <span className="text-sm font-medium capitalize">
                {user?.role}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
