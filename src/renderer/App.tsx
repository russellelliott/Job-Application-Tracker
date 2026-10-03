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
import ViewApplication from './ViewApplication';
import BulkNetworkingImport from './BulkNetworkingImport';
import AddApplicationOptionsDialog from './AddApplicationOptionsDialog';
import BackupRestoreDialog from './BackupRestoreDialog';
import ContactsPage from './ContactsPage';
import { exportBackup, restoreBackupDocs } from './backup';
import type { BackupFile, JobApplication } from '../types';

function Applications() {
  return (
     <div
       style={{
         height: '100%',
         minHeight: 0,
         display: 'flex',
         flexDirection: 'column',
         overflow: 'hidden',
        }}
      >
       <ApplicationsTable />
      </div>
    );
}

function Schedule() {
  return (
     <div
       style={{
         height: '100%',
         minHeight: 0,
         display: 'flex',
         flexDirection: 'column',
         overflow: 'hidden',
        }}
      >
       <ScheduleView />
      </div>
    );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

   // Snackbar state
  const [snackOpen, setSnackOpen] = React.useState(false);
  const [snackMessage, setSnackMessage] = React.useState('');
  const [snackSeverity, setSnackSeverity] = React.useState<
     'success' | 'error' | 'info'
   >('success');

   // Add application options dialog
  const [optionsOpen, setOptionsOpen] = React.useState(false);

   // Backup/Restore state
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [restoreBackup, setRestoreBackup] = React.useState<BackupFile | null>(
    null
   );
  const [restoreError, setRestoreError] = React.useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = React.useState(false);

  React.useEffect(() => {
    importInitialDataIfNeeded();

     // Listen for backup trigger events from the menu
    const handleBackupCreateTrigger = () => {
      handleCreateBackup();
     };
    const handleBackupRestoreTrigger = () => {
      handleRestoreBackup();
     };

    window.electron.ipcRenderer.on(
       'backup:create:trigger',
      handleBackupCreateTrigger
     );
    window.electron.ipcRenderer.on(
       'backup:restore:trigger',
      handleBackupRestoreTrigger
     );

    return () => {
      window.electron.ipcRenderer.removeListener(
         'backup:create:trigger',
        handleBackupCreateTrigger
       );
      window.electron.ipcRenderer.removeListener(
         'backup:restore:trigger',
        handleBackupRestoreTrigger
       );
     };
   }, []);

   // Snackbar auto-close
  React.useEffect(() => {
    if (snackOpen) {
      const timer = setTimeout(
         () => setSnackOpen(false),
        snackSeverity === 'error' ? 5000 : 3000
       );
      return () => clearTimeout(timer);
     }
   }, [snackOpen, snackSeverity]);

   // Add Application handler
  const handleAddApplication = async (app: any) => {
    const generateUuid = () => {
      if (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
        return (crypto as any).randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
         /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
         }
       );
      };

    const id = generateUuid();
    await addApplication({ ...app, id });
    setSnackMessage('Application added');
    setSnackSeverity('success');
    setSnackOpen(true);
    return id;
   };

   // Backup handler: trigger main process to open save dialog and write backup
  const handleCreateBackup = async () => {
    try {
      const result = await window.electron.createBackup(await exportBackup());
      if (result.success && result.filePath) {
        setSnackMessage('Backup saved to ' + result.filePath);
        setSnackSeverity('success');
       } else {
        setSnackMessage(result.error || 'Backup failed');
        setSnackSeverity('error');
       }
      } catch (err: any) {
      setSnackMessage(err?.message || 'Backup failed');
      setSnackSeverity('error');
     }
    setSnackOpen(true);
   };

   // Restore handler: trigger main process to open file dialog, read, validate
  const handleRestoreBackup = async () => {
    setRestoreError(null);
    setRestoreBackup(null);
    setRestoreLoading(true);

    try {
      const result = await window.electron.restoreBackup();

      if (result.error === 'Cancelled') {
         // User cancelled, no error to show
        return;
       }

      if (!result.valid || !result.backup) {
        setRestoreError(result.error || 'Failed to load backup');
        setRestoreDialogOpen(true);
        return;
       }

      setRestoreBackup(result.backup);
      setRestoreDialogOpen(true);
     } catch (err: any) {
      setRestoreError(err?.message || 'Restore failed');
     } finally {
      setRestoreLoading(false);
     }
   };

   const handleRestoreConfirm = async () => {
    setRestoreLoading(true);
    try {
      const docs = restoreBackup?.docs ?? [];
      const currentBackup = await exportBackup();
      const result = await window.electron.confirmRestore(docs, currentBackup);
      if (!result.success) {
        setRestoreError(result.error || 'Restore failed');
       } else {
         await restoreBackupDocs(docs);
          // Renderer reloaded its UI after successful restore (local call)
         setSnackMessage('Backup restored successfully');
         setSnackSeverity('success');
         setSnackOpen(true);
         setRestoreDialogOpen(false);
         setRestoreBackup(null);
        }
      } catch (err: any) {
      setRestoreError(err?.message || 'Restore failed');
     } finally {
      setRestoreLoading(false);
     }
   };

  const handleRestoreCancel = async () => {
    try {
      await window.electron.cancelRestore();
     } catch {
       // Ignore cancel errors
     }
    setRestoreDialogOpen(false);
    setRestoreBackup(null);
   };

  const handleCloseRestoreDialog = () => {
    setRestoreDialogOpen(false);
    setRestoreBackup(null);
   };

  const showGlobalAddBar =
    location.pathname === '/' ||
    location.pathname === '/applications' ||
    location.pathname === '/schedule' ||
    location.pathname === '/analytics' ||
    location.pathname === '/contacts';

  return (
     <Sidebar>
       <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          paddingBottom: showGlobalAddBar ? 78 : 0,
          boxSizing: 'border-box',
         }}
        >
         <div
           style={{
             flex: 1,
             minHeight: 0,
             display: 'flex',
             flexDirection: 'column',
             overflow: 'hidden',
             position: 'relative',
            }}
           >
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
               path="/applications/:id/view"
               element={<ViewApplication />}
               />
              <Route
               path="/applications/bulk-import"
               element={<BulkNetworkingImport />}
               />
              <Route path="/schedule" element={<Schedule />} />
<Route path="/analytics" element={<AnalyticsDashboard />} />
               <Route path="/contacts" element={<ContactsPage />} />
             </Routes>
           </div>

           {showGlobalAddBar && (
             <div
               style={{
                 position: 'fixed',
                 left: 0,
                 right: 0,
                 bottom: 0,
                 background: '#fff',
                 paddingTop: 12,
                 paddingBottom: 12,
                 borderTop: '1px solid #e5e7eb',
                 zIndex: 1200,
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
               autoHideDuration={3000}
               onClose={() => setSnackOpen(false)}
               anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
               >
                 <Alert
                   onClose={() => setSnackOpen(false)}
                   severity={snackSeverity}
                   sx={{ width: '100%' }}
                    >
                      {snackMessage}
                     </Alert>
                   </Snackbar>

                   <BackupRestoreDialog
                     open={restoreDialogOpen}
                     backup={restoreBackup}
                     error={restoreError}
                     loading={restoreLoading}
                     onClose={handleCloseRestoreDialog}
                     onConfirm={handleRestoreConfirm}
                     onCancel={handleRestoreCancel}
                      />
                    </Sidebar>
                   );
                 }
