import React, { useEffect, useState, useRef } from 'react';
import { generateAIContent } from '../utils/ai';
import { GraphData, KnowledgeBase } from '../types';
import { getUserData } from '../utils/storage';
import { getPrompt, PromptKey } from '../utils/prompts';

interface GraphProps {
    userId: string;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

// Reusing the graph data structure for rendering
interface GraphViewProps {
    data: GraphData;
    onBack: () => void;
}

const GraphCanvas: React.FC<GraphViewProps> = ({ data, onBack }) => {
    const nodes = data.nodes || [];
    const edges = data.edges || [];
    const topic = data.topic || "未知主题";

    // Chat State
    const [isChatMode, setIsChatMode] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isChatMode]);

    const handleSendMessage = async () => {
        if (!input.trim() || isSending) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsSending(true);

        // Construct context from graph data
        let promptTemplate = getPrompt(PromptKey.CHAT_WITH_GRAPH);
        promptTemplate = promptTemplate.replace('{{topic}}', topic);
        promptTemplate = promptTemplate.replace('{{nodes}}', nodes.map(n => `${n.label} (${n.type})`).join(', '));
        promptTemplate = promptTemplate.replace('{{edges}}', edges.map(e => {
            const src = nodes.find(n => n.id === e.source)?.label;
            const tgt = nodes.find(n => n.id === e.target)?.label;
            return `${src} --[${e.label}]--> ${tgt}`;
        }).join(', '));

        const fullPrompt = `
                Context: ${promptTemplate}
                
                Chat History:
                ${messages.map(m => `${m.role}: ${m.text}`).join('\n')}
                
                User: ${userMsg}
                Model:`;

        try {
            const text = await generateAIContent(fullPrompt);
            if (text) {
                setMessages(prev => [...prev, { role: 'model', text: text || "无法生成回复。" }]);
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: `连接 AI 服务失败: ${error.message || "未知错误"}` }]);
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden animate-fade-in-up">
            {/* Canvas Area */}
            <div className="flex-1 relative bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing group/canvas">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                {/* Back Button & Toolbar */}
                <div className="absolute top-6 left-6 z-10 flex gap-4">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>

                    <div className="flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full shadow-lg">
                        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600"><span className="material-symbols-outlined">add</span></button>
                        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600"><span className="material-symbols-outlined">remove</span></button>
                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary"><span className="material-symbols-outlined">account_tree</span></button>
                    </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
                    <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">节点类型</h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-xs"><div className="w-2 h-2 rounded-full bg-primary"></div>概念</div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-xs"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>事实</div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-xs"><div className="w-2 h-2 rounded-full bg-amber-500"></div>案例</div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Graph Rendering */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-[800px] h-[600px] transform scale-90 origin-center">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            {edges.map((edge, i) => {
                                const sourceNode = nodes.find(n => n.id === edge.source);
                                const targetNode = nodes.find(n => n.id === edge.target);
                                if (!sourceNode || !targetNode) return null;
                                
                                return (
                                    <g key={i}>
                                        <path 
                                            d={`M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`} 
                                            fill="none" 
                                            stroke="#cbd5e1" 
                                            strokeWidth="2" 
                                        />
                                        {edge.label && (
                                            <text 
                                                x={(sourceNode.x + targetNode.x) / 2} 
                                                y={(sourceNode.y + targetNode.y) / 2} 
                                                fill="#64748b" 
                                                fontSize="10" 
                                                textAnchor="middle" 
                                                dy="-5"
                                                className="bg-white"
                                            >
                                                {edge.label}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>

                        {nodes.map((node) => {
                            const color = node.type === 'fact' ? 'border-emerald-500 text-emerald-600' : node.type === 'example' ? 'border-amber-500 text-amber-600' : 'border-primary text-primary';
                            const size = node.type === 'concept' ? 'w-24 h-24' : 'w-16 h-16';
                            
                            return (
                                <div 
                                    key={node.id}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group transition-all duration-500"
                                    style={{ left: node.x, top: node.y }}
                                >
                                    <div className={`${size} rounded-full bg-white border-4 ${color} shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <span className="material-symbols-outlined text-3xl">
                                            {node.type === 'fact' ? 'check' : node.type === 'example' ? 'lightbulb' : 'psychology'}
                                        </span>
                                    </div>
                                    <div className="mt-3 bg-white px-3 py-1 rounded-full shadow-md border border-slate-100 font-bold text-sm text-center max-w-[150px]">
                                        {node.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Document/Chat Panel */}
            <div className="w-[400px] h-full bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col">
                <div className="flex-none p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1 font-display">{topic}</h1>
                        <p className="text-xs text-primary font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            {isChatMode ? 'Copilot 问答' : 'AI 知识概要'}
                        </p>
                    </div>
                    {isChatMode && (
                        <button onClick={() => setIsChatMode(false)} className="text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>
                
                {isChatMode ? (
                    // CHAT MODE
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.length === 0 && (
                                <div className="text-center text-slate-400 mt-10 text-sm">
                                    <span className="material-symbols-outlined text-3xl mb-2">forum</span>
                                    <p>您可以询问关于 <br/>"{topic}" 的任何问题</p>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isSending && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-white">
                            <div className="flex gap-2">
                                <input 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="输入您的问题..."
                                    disabled={isSending}
                                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || isSending}
                                    className="w-10 h-10 flex items-center justify-center bg-primary hover:bg-primary-dark disabled:bg-slate-200 text-white rounded-xl transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // DOC MODE
                    <>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <article className="prose prose-sm prose-slate">
                                <p className="mb-4 text-slate-600">此知识图谱是根据您上传的文档生成的。探索概念之间的联系，加深您的理解。</p>
                                
                                {nodes.map((node, i) => (
                                    <div key={i} className="mb-6">
                                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${node.type === 'concept' ? 'bg-primary' : 'bg-slate-400'}`}></span>
                                            {node.label}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            连接到: {edges.filter(e => e.source === node.id || e.target === node.id).length} 个其他节点。
                                        </p>
                                    </div>
                                ))}
                            </article>
                        </div>
                        <div className="p-4 border-t border-slate-100">
                           <button 
                                onClick={() => setIsChatMode(true)}
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all"
                           >
                              <span className="material-symbols-outlined animate-pulse">colors_spark</span>
                              询问 AI 助手
                           </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const Graph: React.FC<GraphProps> = ({ userId }) => {
    const [bases, setBases] = useState<KnowledgeBase[]>([]);
    const [selectedBase, setSelectedBase] = useState<KnowledgeBase | null>(null);

    useEffect(() => {
        const data = getUserData(userId);
        setBases(data);
    }, [userId]);

    if (selectedBase && selectedBase.graphData) {
        return <GraphCanvas data={selectedBase.graphData} onBack={() => setSelectedBase(null)} />;
    }

    return (
        <div className="max-w-7xl mx-auto p-8 animate-fade-in-up">
            <header className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 font-display">知识图谱</h2>
                <p className="text-slate-500 mt-2">可视化探索您的知识结构。</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bases.map(base => (
                    <div 
                        key={base.id}
                        onClick={() => {
                            if (base.graphData) {
                                setSelectedBase(base);
                            }
                        }}
                        className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all group ${base.graphData ? 'cursor-pointer hover:border-primary hover:shadow-md' : 'opacity-60 cursor-not-allowed'}`}
                    >
                         <div className="flex justify-between items-start mb-4">
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">{base.tag}</span>
                            {base.graphData ? (
                                <span className="text-emerald-500 material-symbols-outlined">hub</span>
                            ) : (
                                <span className="text-slate-300 material-symbols-outlined">hub</span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">{base.title}</h3>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{base.description}</p>
                        
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-slate-400">
                             {base.graphData ? '进入图谱' : '未生成 (请在知识库生成)'} 
                             <span className="material-symbols-outlined text-sm ml-auto">arrow_forward</span>
                        </div>
                    </div>
                ))}
                {bases.length === 0 && (
                     <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">hub</span>
                        <p>暂无知识库。请先在“知识库”中创建。</p>
                     </div>
                )}
            </div>
        </div>
    );
};