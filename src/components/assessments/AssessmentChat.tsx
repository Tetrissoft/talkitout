import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Loader2 } from 'lucide-react';

export interface ChatMessage {
    id: string;
    sender: 'bot' | 'user';
    text: string;
    type?: 'text' | 'options';
    options?: string[];
}

interface AssessmentChatProps {
    messages: ChatMessage[];
    isTyping: boolean;
    onSendMessage: (text: string) => void;
    onSelectOption: (option: string) => void;
    showInput: boolean;
}

export const AssessmentChat: React.FC<AssessmentChatProps> = ({
    messages,
    isTyping,
    onSendMessage,
    onSelectOption,
    showInput,
}) => {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="bg-primary/5 border-b border-primary/10 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">TalkItOut Assistant</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Mental Wellness Assessment</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence initial={false}>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 
                  ${message.sender === 'user' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-primary'}`}>
                                    {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className={`p-3 rounded-2xl ${message.sender === 'user'
                                            ? 'bg-primary text-white rounded-tr-none'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                        }`}>
                                        {message.text}
                                    </div>

                                    {/* Options if it's a multiple choice question */}
                                    {message.sender === 'bot' && message.type === 'options' && message.options && (
                                        <div className="flex flex-col gap-2 mt-2">
                                            {message.options.map((option, idx) => (
                                                <motion.button
                                                    key={idx}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => onSelectOption(option)}
                                                    className="text-left px-4 py-3 rounded-xl bg-white dark:bg-slate-700 border border-primary/20 
                                     hover:bg-primary/5 dark:hover:bg-slate-600 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                                                >
                                                    {option}
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="flex gap-3 max-w-[85%] flex-row">
                                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-slate-100 dark:bg-slate-800 text-primary">
                                    <Bot size={16} />
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 rounded-tl-none flex items-center gap-1">
                                    <motion.div className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                                    <motion.div className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                                    <motion.div className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {showInput && (
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-6 py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-800 dark:text-slate-200"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="absolute right-2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} className="ml-1" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
