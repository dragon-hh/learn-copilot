# 🧪 提示词优化效果验证指南 (Verification & Testing Guide)

**目的**: 验证优化后的提示词是否有效改善了 JSON 质量  
**时间**: 15-30 分钟  
**难度**: ⭐⭐ (中等)

---

## 🎯 快速验证（5 分钟）

### 验证 1: 打开 Settings 页面查看新提示词

```
1. 前端应用 → Settings 页面
2. 向下滚动到 "Prompts Configuration"
3. 找到 "生成知识图谱" 和 "生成学习路径"
4. 对比新旧提示词
```

**预期**: 新提示词应该明显更长，包含详细的 JSON 示例

---

### 验证 2: 生成一个简单的知识图谱

```
1. 前端应用 → Library 页面
2. 创建一个新知识库，输入简单文本：
   "Python 是一种编程语言。Python 有变量、函数、类。"
3. 点击 "生成图谱"
4. 等待生成完成
5. 打开浏览器 DevTools → Console
6. 查看是否有错误
```

**预期**:
- ✅ 生成成功（不出现红色错误）
- ✅ 返回的 JSON 包含 topic、nodes、edges
- ✅ 每个 node 都有 id、label、type、x、y
- ✅ type 只是 'concept'|'fact'|'example'
- ✅ x 在 50-750，y 在 50-550

---

### 验证 3: 生成学习路径

```
1. 已生成图谱的知识库 → Learning Path 页面
2. 选择该知识库
3. 点击 "生成学习路径"
4. 等待生成完成
5. 打开浏览器 DevTools → Console
6. 查看是否有错误
```

**预期**:
- ✅ 生成成功（不出现红色错误）
- ✅ 返回的 JSON 包含 modules 数组
- ✅ 每个 module 都有 id、title、nodeIds
- ✅ modules 数量在 2-10 之间
- ✅ nodeIds 都引用了有效的节点 ID

---

## 🔬 详细验证（20 分钟）

### 测试场景 1: 简单知识库

**输入文本**:
```
HTML 是网页的骨架。HTML 包含标签。常见的标签有 div、span、p。
```

**步骤**:
1. 创建知识库，输入上述文本
2. 生成图谱
3. 记录返回的 JSON

**预期结果**:
```json
{
  "topic": "HTML基础",
  "nodes": [
    { "id": "node_1", "label": "HTML", "type": "concept", "x": 200, "y": 150 },
    { "id": "node_2", "label": "标签", "type": "concept", "x": 400, "y": 150 },
    { "id": "node_3", "label": "div", "type": "example", "x": 300, "y": 300 }
  ],
  "edges": [
    { "source": "node_1", "target": "node_2", "label": "包含" }
  ]
}
```

**验证清单**:
- [ ] topic 是中文
- [ ] nodes 有 3+ 个元素
- [ ] 每个 node 都完整
- [ ] type 只是允许的值
- [ ] 坐标在范围内
- [ ] edges 是有效的数组

---

### 测试场景 2: 中等复杂知识库

**输入文本**:
```
JavaScript 是一种编程语言。JavaScript 用于网页交互。
JavaScript 有变量、函数、对象。
变量存储数据。函数执行代码。对象组织相关数据。
常见的对象有数组、日期、正则表达式。
```

**步骤**:
1. 创建知识库，输入上述文本
2. 生成图谱
3. 检查返回数据的完整性

**验证清单**:
- [ ] 生成成功，无解析错误
- [ ] nodes 数量在 5-15 之间（合理范围）
- [ ] type 多样化（有 concept/fact/example）
- [ ] edges 正确连接了节点
- [ ] 所有坐标都在范围内

---

### 测试场景 3: 学习路径生成

**前提**: 已生成测试场景 2 的图谱

**步骤**:
1. 进入 Learning Path 页面
2. 选择上述知识库
3. 点击 "生成学习路径"
4. 检查返回数据

**验证清单**:
- [ ] 生成成功，无解析错误
- [ ] modules 数量在 2-5 之间
- [ ] 每个 module 都有完整字段
- [ ] 每个 module 的 nodeIds 都有效
- [ ] title 是中文，10-50 字符
- [ ] modules 按从简单到复杂排列

---

## 📊 对比测试

### 测试 A: 检查错误率降低

**方法 1: 检查浏览器 Console**

```javascript
// 在浏览器 DevTools 中运行以下代码：

// 统计解析错误
const storage = JSON.parse(localStorage.getItem('learn_copilot_data') || '{}');
const bases = storage.knowledgeBases || [];

let errorCount = 0;
for (const base of bases) {
  if (!base.graphData) continue;
  
  const { topic, nodes, edges } = base.graphData;
  
  // 检查必需字段
  if (!topic || !nodes || !edges) {
    console.error(`❌ 基础 ${base.id}: 缺少必需字段`);
    errorCount++;
    continue;
  }
  
  // 检查 nodes
  for (const node of nodes) {
    if (!node.id || !node.label || !node.type || node.x === undefined || node.y === undefined) {
      console.error(`❌ 节点 ${node.id}: 缺少字段`);
      errorCount++;
    }
    if (!['concept', 'fact', 'example'].includes(node.type)) {
      console.error(`❌ 节点 ${node.id}: 无效的 type=${node.type}`);
      errorCount++;
    }
    if (node.x < 50 || node.x > 750 || node.y < 50 || node.y > 550) {
      console.error(`❌ 节点 ${node.id}: 坐标超出范围`);
      errorCount++;
    }
  }
}

console.log(`\n总错误数: ${errorCount}`);
```

**预期**:
- 优化前: 错误数多
- 优化后: 错误数接近 0

---

### 测试 B: 检查完整性

```javascript
// 验证 JSON 完整性

function validateGraphData(data) {
  const issues = [];
  
  if (!data.topic) issues.push('缺少 topic');
  if (!Array.isArray(data.nodes)) issues.push('nodes 不是数组');
  if (!Array.isArray(data.edges)) issues.push('edges 不是数组');
  
  if (data.nodes.length < 3) issues.push('nodes 少于 3 个');
  if (data.nodes.length > 20) issues.push('nodes 超过 20 个');
  
  for (const node of (data.nodes || [])) {
    if (!node.id || !node.label || !node.type || node.x === undefined || node.y === undefined) {
      issues.push(`节点 ${node.id} 缺少字段`);
    }
  }
  
  return issues;
}

// 使用示例
const exampleData = JSON.parse(localStorage.getItem('...'));
const issues = validateGraphData(exampleData.graphData);
console.log(issues.length === 0 ? '✅ 数据完整' : `❌ 发现 ${issues.length} 个问题`);
```

---

## 📈 质量指标收集

### 指标 1: 成功率

```
测试 10 个知识库生成：
✅ 成功数: _____ / 10
❌ 失败数: _____ / 10

成功率: _____ %  (目标: > 90%)
```

### 指标 2: 完整性

```
检查 10 个生成的图谱：
✅ 所有字段完整: _____ / 10
❌ 缺少字段: _____ / 10

完整性: _____ %  (目标: > 95%)
```

### 指标 3: 有效性

```
检查 10 个生成的图谱：
✅ 所有值符合约束: _____ / 10
❌ 无效值: _____ / 10

有效性: _____ %  (目标: > 95%)
```

### 指标 4: 性能

```
测试 5 个不同大小的文本：
小 (500字)   : _____ 秒
中 (2000字)  : _____ 秒
大 (5000字)  : _____ 秒

平均耗时: _____ 秒
```

---

## ✅ 完整测试检查清单

### 知识图谱生成

- [ ] 简单文本生成成功
- [ ] 中等长度文本生成成功
- [ ] 复杂长文本生成成功
- [ ] 返回的 JSON 能成功 parse
- [ ] topic 是非空字符串
- [ ] nodes 数组有 3-20 个元素
- [ ] 每个 node 都有 id 字段
- [ ] 每个 node 都有 label 字段
- [ ] 每个 node 都有 type 字段
- [ ] 每个 node 都有 x 和 y 字段
- [ ] type 只是 'concept'|'fact'|'example'
- [ ] x 坐标在 50-750 范围内
- [ ] y 坐标在 50-550 范围内
- [ ] edges 是数组（可为空）
- [ ] 所有 edge 的 source/target 都有效
- [ ] 浏览器 console 没有红色错误

### 学习路径生成

- [ ] 简单图谱生成路径成功
- [ ] 中等图谱生成路径成功
- [ ] 复杂图谱生成路径成功
- [ ] 返回的 JSON 能成功 parse
- [ ] modules 数组有 2-10 个元素
- [ ] 每个 module 都有 id 字段
- [ ] 每个 module 都有 title 字段
- [ ] 每个 module 都有 nodeIds 字段
- [ ] 每个 module 的 id 格式为 module_X
- [ ] 每个 module 的 title 是中文
- [ ] 每个 module 的 title 长度 5-50 字符
- [ ] 每个 module 的 nodeIds 至少 1 个
- [ ] 所有 nodeIds 都引用有效节点
- [ ] status 只是 'locked'|'active'|'completed'
- [ ] modules 按逻辑顺序排列
- [ ] 浏览器 console 没有红色错误

---

## 🐛 故障排除

### 问题 1: JSON 解析失败

```
症状: "Cannot parse JSON"
原因可能:
1. ❌ AI 没有返回有效的 JSON
2. ❌ JSON 包含不可转义的字符
3. ❌ JSON 结构不符合预期

解决方案:
✅ 在 console 中打印返回的原始文本
✅ 检查是否有多余的字符或换行
✅ 查看 DevTools Network 标签看完整的 API 返回
```

### 问题 2: 缺少字段

```
症状: "Cannot read property 'x' of undefined"
原因可能:
1. ❌ 模型没有返回完整的 node 结构
2. ❌ 字段名错误（如 "coordinate" vs "x"）

解决方案:
✅ 增加 AI 模型的提示词中的约束强度
✅ 在解析前添加校验逻辑
✅ 如果值缺失，提供默认值
```

### 问题 3: 无效的枚举值

```
症状: type 的值是 "主概念" 而非 "concept"
原因可能:
1. ❌ 模型混淆了中文和英文
2. ❌ 模型没有看到枚举约束

解决方案:
✅ 在提示词中用粗体/大写强调允许的值
✅ 使用后处理函数规范化值
✅ 添加映射表处理常见的错误值
```

### 问题 4: 坐标超出范围

```
症状: x=1000 或 y=-50
原因可能:
1. ❌ 模型没有看到范围约束
2. ❌ 模型生成了随机坐标

解决方案:
✅ 在提示词中明确写 "必须在 50 到 750 之间"
✅ 添加后处理修正超出范围的坐标
```

---

## 📝 记录表格

### 测试记录表

| 测试项 | 日期 | 文本大小 | 成功/失败 | 错误数 | 备注 |
|--------|------|---------|---------|--------|------|
| 测试 1 | 2026-01-19 | 简单 | ✅/❌ | 0 | |
| 测试 2 | 2026-01-19 | 中等 | ✅/❌ | 0 | |
| 测试 3 | 2026-01-19 | 复杂 | ✅/❌ | 0 | |
| 测试 4 | 2026-01-19 | 长文本 | ✅/❌ | 0 | |
| 测试 5 | 2026-01-19 | 特殊字符 | ✅/❌ | 0 | |

### 质量指标总结

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| JSON 解析成功率 | >90% | __% | ✅/❌ |
| 字段完整性 | >95% | __% | ✅/❌ |
| 值有效性 | >95% | __% | ✅/❌ |
| 生成平均耗时 | <30s | __s | ✅/❌ |

---

## 🎯 验证完成标准

### 🟢 优化成功（全部通过）
- ✅ 所有测试场景都成功生成
- ✅ JSON 解析成功率 > 90%
- ✅ 字段完整性 > 95%
- ✅ 值有效性 > 95%
- ✅ 没有致命错误

### 🟡 优化部分成功（通过大部分）
- ✅ 大部分测试场景成功
- ✅ JSON 解析成功率 > 80%
- ✅ 字段完整性 > 85%
- ⚠️ 某些情况下仍有错误

### 🔴 优化失败（需要调整）
- ❌ 多个测试场景失败
- ❌ JSON 解析成功率 < 80%
- ❌ 频繁出现结构错误
- ❌ 需要进一步优化提示词

---

## 📚 参考资料

- 查看 [PROMPT_OPTIMIZATION_GUIDE.md](PROMPT_OPTIMIZATION_GUIDE.md) 了解优化细节
- 查看 [PROMPT_COMPARISON_DETAILED.md](PROMPT_COMPARISON_DETAILED.md) 了解前后对比
- 查看 [utils/prompts.ts](utils/prompts.ts) 查看实现

---

**验证指南完成日期**: 2026-01-19  
**预期验证时间**: 15-30 分钟  
**预期结果**: ✅ 优化成功，JSON 质量显著提升

祝验证顺利！ 🧪

