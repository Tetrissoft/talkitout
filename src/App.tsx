import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMetaPixel } from "@/hooks/use-meta-pixel";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BookAppointment from "./pages/BookAppointment";
import BookIntern from "./pages/BookIntern";
import Login from "./pages/Login";
import AssessmentPlugin from "./pages/AssessmentPlugin";

import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Doctors from "./pages/admin/Doctors";
import Customers from "./pages/admin/Customers";
import Appointments from "./pages/admin/Appointments";
import TimeSlots from "./pages/admin/TimeSlots";

const queryClient = new QueryClient();

const App = () => {
  useMetaPixel();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
              <Route path="/book-appointment" element={<BookAppointment />} />
              <Route path="/book-intern" element={<BookIntern />} />

              {/* Embeddable Assessment Plugin Route */}
              <Route path="/plugin/assessment/:testId" element={<AssessmentPlugin />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="users" element={<Users />} />
                  <Route path="doctors" element={<Doctors />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="time-slots" element={<TimeSlots />} />
                </Route>
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
