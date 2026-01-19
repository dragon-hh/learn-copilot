# 实现清单 (Implementation Checklist)

使用此清单跟踪后端集成进度。

## 第 1 阶段: 环境设置 (Phase 1: Environment Setup)

### 基础设置
- [x] 创建 `server/index.js` 文件
- [x] 更新 `package.json` 添加 Express 和 CORS
- [x] 创建 `.env.example` 文件
- [x] 创建 `utils/server-sync.ts` 库

### 目标
```bash
npm install
npm run server  # 应该显示 "Server running at http://localhost:3001"
```

---

## 第 2 阶段: 功能实现 (Phase 2: Feature Implementation)

### 2.1 用户认证 (Authentication)

**后端 API**:
- [x] `POST /api/auth/register` - 注册用户
- [x] `POST /api/auth/login` - 用户登录
- [x] `GET /api/users` - 获取所有用户

**测试**:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123","avatar":"url"}'

# 检查文件: server/storage/users.json
```

**前端集成**:
- [ ] 在 Auth 组件中调用 sync 函数
- [ ] 显示 sync 状态指示器

### 2.2 知识库管理 (Knowledge Base)

**后端 API**:
- [x] `GET /api/users/:userId/knowledge-bases`
- [x] `POST /api/users/:userId/knowledge-bases`

**测试**:
```typescript
import { syncUserData, fetchUserData } from './utils/server-sync';

// 保存
await syncUserData(userId, knowledgeBases);

// 加载
const data = await fetchUserData(userId);
```

**前端集成**:
- [ ] 在 Library 组件中添加 sync 调用
- [ ] 实现加载+保存 flow

### 2.3 测试成绩 (Assessment Results)

**后端 API**:
- [x] `GET /api/users/:userId/assessment-results`
- [x] `POST /api/users/:userId/assessment-results`

**前端集成**:
- [ ] 在 Assessment 组件中保存成绩
- [ ] 同步到服务器

### 2.4 学习历史 (Assessment History)

**后端 API**:
- [x] `GET /api/users/:userId/assessment-history`
- [x] `POST /api/users/:userId/assessment-history`

**前端集成**:
- [ ] 记录所有测试尝试
- [ ] 同步历史记录

### 2.5 AI 洞察 (AI Insights)

**后端 API**:
- [x] `GET /api/users/:userId/ai-insights`
- [x] `POST /api/users/:userId/ai-insights`

**前端集成**:
- [ ] 在 Analytics 组件中保存洞察
- [ ] 加载并显示洞察

### 2.6 配置管理 (Configuration)

**后端 API**:
- [x] `GET /api/model-config`
- [x] `POST /api/model-config`
- [x] `GET /api/prompts-config`
- [x] `POST /api/prompts-config`

**前端集成**:
- [ ] 在 Settings 组件中保存配置
- [ ] 同步全局配置

### 2.7 备份与恢复 (Backup & Restore)

**后端 API**:
- [x] `POST /api/backup` - 创建备份
- [x] `POST /api/restore` - 恢复备份

**前端集成**:
- [ ] 添加备份按钮
- [ ] 添加恢复功能

### 2.8 健康检查 (Health Check)

**后端 API**:
- [x] `GET /api/health`

**前端集成**:
- [ ] 定期检查服务器状态
- [ ] 显示连接状态

---

## 第 3 阶段: 前端集成 (Phase 3: Frontend Integration)

### 3.1 认证页面 (Auth.tsx)

```typescript
import { syncUserData } from '../utils/server-sync';

// 注册后同步
const handleRegister = async (username, password) => {
  const user = registerUser(username, password);
  if (user) {
    await syncUserData(user.id, []);
    // 重定向到登录
  }
};
```

**检查清单**:
- [ ] 注册时创建用户目录
- [ ] 初始化空的知识库
- [ ] 显示成功消息

### 3.2 资料库页面 (Library.tsx)

```typescript
import { fetchUserData, syncUserData } from '../utils/server-sync';

// 加载时从服务器获取
useEffect(() => {
  const load = async () => {
    const data = await fetchUserData(userId);
    if (data) {
      saveUserData(userId, data);
      setKnowledgeBases(data);
    }
  };
  load();
}, [userId]);

// 保存时同步到服务器
const handleSave = async (newKB) => {
  const data = [...knowledgeBases, newKB];
  saveUserData(userId, data);
  await syncUserData(userId, data);
};
```

**检查清单**:
- [ ] 启动时从服务器加载
- [ ] 添加/删除/编辑知识库时同步
- [ ] 显示 sync 状态

### 3.3 智能测试 (Assessment.tsx)

```typescript
import { syncAssessmentResults } from '../utils/server-sync';

const handleSubmitAnswer = async (nodeId, score) => {
  // 创建结果对象
  const result = createAssessmentResult(nodeId, score);
  
  // 保存到 localStorage
  saveAssessmentResult(userId, result);
  
  // 同步到服务器
  const allResults = getAssessmentResults(userId);
  await syncAssessmentResults(userId, allResults);
};
```

**检查清单**:
- [ ] 保存每个测试的成绩
- [ ] 同步到服务器
- [ ] 支持 SRS 算法

### 3.4 学习分析 (Analytics.tsx)

```typescript
import { syncAiInsights, fetchAiInsights } from '../utils/server-sync';

const handleGenerateInsights = async () => {
  const insights = await generateAiInsights(userId);
  
  // 保存到 localStorage
  saveAiInsights(userId, insights);
  
  // 同步到服务器
  await syncAiInsights(userId, insights);
};
```

**检查清单**:
- [ ] 从服务器加载洞察
- [ ] 生成新洞察时同步
- [ ] 显示离线/在线状态

### 3.5 设置页面 (Settings.tsx)

```typescript
import { syncModelConfig, syncPromptsConfig } from '../utils/server-sync';

const handleSaveConfig = async (config) => {
  saveModelConfig(config);
  await syncModelConfig(config);
};

const handleSavePrompts = async (prompts) => {
  saveAllPrompts(prompts);
  await syncPromptsConfig(prompts);
};
```

**检查清单**:
- [ ] 保存模型配置
- [ ] 保存自定义提示词
- [ ] 添加备份/恢复功能

---

## 第 4 阶段: 测试 (Phase 4: Testing)

### 4.1 单元测试 (Unit Tests)

```typescript
// tests/server-sync.test.ts
describe('server-sync', () => {
  it('should sync user data to server', async () => {
    const result = await syncUserData('user-123', []);
    expect(result).toBe(true);
  });

  it('should fetch user data from server', async () => {
    const data = await fetchUserData('user-123');
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**检查清单**:
- [ ] 编写 sync 函数的单元测试
- [ ] 编写 API 端点的单元测试
- [ ] 测试覆盖率 > 80%

### 4.2 集成测试 (Integration Tests)

```typescript
// tests/integration.test.ts
describe('End-to-End Flow', () => {
  it('should register user and save knowledge base', async () => {
    // 1. 注册
    const user = await register('test', 'password');
    
    // 2. 保存知识库
    await syncUserData(user.id, [kb1, kb2]);
    
    // 3. 验证服务器文件
    const saved = await fetchUserData(user.id);
    expect(saved).toEqual([kb1, kb2]);
  });
});
```

**检查清单**:
- [ ] 编写完整的流程测试
- [ ] 测试离线场景
- [ ] 测试错误恢复

### 4.3 手动测试 (Manual Testing)

#### 测试 1: 完整在线工作流
```
1. 启动服务器: npm run server
2. 启动前端: npm run dev
3. 打开浏览器: http://localhost:5173
4. 注册新用户
5. 添加知识库
6. 检查 server/storage/users.json 文件
7. 检查 server/storage/user-{userId}/ 文件
8. 预期: 所有文件都存在且有正确数据
```

**检查清单**:
- [ ] 用户数据已创建
- [ ] 知识库已保存
- [ ] 测试成绩已保存
- [ ] 配置已同步

#### 测试 2: 离线工作
```
1. 启动应用
2. 添加一些数据
3. 停止服务器: Ctrl+C
4. 继续使用应用
5. 预期: 应用仍然可用，数据保存在 localStorage
6. 重启服务器
7. 预期: 数据自动同步
```

**检查清单**:
- [ ] 服务器离线时应用可用
- [ ] 数据保存在 localStorage
- [ ] 重新连接后自动同步

#### 测试 3: 多设备同步
```
1. 在设备 A 上添加知识库
2. 服务器自动同步
3. 在设备 B 上加载应用
4. 预期: 看到来自设备 A 的知识库
5. 在设备 B 上添加数据
6. 在设备 A 上刷新
7. 预期: 看到来自设备 B 的数据
```

**检查清单**:
- [ ] 数据在设备间同步
- [ ] 没有冲突或数据丢失
- [ ] 时间戳正确

#### 测试 4: 备份和恢复
```
1. 创建一些数据
2. 创建备份: 调用 API 或按钮
3. 删除 server/storage/ 文件夹
4. 恢复备份
5. 预期: 所有数据恢复
```

**检查清单**:
- [ ] 备份包含所有数据
- [ ] 恢复成功且完整
- [ ] 没有数据损坏

#### 测试 5: 错误处理
```
1. 启动应用，没有服务器
2. 尝试保存数据
3. 预期: 优雅降级，使用 localStorage
4. 启动服务器
5. 预期: 自动同步
```

**检查清单**:
- [ ] 没有崩溃或错误
- [ ] 清晰的用户反馈
- [ ] 自动恢复

---

## 第 5 阶段: 优化 (Phase 5: Optimization)

### 5.1 性能优化

- [ ] 添加请求缓存
- [ ] 实现差异同步（只同步改变的字段）
- [ ] 批量操作
- [ ] 删除过期数据

### 5.2 用户体验

- [ ] 显示 sync 状态指示器
- [ ] 添加重试机制
- [ ] 离线提示
- [ ] 进度条

### 5.3 错误处理

- [ ] 自动重试
- [ ] 用户友好的错误消息
- [ ] 错误日志
- [ ] 自动修复机制

---

## 第 6 阶段: 生产准备 (Phase 6: Production Readiness)

### 6.1 安全加固

- [ ] 实现密码哈希（bcrypt）
- [ ] 添加 JWT 认证
- [ ] 验证所有输入
- [ ] 限制 CORS 来源
- [ ] 添加速率限制

### 6.2 部署准备

- [ ] 环境变量配置
- [ ] 日志系统
- [ ] 监控告警
- [ ] 自动备份
- [ ] 错误追踪（Sentry）

### 6.3 数据库迁移

- [ ] 评估 NoSQL vs SQL
- [ ] 设计数据库架构
- [ ] 迁移脚本
- [ ] 性能测试

---

## 快速参考 (Quick Reference)

### 运行服务器
```bash
npm install
npm run server
```

### 查看 API
```bash
curl http://localhost:3001/api/health
```

### 查看数据
```bash
ls -la server/storage/
cat server/storage/users.json
```

### 清空存储
```bash
rm -rf server/storage/*
```

### 检查前端 sync
```typescript
import { checkServerHealth } from './utils/server-sync';
const isOnline = await checkServerHealth();
console.log(isOnline ? '✅ 在线' : '❌ 离线');
```

---

## 问题排除 (Troubleshooting)

| 问题 | 症状 | 解决方案 |
|------|------|--------|
| 端口占用 | "Address already in use" | `PORT=3002 npm run server` |
| CORS 错误 | 请求被阻止 | 检查服务器是否运行 |
| 文件找不到 | 404 错误 | 检查 `server/storage/` 存在 |
| 权限错误 | 无法写入文件 | 检查文件夹权限 |
| JSON 解析错误 | 数据损坏 | 手动修复 JSON 文件 |

---

## 时间估计 (Time Estimates)

| 阶段 | 任务数 | 预计时间 |
|------|-------|--------|
| 环境设置 | 4 | 15 分钟 |
| 功能实现 | 8 | 2-3 小时 |
| 前端集成 | 5 | 3-4 小时 |
| 测试 | 4 | 2-3 小时 |
| 优化 | 3 | 1-2 小时 |
| 生产准备 | 3 | 4-6 小时 |
| **总计** | **27** | **12-20 小时** |

---

**开始日期**: ___________
**完成日期**: ___________
**总耗时**: ___________

**签名**: ___________
