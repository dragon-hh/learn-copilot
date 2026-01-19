import React, { useState, useEffect, useCallback } from 'react';
import { generateAIContent, Type } from '../utils/ai';
import { AssessmentContextType } from '../App';
import { getUserData, saveAssessmentResult, saveAssessmentHistory, calculateSRS, getAssessmentResults, getAssessmentHistory } from '../utils/storage';
import { syncAssessmentResults, syncAssessmentHistory } from '../utils/server-sync';
import { KnowledgeBase, AssessmentHistoryLog } from '../types';
import { getPrompt, PromptKey } from '../utils/prompts';

interface AssessmentProps {
    userId: string;
    context: AssessmentContextType | null;
    onNextNode: (kbId: string, nodeId: string, nodeLabel: string) => void;
}

// Sub-component for Score Display
const ScoreCard: React.FC<{ score: number }> = ({ score }) => {
    let colorClass = 'text-red-600 bg-red-50 border-red-100';
    let label = '需加强';
    
    if (score >= 85) {
        colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
        label = '已精通';
    } else if (score >= 60) {
        colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-100';
        label = '及格';
    }

    return (
        <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 ${colorClass} min-w-[120px]`}>
            <span className="text-4xl font-black font-display mb-1">{score}</span>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
        </div>
    );
};

export const Assessment: React.FC<AssessmentProps> = ({ userId, context, onNextNode }) => {
    // Mode: 'active' (taking test), 'list' (history), 'detail' (viewing history)
    const [viewMode, setViewMode] = useState<'active' | 'list' | 'detail'>('list');
    
    // Active Assessment State
    const [isLoading, setIsLoading] = useState(false);
    const [question, setQuestion] = useState<string | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [grade, setGrade] = useState<{score: number, feedback: string} | null>(null);
    const [kb, setKb] = useState<KnowledgeBase | null>(null);
    const [nextNode, setNextNode] = useState<{id: string, label: string} | null>(null);

    // History List State
    const [historyList, setHistoryList] = useState<AssessmentHistoryLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<AssessmentHistoryLog | null>(null);

    // --- EFFECT: Handle Context Switching ---
    useEffect(() => {
        if (context) {
            setViewMode('active');
            loadAndGenerate();
        } else {
            setViewMode('list');
            setHistoryList(getAssessmentHistory(userId).reverse()); // Newest first
        }
    }, [context, userId]);

    // --- LOGIC: Active Assessment ---
    const loadAndGenerate = useCallback(async () => {
        if (!context) return;
        
        setIsLoading(true);
        // Reset state for new question
        setGrade(null);
        setUserAnswer('');
        setQuestion(null);
        setNextNode(null);

        const data = getUserData(userId);
        const foundKb = data.find(b => b.id === context.kbId);
        setKb(foundKb || null);

        if (foundKb) {
            // Calculate Next Node logic
            if (foundKb.learningPath && foundKb.graphData) {
                const orderedNodeIds: string[] = [];
                foundKb.learningPath.modules.forEach(m => {
                    orderedNodeIds.push(...m.nodeIds);
                });

                const currentIndex = orderedNodeIds.indexOf(context.nodeId);
                if (currentIndex !== -1 && currentIndex < orderedNodeIds.length - 1) {
                    const nextId = orderedNodeIds[currentIndex + 1];
                    const nextNodeData = foundKb.graphData.nodes.find(n => n.id === nextId);
                    if (nextNodeData) {
                        setNextNode({ id: nextNodeData.id, label: nextNodeData.label });
                    }
                }
            }
            
            await generateQuestion(foundKb, context.nodeLabel);
        }
        setIsLoading(false);
    }, [context, userId]);

    const generateQuestion = async (base: KnowledgeBase, topic: string) => {
        const contextText = base.files.map(f => f.content).join('\n').substring(0, 20000);
        let promptTemplate = getPrompt(PromptKey.GENERATE_QUESTION);
        promptTemplate = promptTemplate.replace('{{topic}}', topic);
        promptTemplate = promptTemplate.replace('{{context}}', contextText);

        try {
            const text = await generateAIContent(promptTemplate);
            if (text) {
                setQuestion(text);
            }
        } catch (e: any) {
            console.error(e);
            // Show the actual error message from utils/ai.ts
            setQuestion(`生成问题失败: ${e.message || "未知错误"}`);
        }
    };

    const handleSubmit = async () => {
        if (!question || !userAnswer || !context || !kb) return;
        setIsLoading(true);

        const contextText = kb.files.map(f => f.content).join('\n').substring(0, 20000);
        let promptTemplate = getPrompt(PromptKey.EVALUATE_ANSWER);
        promptTemplate = promptTemplate.replace('{{context}}', contextText);
        promptTemplate = promptTemplate.replace('{{question}}', question);
        promptTemplate = promptTemplate.replace('{{userAnswer}}', userAnswer);

        const gradingSchema = {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.NUMBER, description: "Score from 0 to 100" },
                feedback: { type: Type.STRING, description: "Constructive feedback in Chinese explaining what was right or wrong." }
            },
            required: ['score', 'feedback']
        };

        try {
            const text = await generateAIContent(promptTemplate, gradingSchema);

            if (text) {
                let rawResult = JSON.parse(text);
                
                // --- ROBUST PARSING LOGIC START ---
                // 1. Handle nested structures (DeepSeek often returns { evaluation: { ... } })
                let parsedData = rawResult;
                if (rawResult.evaluation) {
                    parsedData = rawResult.evaluation;
                } else if (rawResult.result) {
                    parsedData = rawResult.result;
                }

                // 2. Extract fields (handle case sensitivity)
                let score = parsedData.score ?? parsedData.Score ?? 0;
                const feedback = parsedData.feedback ?? parsedData.Feedback ?? parsedData.reason ?? "AI 未提供详细反馈";

                // 3. Normalize Score (Handle 10-point scale vs 100-point scale)
                // If score is <= 10 (and not 0), assume it's a 10-point scale and convert to 100.
                if (typeof score === 'string') score = parseFloat(score);
                if (score <= 10 && score > 0) {
                    score = score * 10;
                }
                // Cap at 100 just in case
                if (score > 100) score = 100;
                
                // --- ROBUST PARSING LOGIC END ---

                const result = { score, feedback };
                setGrade(result);

                // Save Logic
                const prevResults = getAssessmentResults(userId);
                const prevResult = prevResults.find(r => r.nodeId === context.nodeId);
                const srsData = calculateSRS(prevResult, result.score);

                const assessmentResult = {
                    id: Date.now().toString(),
                    kbId: context.kbId,
                    nodeId: context.nodeId,
                    nodeLabel: context.nodeLabel,
                    score: result.score,
                    feedback: result.feedback,
                    timestamp: Date.now(),
                    ...srsData
                };

                const historyLog = {
                    id: Date.now().toString(),
                    userId: userId,
                    kbId: context.kbId,
                    nodeId: context.nodeId,
                    nodeLabel: context.nodeLabel,
                    question: question,
                    userAnswer: userAnswer,
                    score: result.score,
                    feedback: result.feedback,
                    timestamp: Date.now()
                };

                // Save to localStorage
                saveAssessmentResult(userId, assessmentResult);
                saveAssessmentHistory(userId, historyLog);

                // Sync to server asynchronously
                const allResults = getAssessmentResults(userId);
                const allHistory = getAssessmentHistory(userId);
                await syncAssessmentResults(userId, allResults);
                await syncAssessmentHistory(userId, allHistory);
            }
        } catch (e: any) {
            console.error(e);
            alert(`评分失败: ${e.message || "请检查模型配置或网络"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTryAgain = () => {
        setGrade(null);
        setUserAnswer('');
        setQuestion(null);
        if (kb && context) {
            setIsLoading(true);
            generateQuestion(kb, context.nodeLabel).then(() => setIsLoading(false));
        }
    };

    // --- VIEW: History List ---
    if (viewMode === 'list') {
        return (
            <div className="max-w-5xl mx-auto p-8 animate-fade-in-up h-screen overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 font-display">智能测试记录</h1>
                    <p className="text-slate-500 mt-2">查看您的过往测试详情和 AI 反馈。</p>
                </header>

                {historyList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">history_edu</span>
                        <h3 className="text-lg font-bold text-slate-900">暂无测试记录</h3>
                        <p className="text-slate-500 text-sm mt-1">请从“知识图谱”或“学习路径”开始新的测试。</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {historyList.map(log => (
                            <div 
                                key={log.id} 
                                onClick={() => { setSelectedLog(log); setViewMode('detail'); }}
                                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group flex items-center justify-between"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{log.nodeLabel}</span>
                                    </div>
                                    <p className="text-slate-800 font-medium line-clamp-1">{log.question}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`text-lg font-black font-display ${log.score >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {log.score}分
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- VIEW: Detail Log ---
    if (viewMode === 'detail' && selectedLog) {
        return (
            <div className="max-w-4xl mx-auto p-8 animate-fade-in-up h-screen overflow-y-auto">
                <button 
                    onClick={() => setViewMode('list')}
                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span> 返回列表
                </button>
                
                <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">测试主题</span>
                            <h1 className="text-2xl font-black text-slate-900 mt-1">{selectedLog.nodeLabel}</h1>
                            <p className="text-xs text-slate-400 mt-2">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                        </div>
                        <ScoreCard score={selectedLog.score} />
                    </div>
                    
                    <div className="p-8 flex flex-col gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">psychology</span> AI 提问
                            </h3>
                            <div className="text-lg font-bold text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {selectedLog.question}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">edit_note</span> 您的回答
                            </h3>
                            <div className="text-slate-700 leading-relaxed p-4 rounded-xl border border-slate-200 bg-white">
                                {selectedLog.userAnswer}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">reviews</span> AI 详细反馈
                            </h3>
                            <div className="text-slate-700 leading-relaxed p-6 rounded-xl bg-primary/5 border border-primary/10">
                                {selectedLog.feedback}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: Active Assessment (Taking a test) ---
    if (!context) return null; // Should be handled by effect, but safeguard

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-fade-in-up">
           <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                   <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-primary">主动回忆测试</h2>
                      <h1 className="text-lg font-bold leading-tight text-slate-900">{context.nodeLabel}</h1>
                   </div>
                   {grade && (
                       <div className="text-sm font-bold text-slate-500">
                           {grade.score >= 60 ? '测试通过' : '未通过'}
                       </div>
                   )}
              </div>
           </header>
    
           <main className="flex-grow w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-6">
                 {/* Question Card */}
                 <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm flex gap-5 items-start">
                    <div className="flex-shrink-0 size-12 rounded-full bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center text-white shadow-lg">
                       <span className="material-symbols-outlined text-2xl">psychology_alt</span>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                       <span className="text-xs font-bold uppercase tracking-wider text-slate-400">AI 考官提问:</span>
                       {isLoading && !question ? (
                           <div className="animate-pulse flex flex-col gap-2 w-full">
                               <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                               <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                           </div>
                       ) : (
                           <p className="text-xl font-bold text-slate-800 leading-snug">{question}</p>
                       )}
                    </div>
                 </div>
    
                 {/* Input / Result Area */}
                 {!grade ? (
                     <div className="flex flex-col flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                        <textarea 
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={isLoading}
                            className="w-full flex-grow min-h-[250px] p-6 bg-transparent border-none text-lg text-slate-800 placeholder:text-slate-400 focus:ring-0 resize-none leading-relaxed" 
                            placeholder="请在此输入您的答案..."
                        ></textarea>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center">
                           <button 
                                onClick={handleSubmit}
                                disabled={isLoading || !userAnswer}
                                className={`px-8 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all 
                                ${isLoading || !userAnswer ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'}`}
                           >
                              {isLoading ? '评分中...' : '提交答案'} <span className="material-symbols-outlined">send</span>
                           </button>
                        </div>
                     </div>
                 ) : (
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
                         <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                             <div>
                                 <h3 className={`text-xl font-bold mb-1 ${grade.score >= 60 ? 'text-emerald-800' : 'text-red-800'}`}>
                                     {grade.score >= 60 ? '恭喜，挑战成功！' : '很遗憾，未能通过'}
                                 </h3>
                                 <p className="text-sm text-slate-500">查看下方的 AI 反馈以改进。</p>
                             </div>
                             <ScoreCard score={grade.score} />
                         </div>
                         
                         <div className="p-8">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">AI 详细反馈</h4>
                            <p className="text-slate-700 leading-relaxed p-4 bg-primary/5 rounded-xl border border-primary/10 mb-8">
                                {grade.feedback}
                            </p>

                            <div className="flex flex-wrap gap-4 justify-end">
                                 <button 
                                    onClick={handleTryAgain}
                                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-primary hover:border-primary transition-colors flex items-center gap-2"
                                 >
                                     <span className="material-symbols-outlined">refresh</span> 再试一次
                                 </button>
                                 
                                 {nextNode ? (
                                     <button 
                                         onClick={() => onNextNode(context.kbId, nextNode.id, nextNode.label)}
                                         className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                                     >
                                         下一个知识点: {nextNode.label} <span className="material-symbols-outlined">arrow_forward</span>
                                     </button>
                                 ) : (
                                     <button 
                                        onClick={() => setViewMode('list')}
                                        className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2"
                                     >
                                         完成 <span className="material-symbols-outlined">check</span>
                                     </button>
                                 )}
                            </div>
                         </div>
                     </div>
                 )}
           </main>
        </div>
      );
};