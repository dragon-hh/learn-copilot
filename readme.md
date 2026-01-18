# Learn Copilot Documentation

## 1. Project Overview
Learn Copilot is an AI-powered personal knowledge assistant. It allows users to upload learning materials (PDFs, Markdown, Text), generates visual knowledge graphs to show connections between concepts, and provides adaptive learning paths, assessments, and spaced repetition practice.

## 2. Implementation Details

### 2.1 Authentication & User Management
*   **Mechanism:** Local Authentication (No backend server).
*   **Storage:** `localStorage` key `learn_copilot_users`.
*   **Logic:**
    *   **Registration:** Checks if username exists. If unique, saves `User` object (id, username, password, avatar).
    *   **Login:** Matches username/password against stored array.
    *   **Session:** State is held in `App.tsx`.

### 2.2 Data Persistence & Backup
*   **Mechanism:** `localStorage` + JSON Export/Import.
*   **Storage Key:** `learn_copilot_data_{userId}`.
*   **Structure:**
    *   `KnowledgeBase`: Represents a subject. Contains files, graph data, and learning paths.
    *   `AssessmentResult`: Stores individual test scores and SRS scheduling data in `learn_copilot_results_{userId}`.

### 2.3 Knowledge Graph (AI)
*   **Prompt:** Sends concatenated file content to Gemini to identify nodes (Concepts/Facts/Examples) and Edges.
*   **Visual:** Custom SVG+HTML canvas rendering in `pages/Graph.tsx`.

### 2.4 Learning Path (AI)
*   **Logic:** `pages/LearningPath.tsx` sends the generated Graph Nodes to Gemini.
*   **Prompt:** "Group these nodes into linear modules ordered from Beginner to Advanced."
*   **UI:** Renders a vertical timeline. Nodes act as entry points to Assessments.

### 2.5 Assessment & Testing (AI)
*   **Logic:** `pages/Assessment.tsx` is triggered via the Path or Practice queue.
*   **Generation:** "Generate a Socratic question about [Node] based on [File Context]."
*   **Grading:** User answer + Context -> Gemini -> Score (0-100) + Feedback.
*   **Result:** Saved to localStorage with a calculated `nextReviewDate`.

### 2.6 Practice (SRS Algorithm)
*   **Logic:** `pages/Practice.tsx` loads all assessment results.
*   **Filtering:** Displays items where `nextReviewDate <= Date.now()`.
*   **Algorithm:** Simplified SM-2.
    *   Score < 60: Interval reset to 0 days (Next review: Immediate).
    *   Score >= 60: Interval * 1.5.
    *   Score >= 85: Interval * 2.5.
