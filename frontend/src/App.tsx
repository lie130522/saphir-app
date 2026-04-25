import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './contexts/useAuth';

import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import RapportsArchives from './pages/RapportsArchives';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import Users from './pages/Users';
import { SettingsProvider } from './contexts/SettingsProvider';

function ProtectedRoute({ children, reqRole }: { children: React.ReactNode, reqRole?: string }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (reqRole === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/employes" element={<ProtectedRoute><PageTransition><Employees /></PageTransition></ProtectedRoute>} />
        <Route path="/projets" element={<ProtectedRoute><PageTransition><Projects /></PageTransition></ProtectedRoute>} />
        <Route path="/comptes" element={<ProtectedRoute><PageTransition><Accounts /></PageTransition></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><PageTransition><Transactions /></PageTransition></ProtectedRoute>} />
        <Route path="/rapports" element={<ProtectedRoute><PageTransition><Reports /></PageTransition></ProtectedRoute>} />
        <Route path="/archives" element={<ProtectedRoute><PageTransition><RapportsArchives /></PageTransition></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><PageTransition><Documents /></PageTransition></ProtectedRoute>} />
        <Route path="/utilisateurs" element={<ProtectedRoute reqRole="admin"><PageTransition><Users /></PageTransition></ProtectedRoute>} />
        <Route path="/parametres" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}
