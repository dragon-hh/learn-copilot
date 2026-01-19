# 快速开始指南 (Quick Start)

## 系统架构 (System Architecture)

```
┌─────────────────────────────────────┐
│      React Frontend (Vite)          │
│   (runs on http://localhost:5173)   │
└────────────────┬────────────────────┘
                 │ HTTP Requests
                 ↓
┌─────────────────────────────────────┐
│    Node.js Server (Express)         │
│   (runs on http://localhost:3001)   │
└────────────────┬────────────────────┘
                 │ File I/O
                 ↓
┌─────────────────────────────────────┐
│    File System Storage              │
│   (server/storage/)                 │
└─────────────────────────────────────┘
```

## 第一步：安装依赖 (Step 1: Install Dependencies)

```bash
npm install
```

这将安装所有依赖包，包括：
- React 19
- Vite (前端构建工具)
- Express (后端服务器)
- CORS (跨域支持)

## 第二步：启动服务器 (Step 2: Start Backend Server)

打开**第一个终端**，运行：

```bash
npm run server
```

输出应该显示：
```
🚀 Server running at http://localhost:3001
📁 Storage directory: e:\projects\nodeProjects\learn-copilot\server\storage
```

✅ 服务器现在在后台运行。

## 第三步：启动前端 (Step 3: Start Frontend)

打开**第二个终端**，运行：

```bash
npm run dev
```

输出应该显示：
```
  VITE v6.2.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ 点击 http://localhost:5173/ 在浏览器中打开应用。

## 数据流向 (Data Flow)

### 保存数据 (Saving Data)

```typescript
// 1. 前端保存到 localStorage
saveUserData(userId, knowledgeBases);

// 2. 异步同步到服务器
await syncUserData(userId, knowledgeBases);

// 3. 服务器写入文件
// server/storage/user-{userId}/knowledge_bases.json
```

### 加载数据 (Loading Data)

```typescript
// 1. 优先从服务器加载
const data = await fetchUserData(userId);

// 2. 如果服务器不可用，使用 localStorage
if (!data) {
  return getUserData(userId);
}

// 3. 更新 localStorage
saveUserData(userId, data);
```

## 数据存储位置 (Storage Locations)

### 浏览器存储 (Browser - LocalStorage)
```
键名: learn_copilot_*
位置: 浏览器 LocalStorage
特点: 快速，本地，但易丢失
```

### 服务器存储 (Server - File System)
```
位置: server/storage/
特点: 持久化，跨设备共享
```

**存储结构**:
```
server/storage/
├── users.json
├── model_config.json
├── prompts_config.json
└── user-user-123456/
    ├── knowledge_bases.json        # 学习资料
    ├── assessment_results.json     # 测试成绩
    ├── assessment_history.json     # 历史记录
    └── ai_insights.json            # AI 分析
```

## 常见操作 (Common Tasks)

### 任务 1: 查看所有用户

```bash
# 在服务器运行时，访问
GET http://localhost:3001/api/users
```

### 任务 2: 创建备份

```typescript
import { createBackup } from './utils/server-sync';

const backup = await createBackup();
// backup.data 包含所有数据
```

### 任务 3: 恢复备份

```typescript
import { restoreBackup } from './utils/server-sync';

const backup = JSON.parse(backupJsonString);
await restoreBackup(backup);
```

### 任务 4: 检查服务器健康

```typescript
import { checkServerHealth } from './utils/server-sync';

const isOnline = await checkServerHealth();
console.log(isOnline ? 'Server online' : 'Server offline');
```

## 调试技巧 (Debugging)

### 查看服务器日志
服务器终端会显示所有请求：
```
POST /api/auth/login
GET /api/users/user-123/knowledge-bases
```

### 查看存储文件
```bash
# Windows PowerShell
Get-ChildItem server/storage -Recurse
```

### 查看浏览器存储
1. 打开浏览器开发者工具 (F12)
2. 进入 "Application" → "Local Storage" → "localhost:5173"
3. 查看 `learn_copilot_*` 键

### 清空所有数据

#### 清空浏览器存储
```javascript
// 在浏览器控制台中运行
Object.keys(localStorage)
  .filter(k => k.startsWith('learn_copilot_'))
  .forEach(k => localStorage.removeItem(k));
```

#### 清空服务器存储
```bash
# 删除存储文件夹（Windows PowerShell）
Remove-Item server/storage -Recurse -Force
```

## 环境变量 (Environment Variables)

### 默认值
```
REACT_APP_SERVER_URL = http://localhost:3001/api
PORT = 3001
```

### 自定义服务器地址
创建 `.env.local` 文件：
```
REACT_APP_SERVER_URL=http://192.168.1.100:3001/api
```

## 故障排除 (Troubleshooting)

| 问题 | 解决方案 |
|------|--------|
| "Address already in use" | 改用其他端口: `PORT=3002 npm run server` |
| "CORS error" | 确认服务器正在运行 |
| "Cannot find module 'express'" | 运行 `npm install` |
| 数据没有保存 | 检查 `server/storage/` 文件夹权限 |
| 服务器返回 404 | 检查 API URL 是否正确 |

## 下一步 (Next Steps)

1. ✅ 运行服务器和前端
2. ✅ 测试基本功能（注册、登录、保存数据）
3. ✅ 查看 `SERVER_SETUP.md` 了解完整 API 文档
4. ✅ 查看 `DATA_STORAGE.md` 了解数据结构
5. ✅ 查看 `SYNC_EXAMPLES.ts` 了解如何使用服务器同步

## 生产部署 (Production Deployment)

⚠️ **当前设置仅用于开发。生产部署需要：**

1. **密码哈希**: 使用 bcrypt
2. **认证**: 实现 JWT tokens
3. **验证**: 验证所有输入
4. **CORS**: 限制来源
5. **数据库**: 考虑使用真实数据库而非 JSON 文件
6. **加密**: 加密敏感数据
7. **日志**: 实现适当的日志系统
8. **错误处理**: 更好的错误处理

详见 `SERVER_SETUP.md` 的 "Security Notes" 部分。
