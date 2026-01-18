import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AssessmentContextType } from '../App';
import { getUserData, saveAssessmentResult, saveAssessmentHistory, calculateSRS, getAssessmentResults } from '../utils/storage';
import { KnowledgeBase } from '../types';

interface AssessmentProps {
    userId: string;
    context: AssessmentContextType | null;
    onNextNode: (kbId: string, nodeId: string, nodeLabel: string) => void;
}

export const Assessment: React.FC<AssessmentProps> = ({ userId, context, onNextNode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [question, setQuestion] = useState<string | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [grade, setGrade] = useState<{score: number, feedback: string} | null>(null);
    const [kb, setKb] = useState<KnowledgeBase | null>(null);
    const [nextNode, setNextNode] = useState<{id: string, label: string} | null>(null);

    // Initial Load & Generation logic wrapped in useCallback
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
                // Flatten all nodes in the path modules in order
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

    // Effect to trigger load on context change
    useEffect(() => {
        loadAndGenerate();
    }, [loadAndGenerate]);

    const generateQuestion = async (base: KnowledgeBase, topic: string) => {
        // Concatenate first 20k chars of content for context
        const contextText = base.files.map(f => f.content).join('\n').substring(0, 20000);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Generate a single, specific active recall question about the concept "${topic}" based on the text below. 
                Do not provide the answer. Make it thought-provoking.
                IMPORTANT: Generate the question in Chinese (Simplified).
                
                Context:
                ${contextText}`
            });
            
            if (response.text) {
                setQuestion(response.text);
            }
        } catch (e) {
            console.error(e);
            setQuestion("生成问题失败，请检查 API Key 或网络连接。");
        }
    };

    const handleSubmit = async () => {
        if (!question || !userAnswer || !context || !kb) return;
        setIsLoading(true);

        const contextText = kb.files.map(f => f.content).join('\n').substring(0, 20000);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Evaluate the user's answer to the question based on the provided context.
                IMPORTANT: Provide the feedback in Chinese (Simplified).
                
                Context: ${contextText}
                Question: ${question}
                User Answer: ${userAnswer}
                `,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER, description: "Score from 0 to 100" },
                            feedback: { type: Type.STRING, description: "Constructive feedback in Chinese explaining what was right or wrong." }
                        },
                        required: ['score', 'feedback']
                    }
                }
            });

            if (response.text) {
                const result = JSON.parse(response.text);
                setGrade(result);

                // 1. Calculate SRS Logic
                const prevResults = getAssessmentResults(userId);
                const prevResult = prevResults.find(r => r.nodeId === context.nodeId);
                const srsData = calculateSRS(prevResult, result.score);

                // 2. Save Current SRS State (for Practice queue)
                saveAssessmentResult(userId, {
                    id: Date.now().toString(),
                    kbId: context.kbId,
                    nodeId: context.nodeId,
                    nodeLabel: context.nodeLabel,
                    score: result.score,
                    feedback: result.feedback,
                    timestamp: Date.now(),
                    ...srsData
                });

                // 3. Save Persistent History Log (for Audit/Analytics)
                saveAssessmentHistory(userId, {
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
                });
            }
        } catch (e) {
            console.error(e);
            alert("评分失败。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTryAgain = () => {
        // Reset local state to allow re-taking without page reload
        setGrade(null);
        setUserAnswer('');
        setQuestion(null);
        // Re-trigger generation
        if (kb && context) {
            setIsLoading(true);
            generateQuestion(kb, context.nodeLabel).then(() => setIsLoading(false));
        }
    };

    const handleNext = () => {
        if (context && nextNode) {
            onNextNode(context.kbId, nextNode.id, nextNode.label);
        }
    };

    if (!context) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-slate-400 animate-fade-in-up">
                <span className="material-symbols-outlined text-4xl mb-2">quiz</span>
                <p>请从图谱或学习路径中选择一个节点开始测试。</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-fade-in-up">
           <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                   <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-primary">主动回忆测试</h2>
                      <h1 className="text-lg font-bold leading-tight text-slate-900">{context.nodeLabel}</h1>
                   </div>
                   {grade && (
                       <div className={`px-4 py-1 rounded-full text-sm font-bold ${grade.score >= 85 ? 'bg-amber-100 text-amber-700 border border-amber-200' : grade.score >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                           {grade.score >= 85 ? '已掌握!' : '得分: ' + grade.score}
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
    
                 {/* Input / Feedback Area */}
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
                     <div className={`rounded-2xl border p-8 shadow-sm ${grade.score >= 60 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                         <h3 className={`text-lg font-bold mb-2 ${grade.score >= 60 ? 'text-emerald-800' : 'text-red-800'}`}>
                             {grade.score >= 60 ? '做得不错！' : '仍需努力'}
                         </h3>
                         <p className="text-slate-700 leading-relaxed">{grade.feedback}</p>
                         <div className="mt-6 flex flex-wrap gap-4">
                             <button 
                                onClick={handleTryAgain}
                                className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-primary hover:border-primary transition-colors flex items-center gap-2"
                             >
                                 <span className="material-symbols-outlined">refresh</span> 再试一次
                             </button>
                             
                             {nextNode && (
                                 <button 
                                     onClick={handleNext}
                                     className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 ml-auto"
                                 >
                                     下一个知识点: {nextNode.label} <span className="material-symbols-outlined">arrow_forward</span>
                                 </button>
                             )}
                         </div>
                     </div>
                 )}
           </main>
        </div>
      );
};