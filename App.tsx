import React, { useState } from 'react';
import { View, User } from './types';
import { Sidebar } from './components/Sidebar';
import { Library } from './pages/Library';
import { Graph } from './pages/Graph';
import { Assessment } from './pages/Assessment';
import { Analytics } from './pages/Analytics';
import { Practice } from './pages/Practice';
import { LearningPath } from './pages/LearningPath';
import { About } from './pages/About';
import { Auth } from './pages/Auth';

export interface AssessmentContextType {
    kbId: string;
    nodeId: string;
    nodeLabel: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.LIBRARY);
  const [assessmentContext, setAssessmentContext] = useState<AssessmentContextType | null>(null);

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(View.LIBRARY); // Reset view on logout
  };

  const handleStartAssessment = (kbId: string, nodeId: string, nodeLabel: string) => {
      setAssessmentContext({ kbId, nodeId, nodeLabel });
      setCurrentView(View.ASSESSMENT);
  };
  
  if (!currentUser) {
    return <Auth onLogin={setCurrentUser} />;
  }

  const renderView = () => {
    switch (currentView) {
      case View.LIBRARY:
        return <Library userId={currentUser.id} />;
      case View.GRAPH:
        return <Graph userId={currentUser.id} />;
      case View.ASSESSMENT:
        return <Assessment 
          userId={currentUser.id} 
          context={assessmentContext} 
          onNextNode={handleStartAssessment}
        />;
      case View.ANALYTICS:
        return <Analytics userId={currentUser.id} />;
      case View.PRACTICE:
        return <Practice userId={currentUser.id} onStartAssessment={handleStartAssessment} />;
      case View.PATH:
        return <LearningPath userId={currentUser.id} onStartAssessment={handleStartAssessment} />;
      case View.ABOUT:
        return <About />;
      default:
        return <Library userId={currentUser.id} />;
    }
  };

  return (
    <div className="flex bg-background-light min-h-screen text-text-main">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <main className="flex-1 ml-20 lg:ml-64 relative min-h-screen">
        {renderView()}
      </main>
    </div>
  );
};

export default App;