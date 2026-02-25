import { Routes, Route } from 'react-router-dom';
import React, { useEffect } from 'react';

import Sidebar from './Sidebar';
import AddApplicationForm from './AddApplicationForm';

import db, { addApplication } from './db';
import ApplicationsTable from './ApplicationsTable';
import './App.css';
import { importInitialDataIfNeeded } from '../main/dataImport';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  return <div className="text-2xl font-semibold">Dashboard (Coming Soon)</div>;
}



function Applications() {
  return <ApplicationsTable />;
}


import ScheduleView from './ScheduleView';
function Schedule() {
  return <ScheduleView />;
}

function Analytics() {
  return <div className="text-2xl font-semibold">Analytics Dashboard (Coming Soon)</div>;
}

function Stagnant() {
  return <div className="text-2xl font-semibold">Stagnant Applications (Coming Soon)</div>;
}

export default function App() {
  useEffect(() => {
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
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/stagnant" element={<Stagnant />} />
      </Routes>
    </Sidebar>
  );
}
