import { KnowledgeBase, User, AssessmentResult, AssessmentHistoryLog, KnowledgeFile, GraphData, LearningPathData } from '../types';

const USERS_KEY = 'learn_copilot_users';
const DATA_PREFIX = 'learn_copilot_data_';
const RESULTS_PREFIX = 'learn_copilot_results_';
const HISTORY_PREFIX = 'learn_copilot_history_';

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

const DEMO_KB: KnowledgeBase = {
    id: DEMO_KB_ID,
    title: 'React 基础 (演示)',
    description: '预加载的演示数据，用于探索 React 概念、图谱可视化和测试流程。',
    tag: '演示',
    progress: 45,
    status: '进行中',
    lastUpdated: new Date().toLocaleDateString(),
    files: DEMO_FILES,
    graphData: DEMO_GRAPH,
    learningPath: DEMO_PATH
};

// Demo results to populate Practice Page
const DEMO_RESULTS: AssessmentResult[] = [
    {
        id: 'res-1',
        kbId: DEMO_KB_ID,
        nodeId: 'n1',
        nodeLabel: 'React',
        score: 95,
        feedback: '定义非常准确。你正确地指出了它是一个用于构建 UI 的库。',
        timestamp: Date.now() - 172800000, // 2 days ago
        nextReviewDate: Date.now() + 86400000, // Tomorrow
        interval: 3,
        repetition: 2
    },
    {
        id: 'res-2',
        kbId: DEMO_KB_ID,
        nodeId: 'n2',
        nodeLabel: '组件 (Component)',
        score: 45,
        feedback: '你漏掉了关于它“独立封装”的关键点。',
        timestamp: Date.now() - 86400000, // Yesterday
        nextReviewDate: Date.now() - 1000, // Due NOW
        interval: 0,
        repetition: 1
    }
];

interface StoredUser extends User {
  password: string; // Plaintext for this demo requirement
}

// --- Auth ---

export const registerUser = (username: string, password: string, avatar?: string): User | null => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];

  if (users.find(u => u.username === username)) {
    return null; // User exists
  }

  const newUser: StoredUser = {
    id: Date.now().toString(),
    username,
    password,
    avatar
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // Return public user object (without password)
  return { id: newUser.id, username: newUser.username, avatar: newUser.avatar };
};

export const loginUser = (username: string, password: string): User | null => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];
  
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    return { id: user.id, username: user.username, avatar: user.avatar };
  }
  return null;
};

// --- Data Persistence (Knowledge Bases) ---

export const getUserData = (userId: string): KnowledgeBase[] => {
  const data = localStorage.getItem(DATA_PREFIX + userId);
  
  // Inject Demo Data if empty
  if (!data || JSON.parse(data).length === 0) {
      const seed = [DEMO_KB];
      saveUserData(userId, seed);
      return seed;
  }
  
  return JSON.parse(data);
};

export const saveUserData = (userId: string, bases: KnowledgeBase[]) => {
  localStorage.setItem(DATA_PREFIX + userId, JSON.stringify(bases));
};

// --- Assessment Results (SRS State) ---

export const getAssessmentResults = (userId: string): AssessmentResult[] => {
  const data = localStorage.getItem(RESULTS_PREFIX + userId);
  
  // Inject Demo Results if empty
  if (!data) {
      localStorage.setItem(RESULTS_PREFIX + userId, JSON.stringify(DEMO_RESULTS));
      return DEMO_RESULTS;
  }

  return JSON.parse(data);
};

export const saveAssessmentResult = (userId: string, result: AssessmentResult) => {
  const results = getAssessmentResults(userId);
  // Keep only the LATEST result for this node (replace old one) to manage SRS state
  const filtered = results.filter(r => r.nodeId !== result.nodeId);
  filtered.push(result);
  localStorage.setItem(RESULTS_PREFIX + userId, JSON.stringify(filtered));
};

// --- Assessment History (Full Logs) ---

export const getAssessmentHistory = (userId: string): AssessmentHistoryLog[] => {
  const data = localStorage.getItem(HISTORY_PREFIX + userId);
  return data ? JSON.parse(data) : [];
};

export const saveAssessmentHistory = (userId: string, log: AssessmentHistoryLog) => {
  const history = getAssessmentHistory(userId);
  history.push(log); // Append to end, keeping all records
  localStorage.setItem(HISTORY_PREFIX + userId, JSON.stringify(history));
};

// --- Mastery Logic ---
// Returns 'mastered' (>=85), 'passing' (>=60), or 'learning' (<60 or none)
export const getNodeMasteryStatus = (userId: string, nodeId: string): 'mastered' | 'passing' | 'learning' => {
    const results = getAssessmentResults(userId);
    const result = results.find(r => r.nodeId === nodeId);
    
    if (!result) return 'learning';
    if (result.score >= 85) return 'mastered';
    if (result.score >= 60) return 'passing';
    return 'learning';
};

// --- Simple SM-2 inspired SRS Algorithm ---
export const calculateSRS = (previousResult: AssessmentResult | undefined, score: number) => {
  // Score 0-100. We consider >= 60 "Passing".
  
  if (!previousResult) {
    // New item
    return {
      interval: score >= 60 ? 1 : 0, // 1 day if passed, 0 if failed
      repetition: score >= 60 ? 1 : 0,
      nextReviewDate: Date.now() + (score >= 60 ? 24 * 60 * 60 * 1000 : 0)
    };
  }

  if (score < 60) {
    // Failed: Reset
    return {
      interval: 0,
      repetition: 0,
      nextReviewDate: Date.now()
    };
  }

  // Passed: Increase interval
  // Multiplier: 80+ -> 2.5x, 60+ -> 1.5x
  const multiplier = score >= 85 ? 2.5 : 1.5;
  let newInterval = Math.ceil(previousResult.interval * multiplier);
  if (newInterval === 0) newInterval = 1;

  return {
    interval: newInterval,
    repetition: previousResult.repetition + 1,
    nextReviewDate: Date.now() + (newInterval * 24 * 60 * 60 * 1000)
  };
};

// --- Backup & Restore (JSON File) ---

export const createBackupJSON = (): string => {
  const usersStr = localStorage.getItem(USERS_KEY);
  const users: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];
  
  const backupData: any = {
    timestamp: new Date().toISOString(),
    users: users,
    userData: {},
    resultsData: {},
    historyData: {}
  };

  users.forEach(user => {
    const key = DATA_PREFIX + user.id;
    const data = localStorage.getItem(key);
    if (data) {
      backupData.userData[user.id] = JSON.parse(data);
    }
    
    const resultsKey = RESULTS_PREFIX + user.id;
    const results = localStorage.getItem(resultsKey);
    if (results) {
        backupData.resultsData[user.id] = JSON.parse(results);
    }

    const historyKey = HISTORY_PREFIX + user.id;
    const history = localStorage.getItem(historyKey);
    if (history) {
        backupData.historyData[user.id] = JSON.parse(history);
    }
  });

  return JSON.stringify(backupData, null, 2);
};

export const restoreBackupJSON = (jsonString: string): boolean => {
  try {
    const backup = JSON.parse(jsonString);
    
    // Restore Users
    if (Array.isArray(backup.users)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(backup.users));
    }

    // Restore User Data
    if (backup.userData && typeof backup.userData === 'object') {
      Object.keys(backup.userData).forEach(userId => {
        localStorage.setItem(DATA_PREFIX + userId, JSON.stringify(backup.userData[userId]));
      });
    }

    // Restore Results
    if (backup.resultsData && typeof backup.resultsData === 'object') {
        Object.keys(backup.resultsData).forEach(userId => {
          localStorage.setItem(RESULTS_PREFIX + userId, JSON.stringify(backup.resultsData[userId]));
        });
    }

    // Restore History
    if (backup.historyData && typeof backup.historyData === 'object') {
        Object.keys(backup.historyData).forEach(userId => {
          localStorage.setItem(HISTORY_PREFIX + userId, JSON.stringify(backup.historyData[userId]));
        });
    }

    return true;
  } catch (error) {
    console.error("Failed to restore backup:", error);
    return false;
  }
};