import { Routes, Route } from 'react-router-dom';
import React, { useEffect } from 'react';


import Sidebar from './Sidebar';
import AddApplicationForm from './AddApplicationForm';
import db, { addApplication } from './db';
import ApplicationsTable from './ApplicationsTable';
import './App.css';
import { importInitialDataIfNeeded } from '../main/dataImport';
import { useNavigate } from 'react-router-dom';
import ScheduleView from './ScheduleView';
import Dashboard from './Dashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import StagnantApplications from './StagnantApplications';
import EditApplicationForm from './EditApplicationForm';

function Applications() {
  return <ApplicationsTable />;
}

function Schedule() {
  return <ScheduleView />;
}

export default function App() {
  React.useEffect(() => {
    importInitialDataIfNeeded();
  }, []);

  // Add Application handler
  const navigate = useNavigate();
  const handleAddApplication = async (app: any) => {
    // Generate a unique id
    const id = `${app.company_name || 'draft'}-${Date.now()}`;
    await addApplication({ ...app, id });
    navigate('/applications');
  };

  return (
    <Sidebar>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/add" element={<AddApplicationForm onSubmit={handleAddApplication} />} />
        <Route path="/applications/:id/edit" element={<EditApplicationForm />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/stagnant" element={<StagnantApplications />} />
      </Routes>
    </Sidebar>
  );
}
