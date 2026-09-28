import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { BackupFile } from '../types';

// Restore preview dialog — shows backup details and requires confirmation
interface BackupRestoreDialogProps {
  open: boolean;
  backup: BackupFile | null;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function BackupRestoreDialog({
  open,
  backup,
  error,
  loading,
  onClose,
  onConfirm,
  onCancel,
}: BackupRestoreDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Reset confirmation state when dialog opens with new backup
  React.useEffect(() => {
    if (open && backup) {
      setConfirmed(false);
    }
  }, [open, backup]);

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
       });
    } catch {
      return iso;
     }
   };

  const handleConfirmClick = () => {
    setConfirmed(true);
    onConfirm();
  };

  return (
    <Dialog open={open} onClose={onCancel || onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {error ? 'Error' : backup ? 'Restore Backup' : 'Loading...'}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
         ) : backup ? (
          <Box>
            <Typography variant="body1" gutterBottom>
              This backup was created on{' '}
              <strong>{formatDateTime(backup.createdAt)}</strong>.
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Backup Summary
              </Typography>
              <Typography variant="body1">
                Records: <strong>{backup.docs.length}</strong>
              </Typography>
              <Typography variant="body1">
                Format: <strong>{backup.format}</strong>
              </Typography>
              <Typography variant="body1">
                Version: <strong>{backup.version}</strong>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Restoring this backup will replace all current data with{' '}
                {backup.docs.length} record{backup.docs.length !== 1 ? '(s)' : ''}.
                A pre-restore backup will be created automatically before proceeding.
              </Typography>
            </Alert>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="backup-confirm-check"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  if (e.target.checked) {
                    onConfirm();
                   }
                 }}
                style={{ marginRight: 8, cursor: 'pointer' }}
               />
              <label htmlFor="backup-confirm-check" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                I understand this will replace all current data
              </label>
            </Box>
          </Box>
         ) : (
          <Typography variant="body2" color="text.secondary">
            Loading backup details...
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {error ? (
          <Button onClick={onClose} autoFocus>
            Close
          </Button>
         ) : (
          <>
            <Button
              onClick={onCancel || onClose}
              disabled={loading}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmClick}
              disabled={!confirmed || loading}
              color="primary"
              sx={{ mr: 1 }}
            >
              {loading ? 'Restoring...' : 'Restore Data'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
