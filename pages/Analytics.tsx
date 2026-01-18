import React, { useEffect, useState, useCallback } from 'react';
import { generateAIContent, Type } from '../utils/ai';
import { getAssessmentHistory, getAssessmentResults, saveAiInsights, getAiInsights, AiInsightsData } from '../utils/storage';
import { AssessmentHistoryLog, AssessmentResult } from '../types';
import { getPrompt, PromptKey } from '../utils/prompts';

interface AnalyticsProps {
    userId: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ userId }) => {
    const [history, setHistory] = useState<AssessmentHistoryLog[]>([]);
    const [results, setResults] = useState<AssessmentResult[]>([]);
    
    // Derived Metrics
    const [masteryScore, setMasteryScore] = useState(0);
    const [gaps, setGaps] = useState<AssessmentResult[]>([]);
    const [retentionRate, setRetentionRate] = useState(0);
    const [totalStudyTime, setTotalStudyTime] = useState('');

    // AI Insights State
    const [aiInsights, setAiInsights] = useState<AiInsightsData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const h = getAssessmentHistory(userId);
        const r = getAssessmentResults(userId);
        setHistory(h);
        setResults(r);

        // Load cached insights first
        const cached = getAiInsights(userId);
        if (cached) {
            setAiInsights(cached);
        }

        if (r.length > 0) {
            const avg = r.reduce((acc, cur) => acc + cur.score, 0) / r.length;
            setMasteryScore(Math.round(avg));

            const weakNodes = r.filter(i => i.score < 60);
            setGaps(weakNodes);
        }

        if (h.length > 0) {
             const passed = h.filter(l => l.score >= 60).length;
             setRetentionRate(Math.round((passed / h.length) * 100));

             // Estimate study time: 2 mins per question attempted
             const mins = h.length * 2;
             const hours = Math.floor(mins / 60);
             const remainingMins = mins % 60;
             setTotalStudyTime(`${hours}小时 ${remainingMins}分钟`);
        } else {
            setTotalStudyTime('0小时 0分钟');
        }
    }, [userId]);

    const generateInsights = useCallback(async () => {
        if (history.length === 0 || isGenerating) return;

        setIsGenerating(true);
        const totalTests = history.length;
        const avgScore = results.length > 0 ? results.reduce((a,b) => a + b.score, 0) / results.length : 0;
        const weakPoints = results.filter(r => r.score < 60).map(r => r.nodeLabel).join(', ');
        const strongPoints = results.filter(r => r.score >= 85).map(r => r.nodeLabel).join(', ');
        
        const firstTest = history[0]?.timestamp || Date.now();
        const daysSinceStart = Math.max(1, Math.ceil((Date.now() - firstTest) / (1000 * 60 * 60 * 24)));
        const avgPerDay = (totalTests / daysSinceStart).toFixed(1);

        let promptTemplate = getPrompt(PromptKey.ANALYTICS_INSIGHTS);
        promptTemplate = promptTemplate.replace('{{totalTests}}', totalTests.toString());
        promptTemplate = promptTemplate.replace('{{avgPerDay}}', avgPerDay);
        promptTemplate = promptTemplate.replace('{{avgScore}}', Math.round(avgScore).toString());
        promptTemplate = promptTemplate.replace('{{weakPoints}}', weakPoints || "None");
        promptTemplate = promptTemplate.replace('{{strongPoints}}', strongPoints || "None");

        const insightsSchema = {
            type: Type.OBJECT,
            properties: {
                speed: { type: Type.STRING },
                recommendation: { type: Type.STRING }
            },
            required: ['speed', 'recommendation']
        };

        try {
            const text = await generateAIContent(promptTemplate, insightsSchema);

            if (text) {
                const data = JSON.parse(text);
                const newData: AiInsightsData = {
                    speed: data.speed,
                    recommendation: data.recommendation,
                    timestamp: Date.now()
                };
                setAiInsights(newData);
                saveAiInsights(userId, newData);
            }
        } catch (error) {
            console.error("AI Insight generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    }, [history, results, userId, isGenerating]);

    // Initial generation if no cache
    useEffect(() => {
        if (!getAiInsights(userId) && history.length > 0 && !isGenerating) {
            generateInsights();
        }
    }, [userId, history.length, generateInsights, isGenerating]); 

    return (
        <div className="max-w-[1600px] mx-auto p-8 h-screen overflow-y-auto animate-fade-in-up">
           <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
              <div className="flex flex-col gap-1">
                 <h2 className="text-4xl font-black text-slate-900 font-display">学习数据分析</h2>
                 <p className="text-slate-500 font-medium">实时查看您的学习进度概览。</p>
              </div>
              <div className="bg-slate-100 p-2 rounded-lg text-xs font-bold text-slate-400">
                  数据已实时同步
              </div>
           </header>
    
           {/* Top Stats Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-start">
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">预估学习时长</p>
                    <span className="material-symbols-outlined text-primary/50">schedule</span>
                 </div>
                 <p className="text-3xl font-black text-slate-900 mt-2 font-display">{totalStudyTime}</p>
                 <p className="text-xs text-slate-400 font-bold mt-1">基于 {history.length} 次测试记录</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-start">
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">总测试题数</p>
                    <span className="material-symbols-outlined text-primary/50">quiz</span>
                 </div>
                 <p className="text-3xl font-black text-slate-900 mt-2 font-display">{history.length}</p>
                 <p className="text-xs text-emerald-600 font-bold mt-1">{retentionRate}% 成功率</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                 <div className="flex justify-between items-start relative z-10">
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">综合掌握分</p>
                    <span className="material-symbols-outlined text-yellow-500">military_tech</span>
                 </div>
                 <p className="text-3xl font-black text-slate-900 mt-2 relative z-10 font-display">{masteryScore}</p>
                 <p className="text-xs text-slate-400 font-medium mt-1 relative z-10">所有主题的平均分</p>
              </div>
           </div>
    
           <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Column: Mastery & Gaps */}
              <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Mastery Donut */}
                 <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center relative min-h-[340px]">
                    <div className="absolute top-4 left-6">
                       <h3 className="text-lg font-bold text-slate-900">记忆保留率</h3>
                       <p className="text-xs text-slate-500">通过 vs 失败</p>
                    </div>
                    {history.length === 0 ? (
                         <div className="text-slate-400 text-sm">暂无数据</div>
                    ) : (
                        <div className="relative w-48 h-48 mt-8">
                           <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                              <circle 
                                cx="50" cy="50" r="45" fill="none" stroke="#149cb8" strokeWidth="8" 
                                strokeDasharray="283" 
                                strokeDashoffset={283 - (283 * retentionRate / 100)} 
                                strokeLinecap="round" transform="rotate(-90 50 50)" 
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-5xl font-black text-slate-900 tracking-tighter font-display">{retentionRate}<span className="text-2xl text-slate-400">%</span></span>
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1">通过率</span>
                           </div>
                        </div>
                    )}
                 </div>
    
                 {/* Knowledge Gaps List */}
                 <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[340px]">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">知识薄弱点</h3>
                    <p className="text-xs text-slate-500 mb-4">需要重点复习的主题 (&lt;60分)</p>
                    
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                       {gaps.length === 0 ? (
                           <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                               <span className="material-symbols-outlined text-4xl mb-2 opacity-50">check_circle</span>
                               <p className="text-sm">未发现严重漏洞。<br/>继续保持！</p>
                           </div>
                       ) : (
                           gaps.map(gap => (
                               <div key={gap.id} className="p-3 rounded-xl bg-red-50 border border-red-100 flex flex-col gap-2">
                                  <div className="flex justify-between items-start">
                                     <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">得分: {gap.score}</span>
                                     <span className="material-symbols-outlined text-red-400 text-sm">priority_high</span>
                                  </div>
                                  <p className="font-bold text-sm text-slate-900">{gap.nodeLabel}</p>
                                  <div className="w-full bg-red-200 h-1 rounded-full mt-auto">
                                      <div className="bg-red-500 h-1 rounded-full" style={{width: `${gap.score}%`}}></div>
                                  </div>
                               </div>
                           ))
                       )}
                    </div>
                 </div>
    
                 {/* Recent History Table */}
                 <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">近期活动</h3>
                    {history.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">暂无活动记录。</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">主题</th>
                                        <th className="px-4 py-3 font-bold">日期</th>
                                        <th className="px-4 py-3 font-bold">得分</th>
                                        <th className="px-4 py-3 font-bold">结果</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.slice().reverse().slice(0, 5).map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-medium text-slate-900">{log.nodeLabel}</td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700">{log.score}</td>
                                            <td className="px-4 py-3">
                                                {log.score >= 60 ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                        通过
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                                        失败
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                 </div>
              </div>
    
              {/* Right Column: AI Insights */}
              <div className="xl:col-span-4 flex flex-col gap-6">
                 <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white h-full flex flex-col relative overflow-hidden group">
                    <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
                    
                    {/* Glowing effect */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>

                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <span className="material-symbols-outlined">smart_toy</span>
                                <h3 className="text-lg font-bold">AI 学习建议</h3>
                            </div>
                            <button 
                                onClick={generateInsights} 
                                disabled={isGenerating || history.length === 0}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="更新建议"
                            >
                                <span className={`material-symbols-outlined text-lg ${isGenerating ? 'animate-spin' : ''}`}>refresh</span>
                            </button>
                        </div>
                        
                        {history.length === 0 ? (
                             <div className="flex flex-col items-center justify-center flex-1 text-center opacity-60">
                                <span className="material-symbols-outlined text-4xl mb-2">analytics</span>
                                <p className="text-sm">开始测试以获取 AI 分析</p>
                             </div>
                        ) : !aiInsights && isGenerating ? (
                             <div className="flex flex-col gap-6 flex-1 animate-pulse">
                                <div>
                                    <div className="h-5 bg-white/10 rounded w-1/3 mb-2"></div>
                                    <div className="h-4 bg-white/5 rounded w-full mb-1"></div>
                                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                                </div>
                                <hr className="border-white/10" />
                                <div>
                                    <div className="h-5 bg-white/10 rounded w-1/3 mb-2"></div>
                                    <div className="h-4 bg-white/5 rounded w-full mb-1"></div>
                                    <div className="h-4 bg-white/5 rounded w-2/3"></div>
                                </div>
                                <div className="mt-auto text-xs text-center text-emerald-400/80 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                    AI 正在分析您的学习数据...
                                </div>
                             </div>
                        ) : aiInsights ? (
                            <div className="space-y-6 animate-fade-in-up">
                                <div>
                                    <h4 className="font-display font-bold text-lg mb-2 text-emerald-100 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm opacity-70">speed</span> 
                                        学习速度
                                    </h4>
                                    <p className="text-slate-300 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                                        {aiInsights.speed}
                                    </p>
                                </div>

                                <hr className="border-white/10" />

                                <div>
                                    <h4 className="font-display font-bold text-lg mb-2 text-emerald-100 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm opacity-70">recommend</span>
                                        重点推荐
                                    </h4>
                                    <p className="text-slate-300 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                                        {aiInsights.recommendation}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4 text-[10px] text-slate-500 text-right flex items-center justify-end gap-1">
                                    {isGenerating ? '更新中...' : `上次更新: ${new Date(aiInsights.timestamp).toLocaleString()}`}
                                </div>
                            </div>
                        ) : null}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      );
};