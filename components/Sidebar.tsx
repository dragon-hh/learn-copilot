import React, { useRef } from 'react';
import { View, NavItem, User } from '../types';
import { createBackupJSON, restoreBackupJSON } from '../utils/storage';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  currentUser: User;
  onLogout: () => void;
}

const navItems: NavItem[] = [
  { id: View.LIBRARY, label: '知识库', icon: 'local_library' },
  { id: View.PATH, label: '学习路径', icon: 'alt_route' },
  { id: View.GRAPH, label: '知识图谱', icon: 'hub' },
  { id: View.ASSESSMENT, label: '智能测试', icon: 'check_circle' },
  { id: View.ANALYTICS, label: '学习分析', icon: 'bar_chart' },
  { id: View.PRACTICE, label: '每日复习', icon: 'pool' },
  { id: View.ABOUT, label: '关于应用', icon: 'info' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, currentUser, onLogout }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fallback avatar if not provided
  const avatarUrl = currentUser.avatar || `https://ui-avatars.com/api/?background=149cb8&color=fff&name=${encodeURIComponent(currentUser.username)}`;

  const handleDownloadBackup = () => {
    const json = createBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learn-copilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = restoreBackupJSON(content);
        if (success) {
          alert('数据恢复成功！页面即将刷新。');
          window.location.reload();
        } else {
          alert('恢复失败，文件格式无效。');
        }
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside className="w-20 lg:w-64 bg-surface-light border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300">
      <div className="p-4 lg:p-6 flex items-center gap-3 justify-center lg:justify-start">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <span className="material-symbols-outlined">auto_awesome</span>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-base font-bold leading-none font-display text-slate-800">Learn Copilot</h1>
          <p className="text-slate-500 text-xs mt-1">AI 学习助手</p>
        </div>
      </div>

      <nav className="flex-1 px-2 lg:px-4 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group w-full justify-center lg:justify-start ${
              currentView === item.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className={`material-symbols-outlined ${currentView === item.id ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span className="hidden lg:block text-sm">{item.label}</span>
            {currentView === item.id && (
              <div className="ml-auto hidden lg:block w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 mt-auto flex flex-col gap-2">
        {/* Backup Controls */}
        <div className="flex gap-1 mb-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json"
            />
            <button 
              onClick={handleDownloadBackup}
              title="备份数据"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors border border-slate-200"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span className="hidden lg:inline text-xs font-bold">备份</span>
            </button>
            <button 
              onClick={handleImportClick}
              title="恢复数据"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors border border-slate-200"
            >
              <span className="material-symbols-outlined text-lg">upload</span>
              <span className="hidden lg:inline text-xs font-bold">恢复</span>
            </button>
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full justify-center lg:justify-start"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="hidden lg:block text-sm font-medium">退出登录</span>
        </button>
        
        <div className="mt-2 flex items-center gap-3 px-2 lg:px-3 justify-center lg:justify-start">
          <div className="size-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex-shrink-0">
             <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="hidden lg:flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-slate-700 truncate">{currentUser.username}</span>
            <span className="text-[10px] text-slate-400">免费版</span>
          </div>
        </div>
      </div>
    </aside>
  );
};