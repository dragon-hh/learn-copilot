import { KnowledgeBase, User, AssessmentResult, AssessmentHistoryLog, KnowledgeFile, GraphData, LearningPathData } from '../types';

const USERS_KEY = 'learn_copilot_users';
const DATA_PREFIX = 'learn_copilot_data_';
const RESULTS_PREFIX = 'learn_copilot_results_';
const HISTORY_PREFIX = 'learn_copilot_history_';
const INSIGHTS_PREFIX = 'learn_copilot_insights_';
const MODEL_CONFIG_KEY = 'learn_copilot_model_config';

export interface AiInsightsData {
    speed: string;
    recommendation: string;
    timestamp: number;
}

export interface ModelConfig {
    modelName: string; // e.g., 'gemini-3-flash-preview', 'deepseek-chat'
    baseUrl?: string; // Optional custom endpoint
    apiKey?: string; // User provided key
    corsProxy?: string; // Optional CORS proxy URL
}

// --- DEMO DATA CONSTANTS (CHINESE) ---
const DEMO_KB_ID = 'demo-kb-react';
const DEMO_FILES: KnowledgeFile[] = [
    {
        id: 'file-1',
        name: 'React_基础.md',
        type: 'md',
        size: '2.5 KB',
        date: new Date().toLocaleDateString(),
        content: `
# React 简介

React 是一个用于构建用户界面的 JavaScript 库。它在内存中创建了一个虚拟 DOM（Virtual DOM）。

## 组件 (Components)
组件是任何 React 应用程序的构建块。组件是一个独立的模块，用于渲染某些输出。

## JSX
JSX 是 JavaScript 的语法扩展。它看起来像 XML 或 HTML。

## Props (属性)
Props（属性的缩写）是将数据从父组件传递到子组件的一种方式。

## State (状态)
State 是一个普通的 JavaScript 对象，React 使用它来表示关于组件当前情况的信息。
        `
    }
];

const DEMO_GRAPH: GraphData = {
    topic: "React 基础知识",
    nodes: [
        { id: 'n1', label: 'React', type: 'concept', x: 400, y: 300 },
        { id: 'n2', label: '组件 (Component)', type: 'concept', x: 250, y: 200 },
        { id: 'n3', label: 'JSX', type: 'fact', x: 550, y: 200 },
        { id: 'n4', label: 'Props (属性)', type: 'concept', x: 250, y: 450 },
        { id: 'n5', label: 'State (状态)', type: 'concept', x: 400, y: 450 },
        { id: 'n6', label: '虚拟 DOM', type: 'example', x: 550, y: 350 },
    ],
    edges: [
        { source: 'n1', target: 'n2', label: '使用' },
        { source: 'n1', target: 'n3', label: '语法扩展' },
        { source: 'n1', target: 'n6', label: '实现' },
        { source: 'n2', target: 'n4', label: '接收' },
        { source: 'n2', target: 'n5', label: '管理' },
    ]
};

const DEMO_PATH: LearningPathData = {
    modules: [
        {
            id: 'mod-1',
            title: '核心架构',
            description: '理解基本构建块和语法规则。',
            nodeIds: ['n1', 'n3', 'n6'],
            status: 'completed'
        },
        {
            id: 'mod-2',
            title: '组件结构',
            description: '如何构建和管理组件数据。',
            nodeIds: ['n2', 'n4', 'n5'],
            status: 'active'
        }
    ]
};

// --- AUTH FUNCTIONS ---

export const registerUser = (username: string, password: string, avatar?: string): User | null => {
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (users.find(u => u.username === username)) {
        return null; // User exists
    }

    const newUser: User = {
        id: 'user-' + Date.now(),
        username,
        avatar
    };

    // In a real app, store password hash. Here we act as if we did auth.
    // For local demo, we just store the user object.
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Initialize with Demo Data
    const initialKb: KnowledgeBase = {
        id: DEMO_KB_ID,
        title: 'React 基础',
        description: 'React 核心概念入门指南。',
        tag: 'Frontend',
        progress: 35,
        status: '进行中',
        lastUpdated: new Date().toLocaleDateString(),
        files: DEMO_FILES,
        graphData: DEMO_GRAPH,
        learningPath: DEMO_PATH
    };
    saveUserData(newUser.id, [initialKb]);

    return newUser;
};

export const loginUser = (username: string, password: string): User | null => {
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    return users.find(u => u.username === username) || null;
};

// --- DATA FUNCTIONS ---

export const getUserData = (userId: string): KnowledgeBase[] => {
    const key = DATA_PREFIX + userId;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

export const saveUserData = (userId: string, data: KnowledgeBase[]) => {
    const key = DATA_PREFIX + userId;
    localStorage.setItem(key, JSON.stringify(data));
};

export const getAssessmentResults = (userId: string): AssessmentResult[] => {
    const key = RESULTS_PREFIX + userId;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

export const saveAssessmentResult = (userId: string, result: AssessmentResult) => {
    const key = RESULTS_PREFIX + userId;
    const existing = getAssessmentResults(userId);
    // Remove old result for this specific node if exists (keep only latest for SRS)
    const filtered = existing.filter(r => r.nodeId !== result.nodeId);
    filtered.push(result);
    localStorage.setItem(key, JSON.stringify(filtered));
};

export const getAssessmentHistory = (userId: string): AssessmentHistoryLog[] => {
    const key = HISTORY_PREFIX + userId;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

export const saveAssessmentHistory = (userId: string, log: AssessmentHistoryLog) => {
    const key = HISTORY_PREFIX + userId;
    const existing = getAssessmentHistory(userId);
    existing.push(log);
    localStorage.setItem(key, JSON.stringify(existing));
};

// --- AI INSIGHTS PERSISTENCE ---

export const getAiInsights = (userId: string): AiInsightsData | null => {
    const key = INSIGHTS_PREFIX + userId;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};

export const saveAiInsights = (userId: string, data: AiInsightsData) => {
    const key = INSIGHTS_PREFIX + userId;
    localStorage.setItem(key, JSON.stringify(data));
};

// --- MODEL CONFIGURATION ---

export const getModelConfig = (): ModelConfig => {
    const stored = localStorage.getItem(MODEL_CONFIG_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    // Default Config
    return {
        modelName: 'gemini-3-flash-preview',
        baseUrl: '',
        apiKey: ''
    };
};

export const saveModelConfig = (config: ModelConfig) => {
    localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(config));
};

// --- SRS LOGIC (Simplified SM-2) ---
export const calculateSRS = (prevResult: AssessmentResult | undefined, currentScore: number) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    let interval = 1; // Default 1 day
    let repetition = 0;

    if (prevResult) {
        interval = prevResult.interval;
        repetition = prevResult.repetition;
    }

    if (currentScore < 60) {
        // Reset
        repetition = 0;
        interval = 0; // Review immediately/tomorrow
    } else {
        repetition += 1;
        if (repetition === 1) {
            interval = 1;
        } else if (repetition === 2) {
            interval = 3;
        } else {
            // Factor based on performance
            const factor = currentScore >= 85 ? 2.5 : 1.5;
            interval = Math.ceil(interval * factor);
        }
    }

    return {
        interval: interval,
        repetition: repetition,
        nextReviewDate: now + (interval * oneDay)
    };
};

// --- BACKUP ---
export const createBackupJSON = () => {
    const data: any = {};
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('learn_copilot_')) {
            data[key] = localStorage.getItem(key);
        }
    });
    return JSON.stringify(data);
};

export const restoreBackupJSON = (jsonString: string) => {
    try {
        const data = JSON.parse(jsonString);
        Object.keys(data).forEach(key => {
            if (key.startsWith('learn_copilot_')) {
                localStorage.setItem(key, data[key]);
            }
        });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};