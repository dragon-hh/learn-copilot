import React, { useState, useRef, useEffect } from 'react';
import { generateAIContent, Type } from '../utils/ai';
import { GraphData, KnowledgeBase, KnowledgeFile, FileType } from '../types';
import { getUserData, saveUserData } from '../utils/storage';
import { getPrompt, PromptKey } from '../utils/prompts';

interface LibraryProps {
  userId: string;
}

// --- Helper for Mock SVG ---
const getRandomSvg = () => {
   // Simplified for brevity, returning a generic one
   return (
      <svg viewBox="0 0 300 160" width="100%" height="100%">
         <circle cx="150" cy="80" r="30" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4" />
         <circle cx="150" cy="80" r="5" fill="#149cb8" />
      </svg>
   );
};

// --- Components ---

const ClusterCard: React.FC<{
  base: KnowledgeBase;
  onClick: () => void;
}> = ({ base, onClick }) => (
  <article 
    onClick={onClick}
    className="flex flex-col bg-surface-light rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full group"
  >
    <div className="h-40 relative w-full overflow-hidden rounded-t-2xl bg-slate-50 border-b border-slate-100">
      <div className="absolute inset-0 opacity-80 pointer-events-none">
        {getRandomSvg()}
      </div>
      <div className="absolute top-3 right-3">
        <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200 shadow-sm">
          {base.tag}
        </span>
      </div>
    </div>
    <div className="p-5 flex flex-col flex-1 gap-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 group-hover:text-primary transition-colors font-display">
          {base.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2">{base.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
             {/* Progress Circle */}
             <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center">
                <span className="text-[9px] font-bold text-slate-500">{base.progress}%</span>
             </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">掌握度</span>
            <span className="text-[10px] text-slate-400">{base.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {base.graphData && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-1 rounded shadow-sm" title="图谱已生成">
                    <span className="material-symbols-outlined text-[12px]">hub</span>
                </div>
            )}
           <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
             <span className="material-symbols-outlined text-[14px]">description</span>
             {base.files.length}
           </div>
        </div>
      </div>
    </div>
  </article>
);

const FileIcon: React.FC<{ type: FileType }> = ({ type }) => {
  const colors = {
    pdf: 'text-red-500 bg-red-50 border-red-200',
    md: 'text-slate-700 bg-slate-100 border-slate-300',
    txt: 'text-blue-600 bg-blue-50 border-blue-200'
  };
  
  const icons = {
    pdf: 'picture_as_pdf',
    md: 'markdown',
    txt: 'description'
  };

  return (
    <div className={`w-8 h-8 rounded flex items-center justify-center border ${colors[type]}`}>
      <span className="material-symbols-outlined text-lg">{icons[type]}</span>
    </div>
  );
};

export const Library: React.FC<LibraryProps> = ({ userId }) => {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [activeBase, setActiveBase] = useState<KnowledgeBase | null>(null);
  const [newBaseName, setNewBaseName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    const data = getUserData(userId);
    setBases(data);
  }, [userId]);

  // Save helper
  const updateBases = (newBases: KnowledgeBase[]) => {
    setBases(newBases);
    saveUserData(userId, newBases);
    
    // Also update active base reference if open
    if (activeBase) {
        const updatedActive = newBases.find(b => b.id === activeBase.id);
        if (updatedActive) setActiveBase(updatedActive);
    }
  };

  const handleCreateBase = () => {
    if (!newBaseName.trim()) return;
    const newBase: KnowledgeBase = {
      id: Date.now().toString(),
      title: newBaseName,
      description: '新的空白知识库，等待您导入内容。',
      tag: 'General',
      progress: 0,
      status: '未开始',
      lastUpdated: new Date().toLocaleDateString(),
      files: [],
      graphData: null
    };
    
    updateBases([newBase, ...bases]);
    setNewBaseName('');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeBase || !event.target.files) return;
    
    const uploadedFiles = Array.from(event.target.files);
    const newKnowledgeFiles: KnowledgeFile[] = [];

    for (const file of uploadedFiles) {
        const type = file.name.split('.').pop()?.toLowerCase() as FileType;
        const validTypes: FileType[] = ['md', 'pdf', 'txt'];
        
        if (validTypes.includes(type)) {
            let content = '';
            if (type !== 'pdf') {
               try {
                  content = await file.text();
               } catch (e) {
                  console.error("Error reading file:", e);
               }
            } else {
               content = "[PDF Content Placeholder - Text extraction required]";
            }

            newKnowledgeFiles.push({
                id: Date.now().toString() + Math.random().toString(),
                name: file.name,
                type: type,
                size: (file.size / 1024).toFixed(1) + ' KB',
                date: new Date().toLocaleDateString(),
                content: content
            });
        }
    }

    if (newKnowledgeFiles.length > 0) {
        const updatedBase = {
            ...activeBase,
            files: [...newKnowledgeFiles, ...activeBase.files]
        };
        // Replace in array
        const newBases = bases.map(b => b.id === updatedBase.id ? updatedBase : b);
        updateBases(newBases);
    }

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
      if (!activeBase || activeBase.files.length === 0) return;
      setIsGenerating(true);

      const combinedText = activeBase.files.map(f => `--- FILE: ${f.name} ---\n${f.content || ''}`).join('\n\n');
      const promptTemplate = getPrompt(PromptKey.GENERATE_GRAPH);
      const fullPrompt = `${promptTemplate}\n\nMaterials:\n${combinedText.substring(0, 30000)}`;

      const graphSchema = {
          type: Type.OBJECT,
          properties: {
              nodes: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          id: { type: Type.STRING },
                          label: { type: Type.STRING, description: "Name of the concept in Chinese" },
                          type: { type: Type.STRING, enum: ['concept', 'fact', 'example'] },
                          x: { type: Type.NUMBER, description: "X coordinate between 50 and 750" },
                          y: { type: Type.NUMBER, description: "Y coordinate between 50 and 550" }
                      },
                      required: ['id', 'label', 'type', 'x', 'y']
                  }
              },
              edges: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          source: { type: Type.STRING },
                          target: { type: Type.STRING },
                          label: { type: Type.STRING, description: "Relationship description in Chinese" }
                      },
                      required: ['source', 'target']
                  }
              },
              topic: { type: Type.STRING, description: "Main topic in Chinese" }
          },
          required: ['nodes', 'edges', 'topic']
      };

      try {
          const text = await generateAIContent(fullPrompt, graphSchema);

          if (text) {
             const graphData = JSON.parse(text) as GraphData;
             
             // Persist generated graph
             const updatedBase = {
                 ...activeBase,
                 graphData: graphData,
                 progress: 10 // Bump progress slightly on generation
             };
             const newBases = bases.map(b => b.id === updatedBase.id ? updatedBase : b);
             updateBases(newBases);
          }
      } catch (error) {
          console.error("Generation failed", error);
          alert(`生成图谱失败: ${error}`);
      } finally {
          setIsGenerating(false);
      }
  };

  // --- Detail View ---
  if (activeBase) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-10 lg:p-12 flex flex-col gap-8 animate-fade-in-up">
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept=".md,.txt,.pdf"
        />

        {/* Navigation Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveBase(null)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-900 font-display leading-none">{activeBase.title}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">知识库</span>
               <span className="w-1 h-1 rounded-full bg-slate-300"></span>
               <span className="text-xs text-slate-400">{activeBase.files.length} 个文件</span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-surface-light rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                 <span className="material-symbols-outlined text-9xl text-primary">upload_file</span>
              </div>
              
              <div className="flex items-center gap-3 mb-2 relative z-10">
                 <div className="p-2 bg-primary/10 rounded-lg text-primary"><span className="material-symbols-outlined">add_link</span></div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">导入学习资料</h3>
                    <p className="text-sm text-slate-500">添加文件以构建您的知识图谱。</p>
                 </div>
              </div>

              <div 
                 onClick={triggerFileUpload}
                 className="flex-1 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer flex flex-col items-center justify-center p-8 gap-3 relative z-10 min-h-[200px]"
              >
                 <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-primary mb-1">
                    <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                 </div>
                 <p className="text-slate-900 font-bold">点击上传文件</p>
                 <div className="flex gap-2">
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">.md</span>
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">.pdf</span>
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">.txt</span>
                 </div>
              </div>
           </div>

           <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg text-white p-8 flex flex-col relative overflow-hidden">
               <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-6 text-emerald-400">
                     <span className="material-symbols-outlined">hub</span>
                     <span className="text-xs font-bold uppercase tracking-wider">图谱引擎</span>
                  </div>
                  
                  <div className="mt-auto">
                     <div className="mb-6">
                        <p className="text-3xl font-display font-bold mb-1">{activeBase.graphData ? '已生成' : activeBase.files.length > 0 ? '准备就绪' : '空闲'}</p>
                        <p className="text-slate-400 text-sm">
                           {activeBase.graphData 
                             ? '知识图谱结构已存在，您可以点击重新生成。' 
                             : activeBase.files.length > 0 
                               ? '所有文件已解析，可以生成图谱。' 
                               : '请先导入文件以生成知识图谱。'}
                        </p>
                     </div>
                     
                     <button 
                        disabled={activeBase.files.length === 0 || isGenerating}
                        onClick={handleGenerate}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${
                           activeBase.files.length > 0 && !isGenerating
                           ? 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25 hover:shadow-primary/40' 
                           : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                     >
                        {isGenerating ? (
                           <>
                              <span className="material-symbols-outlined animate-spin">refresh</span>
                              生成中...
                           </>
                        ) : (
                           <>
                              <span className="material-symbols-outlined">auto_awesome</span>
                              {activeBase.graphData ? '重新生成图谱' : '生成知识图谱'}
                           </>
                        )}
                     </button>
                  </div>
               </div>
           </div>
        </div>

        {/* File List */}
        <div className="flex flex-col gap-4">
           <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">folder_open</span>
              文件列表 ({activeBase.files.length})
           </h3>
           
           <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {activeBase.files.length > 0 ? (
                 <div className="divide-y divide-slate-100">
                    {activeBase.files.map((file) => (
                       <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-4">
                             <FileIcon type={file.type} />
                             <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-sm group-hover:text-primary transition-colors">{file.name}</span>
                                <span className="text-xs text-slate-400">{file.size} • {file.date}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide border border-emerald-100">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span> 已解析
                             </div>
                             <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined text-lg">delete</span>
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <span className="material-symbols-outlined text-4xl opacity-20">draft</span>
                    <p className="text-sm font-medium">暂无文件，请上传。</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 lg:p-12 flex flex-col gap-10 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 font-display">知识库管理</h2>
          <p className="text-slate-500 text-lg max-w-xl">创建知识库并导入文件，AI 将为您生成可视化学习图谱。</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-primary bg-primary/5 px-3 py-1 rounded-full font-bold border border-primary/10">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>系统状态: 在线</span>
        </div>
      </header>

      {/* Create Base Section */}
      <section className="bg-surface-light rounded-2xl shadow-sm border border-slate-200 p-1 overflow-hidden group">
        <div className="p-6 md:p-8 flex flex-col gap-6 relative z-10">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined">library_add</span>
            </span>
            <div>
               <h3 className="text-xl font-bold text-slate-900 leading-tight">创建知识库</h3>
               <p className="text-xs text-slate-500">创建一个新的集合以开始学习。</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">edit_note</span>
              <input 
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all font-medium" 
                placeholder="为新知识库命名 (例如：天体物理学入门)..." 
                type="text" 
              />
            </div>
            <button 
              onClick={handleCreateBase}
              className="h-14 px-8 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 whitespace-nowrap"
            >
              <span className="material-symbols-outlined">add</span>
              <span>立即创建</span>
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bases.map(base => (
           <ClusterCard 
             key={base.id} 
             base={base} 
             onClick={() => setActiveBase(base)} 
           />
        ))}

         {bases.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
               <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
               <p>暂无知识库。请在上方创建一个！</p>
            </div>
         )}
      </div>
    </div>
  );
};