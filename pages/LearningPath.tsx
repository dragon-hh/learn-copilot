import React, { useState, useEffect } from 'react';
import { generateAIContent, Type } from '../utils/ai';
import { KnowledgeBase, LearningPathData, AssessmentResult } from '../types';
import { getUserData, saveUserData, getAssessmentResults } from '../utils/storage';
import { fetchUserData, syncUserData } from '../utils/server-sync';
import { getPrompt, PromptKey } from '../utils/prompts';

interface LearningPathProps {
    userId: string;
    onStartAssessment: (kbId: string, nodeId: string, nodeLabel: string) => void;
}

export const LearningPath: React.FC<LearningPathProps> = ({ userId, onStartAssessment }) => {
    const [bases, setBases] = useState<KnowledgeBase[]>([]);
    const [selectedBase, setSelectedBase] = useState<KnowledgeBase | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userResults, setUserResults] = useState<AssessmentResult[]>([]);

    useEffect(() => {
        const load = async () => {
            // Try to load from server first
            const serverData = await fetchUserData(userId);
            const data = serverData ? serverData : getUserData(userId);
            setBases(data.filter(b => b.graphData));
            setUserResults(getAssessmentResults(userId));
        };
        load();
    }, [userId]);

    const getMasteryStatus = (nodeId: string) => {
        const result = userResults.find(r => r.nodeId === nodeId);
        if (!result) return 'none';
        if (result.score >= 85) return 'mastered';
        if (result.score >= 60) return 'passing';
        return 'failed';
    };

    // Helper to check if a specific node is passed (>= 60)
    const isNodePassed = (nodeId: string) => {
        const status = getMasteryStatus(nodeId);
        return status === 'mastered' || status === 'passing';
    };

    const handleGeneratePath = async () => {
        if (!selectedBase || !selectedBase.graphData) return;
        setIsGenerating(true);

        const nodesList = selectedBase.graphData.nodes.map(n => `${n.id}: ${n.label} (${n.type})`).join('\n');
        let promptTemplate = getPrompt(PromptKey.GENERATE_PATH);
        promptTemplate = promptTemplate.replace('{{nodes}}', nodesList);

        const pathSchema = {
            type: Type.OBJECT,
            properties: {
                modules: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING, description: "Module title in Chinese" },
                            description: { type: Type.STRING, description: "Module description in Chinese" },
                            nodeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                            status: { type: Type.STRING, enum: ['locked', 'active', 'completed'] }
                        },
                        required: ['id', 'title', 'nodeIds']
                    }
                }
            },
            required: ['modules']
        };

        try {
            const text = await generateAIContent(promptTemplate, pathSchema);

            if (text) {
                const pathData = JSON.parse(text) as LearningPathData;
                
                // Initial status is just a placeholder, real status is calculated dynamically
                if(pathData.modules.length > 0) pathData.modules[0].status = 'active';

                const updatedBase = { ...selectedBase, learningPath: pathData };
                const allBases = getUserData(userId);
                const updatedBases = allBases.map(b => b.id === updatedBase.id ? updatedBase : b);
                
                saveUserData(userId, updatedBases);
                // Sync to server
                await syncUserData(userId, updatedBases);
                setBases(updatedBases.filter(b => b.graphData));
                setSelectedBase(updatedBase);
            }
        } catch (error) {
            console.error("Path generation failed", error);
            alert("生成路径失败，请检查模型配置。");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Empty State ---
    if (bases.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 text-center animate-fade-in-up">
                <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <span className="material-symbols-outlined text-4xl">alt_route</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">暂无学习路径</h2>
                <p className="text-slate-500 mt-2 max-w-md">请先在“知识库”中创建知识库并生成图谱，然后再回来构建课程。</p>
            </div>
        );
    }

    // --- Selection View ---
    if (!selectedBase) {
        return (
            <div className="max-w-7xl mx-auto p-8 animate-fade-in-up">
                <header className="mb-10">
                    <h2 className="text-3xl font-black text-slate-900 font-display">学习路径</h2>
                    <p className="text-slate-500 mt-2">选择一个主题以查看您的个性化课程。</p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {bases.map(base => (
                        <div 
                            key={base.id}
                            onClick={() => setSelectedBase(base)}
                            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-primary hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">{base.tag}</span>
                                {base.learningPath && <span className="text-emerald-500 material-symbols-outlined">check_circle</span>}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">{base.title}</h3>
                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{base.description}</p>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-slate-400">
                                {base.learningPath ? '继续学习' : '生成路径'} 
                                <span className="material-symbols-outlined text-sm ml-auto">arrow_forward</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- Path View ---
    const path = selectedBase.learningPath;

    // Calculate Active Module Index Dynamically
    let activeModuleIndex = 0;
    if (path) {
        for (let i = 0; i < path.modules.length; i++) {
            const mod = path.modules[i];
            const allPassed = mod.nodeIds.every(id => isNodePassed(id));
            if (allPassed) {
                // If current module is fully passed, the active one is the NEXT one
                activeModuleIndex = i + 1;
            } else {
                // If current module is NOT fully passed, THIS is the active one.
                // Stop checking subsequent modules.
                activeModuleIndex = i;
                break;
            }
        }
    }

    if (!path) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 animate-fade-in-up">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedBase.title}</h2>
                <p className="text-slate-500 mb-8">准备好构建您的学习计划了吗？</p>
                <button 
                    onClick={handleGeneratePath}
                    disabled={isGenerating}
                    className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
                >
                    {isGenerating ? (
                        <><span className="material-symbols-outlined animate-spin">refresh</span> 正在生成课程...</>
                    ) : (
                        <><span className="material-symbols-outlined">auto_awesome</span> 生成学习路径</>
                    )}
                </button>
                <button onClick={() => setSelectedBase(null)} className="mt-4 text-slate-400 text-sm hover:text-slate-600">取消</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden animate-fade-in-up">
             <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedBase(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><span className="material-symbols-outlined">arrow_back</span></button>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 leading-none mb-1">{selectedBase.title}</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">AI 结构化课程</p>
                    </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12 relative">
                <div className="max-w-3xl mx-auto relative">
                    {/* Vertical Line */}
                    <div className="absolute left-6 top-4 bottom-0 w-0.5 bg-slate-200"></div>

                    <div className="flex flex-col gap-12">
                        {path.modules.map((module, idx) => {
                            // Determine status dynamically
                            let status: 'completed' | 'active' | 'locked' = 'locked';
                            if (idx < activeModuleIndex) status = 'completed';
                            else if (idx === activeModuleIndex) status = 'active';
                            else status = 'locked';

                            return (
                                <div key={idx} className="relative pl-16">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-0 top-0 size-12 rounded-full border-4 flex items-center justify-center bg-white z-10 
                                        ${status === 'completed' ? 'border-emerald-500 text-emerald-500' : 
                                          status === 'active' ? 'border-primary text-primary shadow-lg shadow-primary/20' : 
                                          'border-slate-300 text-slate-300'}`}
                                    >
                                        {status === 'completed' ? (
                                            <span className="material-symbols-outlined">check</span>
                                        ) : (
                                            <span className="font-bold text-lg">{idx + 1}</span>
                                        )}
                                    </div>

                                    <div className={`bg-white rounded-2xl p-6 border transition-all ${status === 'active' ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-slate-200 shadow-sm opacity-90'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-lg font-bold ${status === 'locked' ? 'text-slate-400' : 'text-slate-900'}`}>{module.title}</h3>
                                            {status === 'locked' && <span className="material-symbols-outlined text-slate-300">lock</span>}
                                        </div>
                                        <p className="text-sm text-slate-500 mb-4">{module.description || "核心概念模块。"}</p>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {module.nodeIds.map(nodeId => {
                                                const node = selectedBase.graphData?.nodes.find(n => n.id === nodeId);
                                                const nodeStatus = getMasteryStatus(nodeId);
                                                
                                                // Style logic based on mastery
                                                let btnClass = 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary';
                                                let icon = null;

                                                if (nodeStatus === 'mastered') {
                                                    btnClass = 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm ring-1 ring-amber-100';
                                                    icon = 'military_tech';
                                                } else if (nodeStatus === 'passing') {
                                                    btnClass = 'bg-emerald-50 border-emerald-300 text-emerald-700';
                                                    icon = 'check';
                                                } else if (nodeStatus === 'failed') {
                                                    btnClass = 'bg-red-50 border-red-200 text-red-700';
                                                    icon = 'priority_high';
                                                }

                                                return node ? (
                                                    <button 
                                                        key={nodeId}
                                                        disabled={status === 'locked'}
                                                        onClick={() => onStartAssessment(selectedBase.id, node.id, node.label)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all
                                                        ${status === 'locked' ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50' : btnClass}`}
                                                    >
                                                        {nodeStatus === 'none' && <span className={`size-2 rounded-full ${node.type==='concept'?'bg-primary':node.type==='fact'?'bg-emerald-400':'bg-amber-400'}`}></span>}
                                                        {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
                                                        {node.label}
                                                    </button>
                                                ) : null
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="h-20"></div> {/* Spacer */}
                </div>
             </div>
        </div>
    );
};