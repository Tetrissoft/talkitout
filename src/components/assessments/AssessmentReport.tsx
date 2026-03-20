import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AssessmentResult {
    title: string;
    summary: string;
    severity: string;
    recommendations: string[];
    score?: number;
    disclaimer?: string;
}

interface AssessmentReportProps {
    report: AssessmentResult;
    participantName: string;
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({ report, participantName }) => {
    const isHighSeverity = report.severity.toLowerCase().includes('high') || report.severity.toLowerCase().includes('severe');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
        >
            <div className={`p-8 text-white text-center ${isHighSeverity ? 'bg-orange-500' : 'bg-primary'}`}>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"
                >
                    <BrainCircuit size={40} />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">{report.title}</h2>
                <p className="text-white/80">Prepared for {participantName}</p>
            </div>

            <div className="p-8 space-y-8">
                <div>
                    <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-100 font-semibold text-lg">
                        <Info className="text-primary" />
                        <h3>Summary</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {report.summary}
                    </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Indications</h3>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${isHighSeverity
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                            }`}>
                            {report.severity}
                        </span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100 font-semibold text-lg">
                        <AlertCircle className="text-primary" />
                        <h3>Recommendations</h3>
                    </div>
                    <ul className="space-y-3">
                        {report.recommendations.map((rec, idx) => (
                            <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                className="flex gap-3 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl"
                            >
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold">{idx + 1}</span>
                                </div>
                                <span>{rec}</span>
                            </motion.li>
                        ))}
                    </ul>
                </div>

                {report.disclaimer && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 text-center italic mt-8">
                        * {report.disclaimer}
                    </div>
                )}

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                    <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transition-all" asChild>
                        <a href="https://calendly.com/talkitoutt24" target="_blank" rel="noopener noreferrer">
                            Book a Free Consultation <ArrowRight className="ml-2" />
                        </a>
                    </Button>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        Discuss your results with a licensed psychologist at no cost.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
