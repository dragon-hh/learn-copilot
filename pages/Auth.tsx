import React, { useState, useRef } from 'react';
import { loginUser, registerUser } from '../utils/storage';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random&name=";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请填写所有必填项');
      return;
    }

    if (isRegistering) {
      // Use uploaded avatar or generate a default one based on username
      const finalAvatar = avatarPreview || `${DEFAULT_AVATAR}${encodeURIComponent(username)}`;
      const user = registerUser(username, password, finalAvatar);
      if (user) {
        onLogin(user);
      } else {
        setError('该用户名已存在');
      }
    } else {
      const user = loginUser(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('用户名或密码错误');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
             <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 font-display">Learn Copilot</h1>
          <p className="text-slate-500 text-sm mt-2">您的 AI 智能学习助手</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
          <button 
            onClick={() => { setIsRegistering(false); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isRegistering ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            登录
          </button>
          <button 
            onClick={() => { setIsRegistering(true); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isRegistering ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {isRegistering && (
            <div className="flex flex-col items-center gap-2 mb-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-primary overflow-hidden relative group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-3xl">add_a_photo</span>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-white text-xs font-bold">更换</span>
                </div>
              </div>
              <span className="text-xs text-slate-400">上传头像 (可选)</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">用户名</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
              placeholder="请输入用户名"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="mt-2 w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {isRegistering ? '创建新账号' : '进入应用'}
          </button>
        </form>
      </div>
    </div>
  );
};