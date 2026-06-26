import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicMap from './pages/PublicMap';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import StoreDashboard from './pages/StoreDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicMap />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/provider" element={<ProviderDashboard />} />
        <Route path="/store" element={<StoreDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
