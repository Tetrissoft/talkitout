import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AssessmentChat, ChatMessage } from '@/components/assessments/AssessmentChat';
import { AssessmentReport, AssessmentResult } from '@/components/assessments/AssessmentReport';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { config } from '@/lib/config';

const mockQuestions = [
    { id: 'q1', text: "Welcome to the Anxiety Assessment. What is your full name?", type: 'text' },
    { id: 'q2', text: "Nice to meet you. What is your email address so we can link your results?", type: 'text' },
    {
        id: 'q3',
        text: "Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious or on edge?",
        type: 'options',
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"]
    },
    {
        id: 'q4',
        text: "How often have you been bothered by not being able to stop or control worrying?",
        type: 'options',
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"]
    },
    {
        id: 'q5',
        text: "Lastly, can you describe in a short sentence what makes you feel the most anxious recently?",
        type: 'text'
    }
];

export default function AssessmentPlugin() {
    const { testId } = useParams();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isTyping, setIsTyping] = useState(true);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [userData, setUserData] = useState({ name: '', email: '' });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [report, setReport] = useState<AssessmentResult | null>(null);

    useEffect(() => {
        // Initial greeting
        setTimeout(() => {
            setMessages([{ id: Date.now().toString(), sender: 'bot', text: mockQuestions[0].text }]);
            setIsTyping(false);
        }, 1000);
    }, []);

    const handleNextQuestion = (userAnswer: string) => {
        const question = mockQuestions[currentStep];
        const newAnswers = { ...answers, [question.id]: userAnswer };
        setAnswers(newAnswers);

        // Save user basic info from first two questions
        if (currentStep === 0) setUserData(prev => ({ ...prev, name: userAnswer }));
        if (currentStep === 1) setUserData(prev => ({ ...prev, email: userAnswer }));

        setIsTyping(true);

        if (currentStep < mockQuestions.length - 1) {
            setTimeout(() => {
                const nextQ = mockQuestions[currentStep + 1];
                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        sender: 'bot',
                        text: nextQ.text,
                        type: nextQ.type as 'text' | 'options',
                        options: nextQ.options
                    }
                ]);
                setIsTyping(false);
                setCurrentStep(prev => prev + 1);
            }, 1500);
        } else {
            // Finished
            submitAssessment(newAnswers);
        }
    };

    const submitAssessment = async (finalAnswers: Record<string, string>) => {
        setIsSubmitting(true);
        setMessages(prev => [
            ...prev,
            { id: Date.now().toString(), sender: 'bot', text: "Thank you. I'm analyzing your responses using our AI now..." }
        ]);

        try {
            const response = await fetch(`${config.apiUrl}/assessments/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participant: userData,
                    testType: testId || 'anxiety_test',
                    answers: finalAnswers
                })
            });

            const data = await response.json();

            setIsSubmitting(false);
            setIsTyping(false);

            if (data.report) {
                setReport(data.report);
            }
        } catch (error) {
            console.error("Failed to submit assessment", error);
            setIsSubmitting(false);
            setIsTyping(false);
            // Fallback
            setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: "Sorry, there was an error analyzing your results." }]);
        }
    };

    const handleUserAction = (text: string) => {
        if (isTyping || isSubmitting) return;

        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text }]);
        handleNextQuestion(text);
    };

    if (report) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center font-sans">
                <AssessmentReport report={report} participantName={userData.name} />
            </div>
        );
    }

    const currentQ = mockQuestions[currentStep];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 sm:p-8 flex items-center justify-center font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg h-[100dvh] sm:h-[80vh] flex flex-col shadow-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-none sm:border border-slate-200 dark:border-slate-800"
            >
                <AssessmentChat
                    messages={messages}
                    isTyping={isTyping || isSubmitting}
                    onSendMessage={handleUserAction}
                    onSelectOption={handleUserAction}
                    showInput={!isTyping && !isSubmitting && currentQ?.type !== 'options'}
                />
            </motion.div>
        </div>
    );
}
