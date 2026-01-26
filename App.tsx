import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DailyLog } from './pages/DailyLog';
import { CreateProject } from './pages/CreateProject';
import { EditProject } from './pages/EditProject';
import { ProjectDetail } from './pages/ProjectDetail';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Main Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Executive Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Project Management */}
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/edit" element={<EditProject />} />
          
          {/* Daily Log */}
          <Route path="/daily-log" element={<DailyLog />} />

          {/* Legacy/Alias routes to prevent breaking if someone uses old links */}
          <Route path="/create" element={<Navigate to="/projects/new" replace />} />
          <Route path="/daily" element={<Navigate to="/daily-log" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;