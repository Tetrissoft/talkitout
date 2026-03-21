import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  UserCog,
  Calendar,
  Clock,
  LogOut,
  Menu,
  X,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Doctors',
    href: '/admin/doctors',
    icon: Stethoscope,
    roles: ['admin'],
  },
  {
    title: 'Patients',
    href: '/admin/customers',
    icon: UserCog,
    roles: ['admin', 'therapist', 'intern'],
  },
  {
    title: 'Appointments',
    href: '/admin/appointments',
    icon: Calendar,
    roles: ['admin', 'therapist', 'intern'],
  },
  {
    title: 'Time Slots',
    href: '/admin/time-slots',
    icon: Clock,
    roles: ['admin', 'therapist', 'intern'],
  },
  {
    title: 'Check-in Questions',
    href: '/admin/checkin-questions',
    icon: ClipboardList,
    roles: ['admin'],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">TalkItOut Admin</h1>
        <p className="text-sm text-slate-400 mt-1">
          {user?.name} ({user?.role})
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h1 className="text-xl font-bold text-white">TalkItOut Admin</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-slate-200">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <h2 className="text-xl font-semibold text-slate-800">
            {navItems.find((item) => item.href === location.pathname)?.title ||
              'Dashboard'}
          </h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
