import React from 'react';

export const About: React.FC = () => {
  // Since we cannot easily fetch local Markdown files in a client-only environment without build config changes,
  // we embed the text here for display purposes. The actual readme.md is also generated in the root.
  const readmeContent = `
# Learn Copilot Documentation

## 1. Project Overview
Learn Copilot is an AI-powered personal knowledge assistant. It allows users to upload learning materials (PDFs, Markdown, Text), generates visual knowledge graphs to show connections between concepts, and (in the future) provides adaptive learning paths, assessments, and spaced repetition practice.

## 2. Implementation Details

### 2.1 Authentication & User Management
*   **Mechanism:** Local Authentication (No backend server).
*   **Storage:** \`localStorage\` key \`learn_copilot_users\`.
*   **Logic:**
    *   **Registration:** Checks if username exists. If unique, saves \`User\` object (id, username, password, avatar).
    *   **Login:** Matches username/password against stored array.
    *   **Session:** State is held in \`App.tsx\`. Reloading the page requires re-login (for security in this demo), but data persists.

### 2.2 Data Persistence
*   **Mechanism:** \`localStorage\` + JSON Export/Import.
*   **Storage Key:** \`learn_copilot_data_{userId}\`.
*   **Structure:**
    *   \`KnowledgeBase\`: Represents a subject (e.g., "Biology"). Contains metadata and a list of \`KnowledgeFile\`s.
    *   \`GraphData\`: Stored directly inside the \`KnowledgeBase\` object to persist the generated node structure.

### 2.3 Knowledge Graph Generation (The Core AI Feature)
This feature converts unstructured text into a structured node-link diagram.

*   **Step 1: Aggregation:** All text content from files in a Knowledge Base is concatenated.
*   **Step 2: Prompt Engineering:** We send a prompt to **Gemini 1.5 Flash**.
    *   *Prompt Logic:* "Analyze these materials. Identify key concepts as 'nodes' (types: concept, fact, example). Identify relationships as 'edges'. Assign X/Y coordinates for a canvas."
    *   *Schema:* We enforce a JSON response schema ensuring \`nodes\` have \`{id, label, type, x, y}\` and \`edges\` have \`{source, target, label}\`.
*   **Step 3: Rendering:** The returned JSON is parsed and rendered in \`pages/Graph.tsx\` using SVG for edges and HTML \`div\`s for nodes.

### 2.4 Learning Path Generation
*   **Goal:** Convert the non-linear Knowledge Graph into a linear, step-by-step curriculum.
*   **Logic:** Sends the graph nodes to Gemini with a prompt to "Order these concepts from beginner to advanced and group them into modules."
*   **UI:** Renders a vertical timeline. Nodes become interactive buttons to start assessments.

### 2.5 Assessment & Grading
*   **Trigger:** User clicks a node in the Learning Path or Practice queue.
*   **Generation:** Gemini generates a Socratic question based on the original file context associated with that concept.
*   **Grading:** Gemini evaluates the user's answer against the source text, returning a score (0-100) and feedback.
*   **Mastery Status:** 
    *   **Mastered (Gold):** Score >= 85.
    *   **Passing (Green):** Score >= 60.
    *   **Learning (Default):** Score < 60 or Not Tested.

### 2.6 Spaced Repetition (Practice Module)
*   **Purpose:** The Practice module acts as a "Daily Review Queue".
*   **Algorithm:** Simplified SM-2 algorithm.
*   **Logic:**
    *   Score < 60: Reset interval to 0 days (Review immediately).
    *   Score >= 60: Interval * 1.5.
    *   Score >= 85: Interval * 2.5.
*   **Display:** The \`Practice\` page filters all past results where \`nextReviewDate <= Now\`.

---

## 3. 用户学习流程指南 (User Learning Workflow)

本指南将引导您完成从上传资料到掌握知识的完整闭环。

### 第一步：建立知识库 (Library)
1.  进入 **Library (图书馆)** 页面。
2.  在 "Create Knowledge Base" 输入框中填写您要学习的主题名称（例如 "React 基础" 或 "世界历史"）。
3.  点击 **Create Base** 按钮。
4.  *此时您创建了一个空的容器，用于存放特定领域的知识。*

### 第二步：导入学习资料 (Import)
1.  点击进入您刚创建的知识库卡片。
2.  点击 **Import Knowledge Sources** (或上传图标) 区域。
3.  选择并上传您的本地文件。
    *   支持格式：Markdown (.md), 纯文本 (.txt), PDF (.pdf)。
    *   *注意：为了获得最佳效果，建议上传结构清晰的文本笔记。*
4.  上传成功后，文件列表会显示在下方。

### 第三步：生成知识图谱 (Generate Graph)
1.  资料上传完毕后，点击右侧深色面板中的 **Generate Graph** 按钮。
2.  **AI 引擎 (Gemini)** 将开始阅读所有文件，分析其中的核心概念、事实和例子，并梳理它们之间的关联。
3.  生成完成后，按钮状态变为 "Regenerate"。
4.  您可以点击左侧菜单的 **Knowledge Graph**，查看可视化的思维导图，了解知识的全貌。

### 第三步：生成学习路径 (Learning Path)
1.  有了图谱后，前往 **Learning Path** 页面。
2.  点击您的知识库卡片。
3.  点击 **Generate Learning Path** 按钮。
4.  AI 会将网状的图谱结构转化为线性的、由浅入深的 **课程模块 (Modules)**。
    *   系统会自动锁定高级模块，建议您从第一个模块开始学习。

### 第四步：互动学习与测试 (Assessment)
1.  在学习路径的时间轴中，点击任意 **Active (活跃)** 状态的知识点按钮。
2.  系统将跳转至 **Testing** 页面。
3.  **AI Copilot** 会基于您上传的原文资料，向您提出一个这就该知识点的深度问题（Active Recall 主动回忆）。
4.  在输入框中输入您的理解并点击提交。
5.  AI 会根据原文进行评分（0-100分）并给出详细的反馈。
6.  **学习记录**: 系统会自动记录您的每一次测试结果。如果分数低于85分，建议点击 "Try Again" 重新挑战，直到变更为金色边框（Mastered）。

### 第五步：间隔重复复习 (Practice)
1.  **Practice** 模块是您的复习仪表盘。
2.  系统内置了 **SRS (间隔重复)** 算法，根据您的测试得分，自动计算该知识点下一次需要复习的时间（遗忘曲线）。
3.  每天访问 **Practice** 页面。
4.  查看 **"Due for Review"** 区域，系统会把今天需要复习的知识点列出来。
5.  点击 "Review Now" 再次进行测试，确保将短期记忆转化为长期记忆。
  `;

  // Simple parser to render Markdown headers and lists for display
  const renderContent = (content: string) => {
    return content.split('\n').map((line, index) => {
        if (line.startsWith('# ')) return <h1 key={index} className="text-3xl font-bold mt-8 mb-4 border-b border-slate-200 pb-2">{line.replace('# ', '')}</h1>;
        if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold mt-8 mb-4 text-slate-900">{line.replace('## ', '')}</h2>;
        if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-bold mt-6 mb-3 text-primary">{line.replace('### ', '')}</h3>;
        if (line.startsWith('* ')) return <li key={index} className="ml-6 list-disc mb-1 text-slate-700">{line.replace('* ', '')}</li>;
        if (line.startsWith('    * ')) return <li key={index} className="ml-10 list-[circle] mb-1 text-slate-600">{line.replace('    * ', '')}</li>;
        // Handle numbered lists manually for simple rendering
        if (/^\d+\.\s/.test(line)) return <li key={index} className="ml-6 list-decimal mb-1 text-slate-700">{line.replace(/^\d+\.\s/, '')}</li>;
        if (line.startsWith('---')) return <hr key={index} className="my-8 border-slate-200" />;
        if (line.startsWith('```')) return null; // Skip code block markers for simple render
        if (line.trim().length === 0) return <br key={index} />;
        return <p key={index} className="mb-2 text-slate-600 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 md:p-12 animate-fade-in-up h-screen overflow-y-auto">
      <header className="mb-8">
         <h1 className="text-4xl font-black text-slate-900 font-display">About Learn Copilot</h1>
         <p className="text-slate-500 mt-2">Technical documentation and roadmap.</p>
      </header>
      
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm prose prose-slate max-w-none mb-12">
        {renderContent(readmeContent)}
      </div>

      <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-500 font-mono mb-8">
        File location: /readme.md & /pages/About.tsx
      </div>
    </div>
  );
};