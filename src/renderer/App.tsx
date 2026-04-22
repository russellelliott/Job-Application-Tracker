import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React from 'react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Sidebar from './Sidebar';
import AddApplicationForm from './AddApplicationForm';
import { addApplication } from './db';
import ApplicationsTable from './ApplicationsTable';
import './App.css';
import { importInitialDataIfNeeded } from '../main/dataImport';
import ScheduleView from './ScheduleView';
import Dashboard from './Dashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import EditApplicationForm from './EditApplicationForm';
import BulkNetworkingImport from './BulkNetworkingImport';
import AddApplicationOptionsDialog from './AddApplicationOptionsDialog';

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
  const location = useLocation();
  const [snackOpen, setSnackOpen] = React.useState(false);
  const [optionsOpen, setOptionsOpen] = React.useState(false);

  const showGlobalAddBar =
    location.pathname === '/' ||
    location.pathname === '/applications' ||
    location.pathname === '/schedule' ||
    location.pathname === '/analytics';
  const handleAddApplication = async (app: any) => {
    // Use a UUID for new application IDs
    const generateUuid = () => {
      if (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
        return (crypto as any).randomUUID();
      // fallback simple uuid v4
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    };

    const id = generateUuid();
    await addApplication({ ...app, id });
    setSnackOpen(true);
    return id;
  };

  return (
    <Sidebar>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route
              path="/applications/add"
              element={<AddApplicationForm onSubmit={handleAddApplication} />}
            />
            <Route
              path="/applications/:id/edit"
              element={<EditApplicationForm />}
            />
            <Route
              path="/applications/bulk-import"
              element={<BulkNetworkingImport />}
            />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
          </Routes>
        </div>

        {showGlobalAddBar && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              background: '#fff',
              paddingTop: 12,
              paddingBottom: 12,
              marginTop: 12,
              borderTop: '1px solid #e5e7eb',
              zIndex: 20,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOptionsOpen(true)}
              sx={{
                textTransform: 'none',
                px: 4,
                py: 1,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Add New Application(s)
            </Button>
          </div>
        )}
      </div>

      <AddApplicationOptionsDialog
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onSelectManual={() => navigate('/applications/add')}
        onSelectBulk={() => navigate('/applications/bulk-import')}
      />
      <Snackbar
        open={snackOpen}
        autoHideDuration={2000}
        onClose={() => setSnackOpen(false)}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Application added
        </Alert>
      </Snackbar>
    </Sidebar>
  );
}
