import React, { useEffect, useState } from 'react';
import { getAssessmentResults } from '../utils/storage';
import { AssessmentResult } from '../types';

interface PracticeProps {
    userId: string;
    onStartAssessment: (kbId: string, nodeId: string, nodeLabel: string) => void;
}

export const Practice: React.FC<PracticeProps> = ({ userId, onStartAssessment }) => {
    const [dueItems, setDueItems] = useState<AssessmentResult[]>([]);
    const [mastery, setMastery] = useState(0);

    useEffect(() => {
        const results = getAssessmentResults(userId);
        const now = Date.now();
        
        // Filter due items (Next review date is in the past or now)
        const due = results.filter(r => r.nextReviewDate <= now);
        setDueItems(due);

        // Calculate simple mastery (avg of scores)
        if (results.length > 0) {
            const avg = results.reduce((acc, curr) => acc + curr.score, 0) / results.length;
            setMastery(Math.round(avg));
        }
    }, [userId]);

    return (
        <div className="max-w-6xl mx-auto p-8 h-screen overflow-y-auto animate-fade-in-up">
          <header className="flex justify-between items-end pb-6 border-b border-slate-200 mb-8">
             <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black text-slate-900 font-display">复习与巩固</h1>
                <p className="text-slate-500">攻克薄弱环节，通过间隔重复保持记忆。</p>
             </div>
             <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                 <div className="px-4 border-r border-slate-100 text-center">
                     <span className="text-xs font-bold text-slate-400 uppercase">待复习</span>
                     <div className="flex items-center gap-1"><span className="text-2xl font-bold text-primary font-display">{dueItems.length}</span></div>
                 </div>
                 <div className="px-4 text-center">
                     <span className="text-xs font-bold text-slate-400 uppercase">掌握度</span>
                     <div className="flex items-center gap-1"><span className="text-2xl font-bold text-emerald-500 font-display">{mastery}%</span></div>
                 </div>
             </div>
          </header>
    
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Due Items Section */}
             <div className="lg:col-span-12 flex flex-col gap-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 font-display">
                   <span className="material-symbols-outlined text-primary">calendar_month</span> 
                   {dueItems.length > 0 ? "待复习内容" : "已全部完成！"}
                </h2>
                
                {dueItems.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-12 text-center text-emerald-800">
                        <span className="material-symbols-outlined text-6xl mb-4">check_circle</span>
                        <h3 className="text-2xl font-bold mb-2">太棒了，你已完成所有任务！</h3>
                        <p>目前没有需要复习的卡片。稍后再来，或开始新的学习路径。</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dueItems.map(item => (
                            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded ${item.score < 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                            上次得分: {item.score}
                                        </span>
                                        <span className="material-symbols-outlined text-amber-500">priority_high</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">{item.nodeLabel}</h3>
                                    <p className="text-xs text-slate-400">
                                        复习次数: {item.repetition}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={() => onStartAssessment(item.kbId, item.nodeId, item.nodeLabel)}
                                    className="mt-auto w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
                                >
                                    <span className="material-symbols-outlined">quiz</span>
                                    立即复习
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
        </div>
    );
};