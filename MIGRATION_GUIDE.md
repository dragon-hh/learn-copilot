# 迁移指南 (Migration Guide)

如何将现有的 localStorage 代码迁移到使用服务器存储。

## 概述 (Overview)

**旧方式**: 仅使用浏览器 localStorage
```typescript
import { saveUserData } from '../utils/storage';
saveUserData(userId, data); // 只保存到浏览器
```

**新方式**: 优先使用服务器，降级到 localStorage
```typescript
import { saveUserData } from '../utils/storage';
import { syncUserData } from '../utils/server-sync';

saveUserData(userId, data);     // 保存到浏览器
await syncUserData(userId, data); // 同步到服务器
```

## 迁移步骤 (Migration Steps)

### 第 1 步: 更新 package.json

已完成 ✅ - Express 和 CORS 依赖已添加

```bash
npm install
```

### 第 2 步: 启动服务器

```bash
npm run server
```

### 第 3 步: 检查服务器连接

创建测试组件：

```typescript
import { useEffect } from 'react';
import { checkServerHealth } from '../utils/server-sync';

export const ServerStatus = () => {
  useEffect(() => {
    const check = async () => {
      const isOnline = await checkServerHealth();
      console.log(isOnline ? '✅ Server OK' : '❌ Server unavailable');
    };
    check();
  }, []);

  return null;
};
```

### 第 4 步: 迁移每个组件

#### 示例 1: 注册组件 (Registration)

**之前**:
```typescript
import { registerUser } from '../utils/storage';

const handleRegister = (username, password) => {
  const user = registerUser(username, password, avatar);
  if (user) {
    // 用户已创建
  }
};
```

**之后**:
```typescript
import { registerUser } from '../utils/storage';
import { syncUserData } from '../utils/server-sync';

const handleRegister = async (username, password) => {
  const user = registerUser(username, password, avatar);
  if (user) {
    // 初始化空的知识库数组
    await syncUserData(user.id, []);
    // 用户已创建并同步到服务器
  }
};
```

#### 示例 2: 保存知识库 (Saving Knowledge Base)

**之前**:
```typescript
const handleSaveKB = (userId, kb) => {
  const current = getUserData(userId);
  current.push(kb);
  saveUserData(userId, current);
};
```

**之后**:
```typescript
const handleSaveKB = async (userId, kb) => {
  const current = getUserData(userId);
  current.push(kb);
  
  // 保存到 localStorage
  saveUserData(userId, current);
  
  // 异步同步到服务器
  const synced = await syncUserData(userId, current);
  if (!synced) {
    console.warn('⚠️ 服务器不可用，仅使用本地存储');
  }
};
```

#### 示例 3: 加载知识库 (Loading Knowledge Base)

**之前**:
```typescript
const handleLoadKB = (userId) => {
  const data = getUserData(userId);
  setKnowledgeBases(data);
};
```

**之后**:
```typescript
const handleLoadKB = async (userId) => {
  // 尝试从服务器加载（最新数据）
  const serverData = await fetchUserData(userId);
  
  if (serverData) {
    // 更新 localStorage
    saveUserData(userId, serverData);
    setKnowledgeBases(serverData);
    console.log('📥 从服务器加载');
  } else {
    // 降级到 localStorage
    const localData = getUserData(userId);
    setKnowledgeBases(localData);
    console.log('📦 使用本地存储');
  }
};
```

#### 示例 4: 测试结果 (Assessment Results)

**之前**:
```typescript
const handleSaveScore = (userId, result) => {
  saveAssessmentResult(userId, result);
};
```

**之后**:
```typescript
const handleSaveScore = async (userId, result) => {
  // 保存到 localStorage
  saveAssessmentResult(userId, result);
  
  // 获取所有结果
  const allResults = getAssessmentResults(userId);
  
  // 同步到服务器
  const synced = await syncAssessmentResults(userId, allResults);
  if (synced) {
    console.log('✅ 成绩已保存到服务器');
  }
};
```

#### 示例 5: 历史记录 (History Logging)

**之前**:
```typescript
const handleLogHistory = (userId, log) => {
  saveAssessmentHistory(userId, log);
};
```

**之后**:
```typescript
const handleLogHistory = async (userId, log) => {
  // 保存到 localStorage
  saveAssessmentHistory(userId, log);
  
  // 获取所有历史
  const allHistory = getAssessmentHistory(userId);
  
  // 同步到服务器
  await syncAssessmentHistory(userId, allHistory);
};
```

#### 示例 6: AI 洞察 (AI Insights)

**之前**:
```typescript
const handleSaveInsights = (userId, insights) => {
  saveAiInsights(userId, insights);
};
```

**之后**:
```typescript
const handleSaveInsights = async (userId, insights) => {
  // 保存到 localStorage
  saveAiInsights(userId, insights);
  
  // 同步到服务器
  await syncAiInsights(userId, insights);
};
```

#### 示例 7: 模型配置 (Model Config)

**之前**:
```typescript
const handleSaveConfig = (config) => {
  saveModelConfig(config);
};
```

**之后**:
```typescript
const handleSaveConfig = async (config) => {
  // 保存到 localStorage
  saveModelConfig(config);
  
  // 同步到服务器（全局配置）
  await syncModelConfig(config);
};
```

## 迁移策略 (Migration Strategies)

### 策略 A: 渐进式迁移（推荐）

一次迁移一个功能，确保测试通过：

```typescript
// 第 1 周: 迁移用户管理
// 第 2 周: 迁移知识库管理
// 第 3 周: 迁移测试结果
// 第 4 周: 迁移配置
```

### 策略 B: 功能标志（Feature Flags）

```typescript
const ENABLE_SERVER_SYNC = true; // 可以在 .env 中配置

if (ENABLE_SERVER_SYNC) {
  await syncUserData(userId, data);
}
```

### 策略 C: 并行运行

同时保存到两个地方，比较结果：

```typescript
saveUserData(userId, data);     // localStorage
const synced = await syncUserData(userId, data); // server

if (!synced) {
  console.warn('⚠️ 服务器同步失败');
}
```

## 钩子 (Hooks) - 简化迁移

创建自定义 React 钩子来处理同步：

```typescript
// hooks/useSyncedState.ts

import { useState, useEffect } from 'react';

export const useSyncedUserData = (userId: string) => {
  const [data, setData] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始加载
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        // 尝试从服务器加载
        const serverData = await fetchUserData(userId);
        if (serverData) {
          saveUserData(userId, serverData);
          setData(serverData);
        } else {
          // 降级到 localStorage
          const localData = getUserData(userId);
          setData(localData);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userId]);

  // 保存函数
  const save = async (newData: KnowledgeBase[]) => {
    try {
      // 本地保存
      saveUserData(userId, newData);
      setData(newData);

      // 异步同步到服务器
      const synced = await syncUserData(userId, newData);
      if (!synced) {
        setError('⚠️ 服务器不可用');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return {
    data,
    isLoading,
    error,
    save
  };
};
```

使用钩子：

```typescript
function MyComponent() {
  const { data, isLoading, error, save } = useSyncedUserData(userId);

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      {data.map(kb => (...))}
      <button onClick={() => save([...data, newKb])}>
        添加知识库
      </button>
    </div>
  );
}
```

## 测试清单 (Testing Checklist)

迁移后，测试以下情况：

- [ ] **正常情况**: 服务器在线，数据应同步
  ```bash
  npm run server  # 启动服务器
  npm run dev      # 启动前端
  # 测试保存/加载数据
  ```

- [ ] **离线情况**: 服务器离线，使用 localStorage
  ```bash
  # 停止服务器 (Ctrl+C)
  # 测试保存/加载 - 应该使用 localStorage
  ```

- [ ] **恢复连接**: 重新连接后数据应同步
  ```bash
  # 重新启动服务器
  # 数据应该继续同步
  ```

- [ ] **备份/恢复**: 完整备份和恢复功能
  ```typescript
  const backup = await createBackup();
  // ... 清空数据 ...
  await restoreBackup(backup);
  ```

## 常见陷阱 (Common Pitfalls)

### ❌ 陷阱 1: 忘记等待 async

```typescript
// ❌ 错误
syncUserData(userId, data); // 没有 await，可能没有时间同步

// ✅ 正确
await syncUserData(userId, data);
```

### ❌ 陷阱 2: 没有错误处理

```typescript
// ❌ 错误
const data = await syncUserData(userId, data); // 可能返回 null

// ✅ 正确
const synced = await syncUserData(userId, data);
if (!synced) {
  console.warn('同步失败');
}
```

### ❌ 陷阱 3: 忘记更新 localStorage

```typescript
// ❌ 错误 - 只同步到服务器，没有更新本地
await syncUserData(userId, data);

// ✅ 正确 - 先保存到本地
saveUserData(userId, data);
await syncUserData(userId, data);
```

### ❌ 陷阱 4: 并发问题

```typescript
// ❌ 错误 - 快速连续调用可能导致不一致
save(data1);
save(data2);
save(data3);

// ✅ 正确 - 使用锁或按顺序处理
await save(data1);
await save(data2);
await save(data3);
```

## 回滚计划 (Rollback Plan)

如果迁移出现问题：

1. **保留 localStorage 代码** - 不要删除 `utils/storage.ts`
2. **环境变量切换** - 使用 `ENABLE_SERVER_SYNC` 快速禁用
3. **定期备份** - 使用 API 备份功能

```typescript
// 快速禁用服务器同步
if (process.env.REACT_APP_ENABLE_SERVER_SYNC !== 'false') {
  await syncUserData(userId, data);
}
```

## 成功标志 (Success Indicators)

迁移成功时，您应该看到：

✅ 数据在 `server/storage/` 中持久化
✅ 多个浏览器/标签之间同步数据
✅ 离线时优雅降级到 localStorage
✅ 无内存泄漏或不一致状态
✅ 测试覆盖率 > 80%
