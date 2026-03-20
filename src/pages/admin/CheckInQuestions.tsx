import { useState, useEffect } from 'react';
import { checkinsApi } from '@/services/api';
import type { CheckInQuestion, CheckInQuestionCategory, CheckInQuestionType } from '@/types/admin';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
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

const CATEGORIES: CheckInQuestionCategory[] = [
  'mood', 'anxiety', 'sleep', 'energy', 'social', 'stress', 'mindfulness', 'general',
];

const QUESTION_TYPES: { value: CheckInQuestionType; label: string }[] = [
  { value: 'scale', label: 'Scale (1-10)' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'free_text', label: 'Free Text' },
];

const categoryColors: Record<string, string> = {
  mood: 'bg-yellow-100 text-yellow-800',
  anxiety: 'bg-red-100 text-red-800',
  sleep: 'bg-indigo-100 text-indigo-800',
  energy: 'bg-orange-100 text-orange-800',
  social: 'bg-green-100 text-green-800',
  stress: 'bg-pink-100 text-pink-800',
  mindfulness: 'bg-purple-100 text-purple-800',
  general: 'bg-slate-100 text-slate-800',
};

interface QuestionForm {
  text: string;
  type: CheckInQuestionType;
  category: CheckInQuestionCategory;
  tags: string;
  options: string;
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  sortOrder: number;
}

const defaultForm: QuestionForm = {
  text: '',
  type: 'scale',
  category: 'mood',
  tags: '',
  options: '',
  scaleMin: 1,
  scaleMax: 10,
  scaleMinLabel: '',
  scaleMaxLabel: '',
  sortOrder: 0,
};

export default function CheckInQuestions() {
  const [questions, setQuestions] = useState<CheckInQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CheckInQuestion | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<CheckInQuestion | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState<QuestionForm>(defaultForm);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await checkinsApi.getAllQuestions();
      if (res.success && Array.isArray(res)) {
        setQuestions(res as unknown as CheckInQuestion[]);
      } else if (Array.isArray(res)) {
        setQuestions(res as unknown as CheckInQuestion[]);
      } else if (res.data) {
        setQuestions(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      text: formData.text,
      type: formData.type,
      category: formData.category,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      sortOrder: formData.sortOrder,
    };

    if (formData.type === 'scale') {
      payload.scaleMin = formData.scaleMin;
      payload.scaleMax = formData.scaleMax;
      payload.scaleMinLabel = formData.scaleMinLabel || null;
      payload.scaleMaxLabel = formData.scaleMaxLabel || null;
    }

    if (formData.type === 'multiple_choice') {
      payload.options = formData.options.split('\n').map((o) => o.trim()).filter(Boolean);
    }

    try {
      if (editingQuestion) {
        const res = await checkinsApi.updateQuestion(editingQuestion.id, payload);
        if (res.success) {
          toast.success('Question updated');
          loadQuestions();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(res.error || 'Failed to update');
        }
      } else {
        const res = await checkinsApi.createQuestion(payload);
        if (res.success) {
          toast.success('Question created');
          loadQuestions();
          setIsDialogOpen(false);
          resetForm();
        } else {
          toast.error(res.error || 'Failed to create');
        }
      }
    } catch (error) {
      toast.error('Failed to save question');
    }
  };

  const handleEdit = (q: CheckInQuestion) => {
    setEditingQuestion(q);
    setFormData({
      text: q.text,
      type: q.type,
      category: q.category,
      tags: q.tags.join(', '),
      options: q.options ? (q.options as string[]).join('\n') : '',
      scaleMin: q.scaleMin ?? 1,
      scaleMax: q.scaleMax ?? 10,
      scaleMinLabel: q.scaleMinLabel ?? '',
      scaleMaxLabel: q.scaleMaxLabel ?? '',
      sortOrder: q.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteQuestion) return;
    try {
      const res = await checkinsApi.deleteQuestion(deleteQuestion.id);
      if (res.success) {
        toast.success('Question deactivated');
        loadQuestions();
      }
    } catch (error) {
      toast.error('Failed to delete question');
    } finally {
      setDeleteQuestion(null);
    }
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingQuestion(null);
  };

  const filteredQuestions = filterCategory === 'all'
    ? questions
    : questions.filter((q) => q.category === filterCategory);

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
          <h1 className="text-3xl font-bold text-slate-900">Check-in Questions</h1>
          <p className="text-slate-600 mt-2">Manage the daily check-in question library</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Create Question'}</DialogTitle>
              <DialogDescription>
                {editingQuestion ? 'Update check-in question' : 'Add a new question to the library'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="How would you rate your mood today?"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as CheckInQuestionType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as CheckInQuestionCategory })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="morning, daily, evening"
                />
              </div>

              {formData.type === 'scale' && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">Scale Configuration</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Min Value</Label>
                      <Input
                        type="number"
                        value={formData.scaleMin}
                        onChange={(e) => setFormData({ ...formData, scaleMin: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Value</Label>
                      <Input
                        type="number"
                        value={formData.scaleMax}
                        onChange={(e) => setFormData({ ...formData, scaleMax: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Min Label</Label>
                      <Input
                        value={formData.scaleMinLabel}
                        onChange={(e) => setFormData({ ...formData, scaleMinLabel: e.target.value })}
                        placeholder="e.g., Not at all"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Label</Label>
                      <Input
                        value={formData.scaleMaxLabel}
                        onChange={(e) => setFormData({ ...formData, scaleMaxLabel: e.target.value })}
                        placeholder="e.g., Extremely"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'multiple_choice' && (
                <div className="space-y-2">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    placeholder={"Happy\nCalm\nNeutral\nSad\nAnxious"}
                    rows={5}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingQuestion ? 'Update' : 'Create'} Question
                </Button>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterCategory('all')}
        >
          All ({questions.length})
        </Button>
        {CATEGORIES.map((cat) => {
          const count = questions.filter((q) => q.category === cat).length;
          if (count === 0) return null;
          return (
            <Button
              key={cat}
              size="sm"
              variant={filterCategory === cat ? 'default' : 'outline'}
              onClick={() => setFilterCategory(cat)}
              className="capitalize"
            >
              {cat} ({count})
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Question Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    No questions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((q) => (
                  <TableRow key={q.id} className={!q.isActive ? 'opacity-50' : ''}>
                    <TableCell className="text-slate-400">{q.sortOrder}</TableCell>
                    <TableCell className="font-medium max-w-xs">
                      {q.text}
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {(q.options as string[]).slice(0, 3).map((opt, i) => (
                            <span key={i} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{opt}</span>
                          ))}
                          {(q.options as string[]).length > 3 && (
                            <span className="text-xs text-slate-400">+{(q.options as string[]).length - 3} more</span>
                          )}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div className="text-xs text-slate-400 mt-1">
                          {q.scaleMin}{q.scaleMinLabel ? ` (${q.scaleMinLabel})` : ''} — {q.scaleMax}{q.scaleMaxLabel ? ` (${q.scaleMaxLabel})` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {q.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${categoryColors[q.category] || ''}`}>
                        {q.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {q.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={q.isActive ? 'default' : 'secondary'}>
                        {q.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteQuestion(q)}>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteQuestion} onOpenChange={() => setDeleteQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the question as inactive. It won't appear in future check-ins
              but existing responses will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
