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
    // Use a UUID for new application IDs
    const generateUuid = () => {
      if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID();
      // fallback simple uuid v4
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
      });
    };

    const id = generateUuid();
    await addApplication({ ...app, id });
    setSnackOpen(true);
    return id;
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

