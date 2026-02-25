import { Routes, Route } from 'react-router-dom';
import React, { useEffect } from 'react';


import Sidebar from './Sidebar';
import AddApplicationForm from './AddApplicationForm';
import db, { addApplication, getAllApplications } from './db';
import ApplicationsTable from './ApplicationsTable';
import './App.css';
import { importInitialDataIfNeeded } from '../main/dataImport';
import { useNavigate } from 'react-router-dom';
import ScheduleView from './ScheduleView';
import Dashboard from './Dashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import EditApplicationForm from './EditApplicationForm';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

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
  const [snackOpen, setSnackOpen] = React.useState(false);
  const handleAddApplication = async (app: any) => {
    // Determine next numeric id in DB (stored as strings)
    try {
      const all = await getAllApplications();
      const numericIds = all
        .map(a => parseInt((a.id || '').toString(), 10))
        .filter(n => !isNaN(n));
      const nextIdNum = numericIds.length ? Math.max(...numericIds) + 1 : 1;
      const id = `${nextIdNum}`;
      await addApplication({ ...app, id });
      setSnackOpen(true);
      setTimeout(() => navigate('/applications'), 700);
    } catch (e) {
      // fallback to timestamp id
      const id = `${app.company_name || 'draft'}-${Date.now()}`;
      await addApplication({ ...app, id });
      setSnackOpen(true);
      setTimeout(() => navigate('/applications'), 700);
    }
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
      </Routes>
      <Snackbar open={snackOpen} autoHideDuration={2000} onClose={() => setSnackOpen(false)}>
        <Alert onClose={() => setSnackOpen(false)} severity="success" sx={{ width: '100%' }}>Application added</Alert>
      </Snackbar>
    </Sidebar>
  );
}

