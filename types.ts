export enum View {
  LIBRARY = 'library',
  GRAPH = 'graph',
  ASSESSMENT = 'assessment',
  ANALYTICS = 'analytics',
  PATH = 'path',
  PRACTICE = 'practice',
  ABOUT = 'about',
  SETTINGS = 'settings'
}

export interface NavItem {
  id: View;
  label: string;
  icon: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'concept' | 'fact' | 'example';
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  topic: string;
}

export type FileType = 'md' | 'pdf' | 'txt';

export interface KnowledgeFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  date: string;
  content?: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  nodeIds: string[];
  status: 'locked' | 'active' | 'completed';
}

export interface LearningPathData {
  modules: LearningModule[];
}

export interface KnowledgeBase {
  id: string;
  title: string;
  description: string;
  tag: string;
  progress: number;
  status: string;
  lastUpdated: string;
  files: KnowledgeFile[];
  graphData?: GraphData | null;
  learningPath?: LearningPathData | null;
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
}

// Used for SRS (Spaced Repetition) state - keeps only the LATEST status per node
export interface AssessmentResult {
  id: string;
  kbId: string;
  nodeId: string;
  nodeLabel: string;
  score: number; // 0-100
  feedback: string;
  timestamp: number;
  nextReviewDate: number; // Timestamp
  interval: number; // Days
  repetition: number; // Count
}

// Used for Historical Logs - keeps EVERY attempt
export interface AssessmentHistoryLog {
  id: string;
  userId: string;
  kbId: string;
  nodeId: string;
  nodeLabel: string;
  question: string;
  userAnswer: string;
  score: number;
  feedback: string;
  timestamp: number;
}