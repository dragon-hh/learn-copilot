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
    [PromptKey.GENERATE_GRAPH]: `Analyze the following learning materials and generate a knowledge graph structure in Chinese.
Identify key concepts as nodes (with x,y coordinates for a 800x600 canvas layout) and their relationships as edges.
Use Chinese for all 'label' fields.`,

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
IMPORTANT: Provide the feedback in Chinese (Simplified).

Context: {{context}}
Question: {{question}}
User Answer: {{userAnswer}}`,

    [PromptKey.GENERATE_PATH]: `Given the following knowledge graph nodes, arrange them into a logical, linear learning curriculum. 
Group related concepts into modules. Order modules from Beginner to Advanced.
IMPORTANT: Generate the 'title' and 'description' in Chinese (Simplified).

Nodes:
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