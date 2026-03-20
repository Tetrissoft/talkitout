import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkinsApi, customersApi } from '@/services/api';
import type { DailyCheckIn, Customer, CheckInSummary } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

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

export default function CustomerCheckIns() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCheckIn, setExpandedCheckIn] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) loadData();
  }, [customerId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [checkInsRes, customerRes, summaryRes] = await Promise.all([
        checkinsApi.getCustomerCheckIns(customerId!),
        customersApi.getById(customerId!),
        checkinsApi.getCustomerSummary(customerId!),
      ]);

      if (checkInsRes.success && Array.isArray(checkInsRes)) {
        setCheckIns(checkInsRes as unknown as DailyCheckIn[]);
      } else if (Array.isArray(checkInsRes)) {
        setCheckIns(checkInsRes as unknown as DailyCheckIn[]);
      } else if (checkInsRes.data) {
        setCheckIns(Array.isArray(checkInsRes.data) ? checkInsRes.data : []);
      }

      if (customerRes.success && customerRes.data) {
        setCustomer(customerRes.data);
      }

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      } else if (summaryRes.success && (summaryRes as any).totalCheckIns !== undefined) {
        setSummary(summaryRes as unknown as CheckInSummary);
      }
    } catch (error) {
      toast.error('Failed to load check-in data');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/customers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {customer?.user?.name || 'Customer'}'s Check-ins
          </h1>
          <p className="text-slate-600 mt-1">
            Daily wellness check-in history and trends
          </p>
        </div>
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
                <p className="text-2xl font-bold">{summary?.totalCheckIns || 0}</p>
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Category Averages (Latest)
            </CardTitle>
            <CardDescription>Average scores from scale-type questions by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary.categoryTrends).map(([category, data]) => {
                const latest = data[data.length - 1];
                if (!latest) return null;
                return (
                  <div key={category} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors[category] || 'bg-slate-400'}`} />
                      <span className="text-sm font-medium capitalize">{category}</span>
                    </div>
                    <p className="text-2xl font-bold">{latest.average}</p>
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
          <CardTitle>Check-in History</CardTitle>
        </CardHeader>
        <CardContent>
          {checkIns.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No check-ins recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {checkIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => setExpandedCheckIn(expandedCheckIn === checkIn.id ? null : checkIn.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${checkIn.completedAt ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        {checkIn.completedAt ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {new Date(checkIn.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {checkIn.responses?.length || 0} responses
                          {checkIn.completedAt && ` • Completed at ${new Date(checkIn.completedAt).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={checkIn.completedAt ? 'default' : 'secondary'}>
                      {checkIn.completedAt ? 'Completed' : 'In Progress'}
                    </Badge>
                  </button>

                  {expandedCheckIn === checkIn.id && checkIn.responses && (
                    <div className="border-t bg-slate-50 p-4 space-y-3">
                      {checkIn.responses.map((response) => (
                        <div key={response.id} className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {response.question && (
                                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${categoryColors[response.question.category] ? categoryColors[response.question.category].replace('bg-', 'bg-').replace('500', '100') + ' ' + categoryColors[response.question.category].replace('bg-', 'text-').replace('500', '700') : 'bg-slate-100 text-slate-700'}`}>
                                  {response.question.category}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700">{response.question?.text}</p>
                          </div>
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
    </div>
  );
}
