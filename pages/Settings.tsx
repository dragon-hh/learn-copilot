import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { PROMPT_DESCRIPTIONS, PromptKey, getAllPrompts, saveAllPrompts, resetPrompts, DEFAULT_PROMPTS } from '../utils/prompts';
import { registerUser, getModelConfig, saveModelConfig, ModelConfig } from '../utils/storage';
import { syncModelConfig, syncPromptsConfig } from '../utils/server-sync';

interface SettingsProps {
    currentUser: User;
    onUpdateUser: (user: User) => void;
}

const MODEL_OPTIONS = [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
    { value: 'gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash' },
    { value: 'deepseek-chat', label: 'DeepSeek V3 (Official)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek R1 (Official)' },
    { value: 'custom', label: '自定义 / NVIDIA NIM / 其他 OpenAI 兼容模型' }
];

export const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateUser }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'profile' | 'model' | 'prompts'>('profile');
    const [showSuccess, setShowSuccess] = useState(false);

    // Profile State
    const [username, setUsername] = useState(currentUser.username);
    const [avatar, setAvatar] = useState(currentUser.avatar || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Model Config State
    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        modelName: 'gemini-3-flash-preview',
        baseUrl: '',
        apiKey: ''
    });

    // Prompts State
    const [prompts, setPrompts] = useState<Record<string, string>>({});

    useEffect(() => {
        setPrompts(getAllPrompts());
        setModelConfig(getModelConfig());
    }, []);

    const showSuccessMessage = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    // --- Profile Handlers ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        const updatedUser: User = {
            ...currentUser,
            username,
            avatar
        };
        const usersStr = localStorage.getItem('learn_copilot_users');
        if (usersStr) {
            const users: User[] = JSON.parse(usersStr);
            const newUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
            localStorage.setItem('learn_copilot_users', JSON.stringify(newUsers));
        }
        onUpdateUser(updatedUser);
        showSuccessMessage();
    };

    // --- Model Handlers ---
    const handleSaveModelConfig = async () => {
        saveModelConfig(modelConfig);
        // 同步到服务器
        await syncModelConfig(modelConfig);
        showSuccessMessage();
    };

    // Determine current dropdown value
    // If modelName is not in the predefined list (excluding 'custom'), we treat it as 'custom' mode
    const getCurrentSelectValue = () => {
        const isPredefined = MODEL_OPTIONS.some(opt => opt.value === modelConfig.modelName && opt.value !== 'custom');
        return isPredefined ? modelConfig.modelName : 'custom';
    };

    const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'custom') {
            // If switching to custom, keep current value if it's already custom-like, or clear it if it was a preset
            const isPredefined = MODEL_OPTIONS.some(opt => opt.value === modelConfig.modelName && opt.value !== 'custom');
            if (isPredefined) {
                setModelConfig({ ...modelConfig, modelName: '' }); 
            }
        } else {
            setModelConfig({ ...modelConfig, modelName: value });
        }
    };

    // --- Prompt Handlers ---
    const handlePromptChange = (key: string, value: string) => {
        setPrompts(prev => ({ ...prev, [key]: value }));
    };

    const handleSavePrompts = async () => {
        saveAllPrompts(prompts);
        // 同步到服务器
        await syncPromptsConfig(prompts);
        showSuccessMessage();
    };

    const handleResetPrompts = () => {
        if (confirm('确定要重置所有提示词为系统默认值吗？此操作不可撤销。')) {
            resetPrompts();
            setPrompts(DEFAULT_PROMPTS);
            showSuccessMessage();
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in-up h-screen overflow-y-auto">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 font-display">系统配置</h1>
                    <p className="text-slate-500 mt-2">管理个人资料、模型参数及提示词工程。</p>
                </div>
                {showSuccess && (
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-pulse">
                        <span className="material-symbols-outlined">check_circle</span>
                        保存成功
                    </div>
                )}
            </header>

            <div className="flex gap-2 mb-8 border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    个人资料
                </button>
                <button 
                    onClick={() => setActiveTab('model')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'model' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    模型配置
                </button>
                <button 
                    onClick={() => setActiveTab('prompts')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'prompts' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    提示词配置
                </button>
            </div>

            {/* --- PROFILE TAB --- */}
            {activeTab === 'profile' && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-xl">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 group-hover:border-primary transition-colors">
                                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-white">edit</span>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    accept="image/*"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">头像设置</h3>
                                <p className="text-xs text-slate-500">点击图片更换头像</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">用户名</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleSaveProfile}
                                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/20"
                            >
                                保存修改
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODEL CONFIG TAB --- */}
            {activeTab === 'model' && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-xl">
                    <div className="flex flex-col gap-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm">
                            <span className="material-symbols-outlined">settings_suggest</span>
                            <p>支持配置 Gemini、DeepSeek、NVIDIA NIM 或任何兼容 OpenAI 接口的模型。</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">模型提供商 / 类型</label>
                            <div className="relative">
                                <select 
                                    value={getCurrentSelectValue()}
                                    onChange={handleModelSelectChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none font-medium"
                                >
                                    {MODEL_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        {/* Conditional Custom Model Input */}
                        {getCurrentSelectValue() === 'custom' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-xs font-bold text-primary uppercase mb-1">自定义模型 ID (Model Name)</label>
                                <input 
                                    type="text" 
                                    value={modelConfig.modelName}
                                    onChange={(e) => setModelConfig({...modelConfig, modelName: e.target.value})}
                                    placeholder="例如: deepseek-ai/deepseek-v3.2"
                                    className="w-full px-4 py-3 rounded-xl bg-white border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">请输入 NVIDIA 或其他服务商提供的确切模型名称。</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Base URL</label>
                            <input 
                                type="text" 
                                value={modelConfig.baseUrl || ''}
                                onChange={(e) => setModelConfig({...modelConfig, baseUrl: e.target.value})}
                                placeholder="例如: https://integrate.api.nvidia.com/v1"
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">留空则使用默认地址。对于 NVIDIA，请填写 <code className="bg-slate-100 px-1 rounded">https://integrate.api.nvidia.com/v1</code></p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                            <input 
                                type="password" 
                                value={modelConfig.apiKey || ''}
                                onChange={(e) => setModelConfig({...modelConfig, apiKey: e.target.value})}
                                placeholder="sk-..."
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">您的 Key 仅存储在本地浏览器中。</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CORS Proxy (Optional)</label>
                            <input 
                                type="text" 
                                value={modelConfig.corsProxy || ''}
                                onChange={(e) => setModelConfig({...modelConfig, corsProxy: e.target.value})}
                                placeholder="例如: https://cors-anywhere.herokuapp.com/"
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">用于解决浏览器直接请求第三方 API 时的跨域问题。</p>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleSaveModelConfig}
                                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/20"
                            >
                                保存模型配置
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PROMPTS TAB --- */}
            {activeTab === 'prompts' && (
                <div className="flex flex-col gap-8">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm">
                        <span className="material-symbols-outlined">info</span>
                        <p>这些提示词直接控制 AI 的行为。修改后，应用内的对应功能将立即生效。使用 <code className="bg-blue-100 px-1 rounded">{'{{variable}}'}</code> 语法来代表动态插入的数据。</p>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {Object.values(PromptKey).map((key) => (
                            <div key={key} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                            {PROMPT_DESCRIPTIONS[key as PromptKey].label}
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{key}</span>
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">{PROMPT_DESCRIPTIONS[key as PromptKey].desc}</p>
                                    </div>
                                    <button 
                                        onClick={() => handlePromptChange(key, DEFAULT_PROMPTS[key as PromptKey])}
                                        className="text-xs text-slate-400 hover:text-primary underline"
                                        title="恢复该项默认值"
                                    >
                                        恢复默认
                                    </button>
                                </div>
                                <textarea 
                                    value={prompts[key] || ''}
                                    onChange={(e) => handlePromptChange(key, e.target.value)}
                                    className="w-full h-40 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                                ></textarea>
                            </div>
                        ))}
                    </div>

                    <div className="sticky bottom-6 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex justify-between items-center z-40">
                        <button 
                            onClick={handleResetPrompts}
                            className="px-6 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors"
                        >
                            重置所有
                        </button>
                        <button 
                            onClick={handleSavePrompts}
                            className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/20"
                        >
                            保存配置
                        </button>
                    </div>
                    {/* Spacer to prevent footer from covering content */}
                    <div className="h-40"></div>
                </div>
            )}
        </div>
    );
};