export const PROMPT_STORAGE_KEY = 'learn_copilot_prompts_config';

export enum PromptKey {
    GENERATE_GRAPH = 'generate_graph',
    CHAT_WITH_GRAPH = 'chat_with_graph',
    GENERATE_QUESTION = 'generate_question',
    EVALUATE_ANSWER = 'evaluate_answer',
    GENERATE_PATH = 'generate_path',
    ANALYTICS_INSIGHTS = 'analytics_insights'
}

export interface PromptConfig {
    key: PromptKey;
    label: string;
    description: string;
    template: string;
}

export const DEFAULT_PROMPTS: Record<PromptKey, string> = {
    [PromptKey.GENERATE_GRAPH]: `你是一个专业的教学内容分析专家。请分析提供的学习材料，生成一个结构化的知识图谱。

任务要求：
1. 识别关键概念作为图谱节点（包含 x,y 坐标，用于 800x600 画布）
2. 确定概念之间的关系作为图谱的连线
3. 所有文本内容必须使用中文（简体）

返回格式必须是有效的 JSON，包含以下字段：
{
  "topic": "主要主题名称（中文）",
  "nodes": [
    {
      "id": "唯一标识符（例如 node_1, node_2）",
      "label": "概念名称（中文）",
      "type": "节点类型（必须是以下之一：'concept'、'fact'、'example'）",
      "x": 数字值（必须在50到750之间，代表水平位置）,
      "y": 数字值（必须在50到550之间，代表垂直位置）
    }
  ],
  "edges": [
    {
      "source": "源节点的id",
      "target": "目标节点的id",
      "label": "关系描述（中文，可选）"
    }
  ]
}

重要约束：
- nodes 数组至少包含 3 个元素，最多 20 个
- 每个 node 必须包含 id、label、type、x、y 字段
- type 字段只能是：'concept'、'fact' 或 'example' 中的一个
- x 坐标范围：50-750，y 坐标范围：50-550
- edges 数组可为空，但必须是数组类型
- 确保所有节点 ID 唯一，且边的 source 和 target 都引用存在的节点 ID
- 不要添加额外字段或嵌套结构

Materials:
{{input}}`,

    [PromptKey.CHAT_WITH_GRAPH]: `You are an AI assistant helping a user understand a Knowledge Graph about "{{topic}}".
        
Graph Structure:
- Nodes: {{nodes}}
- Connections: {{edges}}

Answer the user's question based on this graph structure and your general knowledge about the topic.
IMPORTANT: ALWAYS answer in Chinese (Simplified).
Keep answers concise and helpful.`,

    [PromptKey.GENERATE_QUESTION]: `Generate a single, specific active recall question about the concept "{{topic}}" based on the text below. 
Do not provide the answer. Make it thought-provoking.
IMPORTANT: Generate the question in Chinese (Simplified).

Context:
{{context}}`,

    [PromptKey.EVALUATE_ANSWER]: `Evaluate the user's answer to the question based on the provided context.
IMPORTANT: 
1. Provide the feedback in Chinese (Simplified).
2. Return a valid JSON object.
3. The JSON must contain exactly two fields: "score" (number 0-100) and "feedback" (string). 
4. Do not wrap the JSON in a root object like "evaluation".

Context: {{context}}
Question: {{question}}
User Answer: {{userAnswer}}`,

    [PromptKey.GENERATE_PATH]: `你是一个课程设计专家。请根据提供的知识图谱节点，设计一个结构化的学习路径。

任务要求：
1. 将知识节点分组成若干个学习模块
2. 按照从初级到高级的顺序安排模块
3. 每个模块应该逻辑清晰、循序渐进
4. 所有文本必须使用中文（简体）

返回格式必须是有效的 JSON，包含以下结构：
{
  "modules": [
    {
      "id": "唯一模块标识符（例如 module_1, module_2）",
      "title": "模块标题（中文，简明扼要）",
      "description": "模块描述（中文，说明本模块的学习目标）",
      "nodeIds": ["node_id_1", "node_id_2", "node_id_3"],
      "status": "模块状态（可选，可以是 'locked'、'active' 或 'completed'）"
    }
  ]
}

重要约束：
- modules 数组必须至少包含 2 个元素，最多 10 个
- 每个 module 必须包含 id、title、nodeIds 字段
- id 字段必须唯一且格式为 module_X（X为数字）
- title 字段必须是中文文本，长度 5-50 个字符
- description 字段如果存在，必须是中文文本，长度 10-200 个字符
- nodeIds 必须是数组，至少包含 1 个节点 ID
- status 字段如果存在，只能是以下值之一：'locked'、'active'、'completed'
- 确保 nodeIds 中引用的节点 ID 在输入数据中存在
- 不要添加额外字段或修改结构
- 不要返回空数组或无效数据

知识图谱节点列表：
{{nodes}}`,

    [PromptKey.ANALYTICS_INSIGHTS]: `Analyze the following student learning data and provide constructive feedback in Chinese (Simplified).

Data:
- Total Assessments Taken: {{totalTests}}
- Average Tests Per Day: {{avgPerDay}}
- Overall Average Score: {{avgScore}}
- Weak Topics (<60%): {{weakPoints}}
- Strong Topics (>85%): {{strongPoints}}

Generate a JSON response with two fields:
1. 'speed': A personalized comment on their learning pace and consistency (approx 30-40 words). Mention the daily average if it's notable.
2. 'recommendation': A specific, actionable study recommendation. If there are weak topics, specifically name them and suggest review strategies. If strong, suggest expanding knowledge (approx 30-40 words).`
};

export const PROMPT_DESCRIPTIONS: Record<PromptKey, {label: string, desc: string}> = {
    [PromptKey.GENERATE_GRAPH]: { label: "生成知识图谱", desc: "用于解析上传的文件并生成节点和连线的 Prompt。" },
    [PromptKey.CHAT_WITH_GRAPH]: { label: "图谱对话助手", desc: "在知识图谱页面，AI 回答用户关于当前主题问题的 Prompt。" },
    [PromptKey.GENERATE_QUESTION]: { label: "生成测试题", desc: "在智能测试中，根据知识点生成具体问题的 Prompt。" },
    [PromptKey.EVALUATE_ANSWER]: { label: "评分与反馈", desc: "在智能测试中，评估用户回答并给出分数的 Prompt。" },
    [PromptKey.GENERATE_PATH]: { label: "生成学习路径", desc: "将散乱的知识节点组织成线性课程模块的 Prompt。" },
    [PromptKey.ANALYTICS_INSIGHTS]: { label: "学习数据分析", desc: "根据用户的历史学习数据生成建议和点评的 Prompt。" },
};

export const getPrompt = (key: PromptKey): string => {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[key]) {
            return parsed[key];
        }
    }
    return DEFAULT_PROMPTS[key];
};

export const saveAllPrompts = (prompts: Record<string, string>) => {
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(prompts));
};

export const getAllPrompts = (): Record<PromptKey, string> => {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    const storedPrompts = stored ? JSON.parse(stored) : {};
    return { ...DEFAULT_PROMPTS, ...storedPrompts };
};

export const resetPrompts = () => {
    localStorage.removeItem(PROMPT_STORAGE_KEY);
};