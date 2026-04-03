import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

type AddApplicationOptionsDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectBulk: () => void;
};

export default function AddApplicationOptionsDialog({
  open,
  onClose,
  onSelectManual,
  onSelectBulk,
}: AddApplicationOptionsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Add New Application(s)</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <List disablePadding>
          <ListItemButton
            onClick={() => {
              onClose();
              onSelectManual();
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemText
              primary="Fill individual application manually"
              secondary="Create one application record"
            />
          </ListItemButton>
          <ListItemButton
            onClick={() => {
              onClose();
              onSelectBulk();
            }}
            sx={{ borderRadius: 1, mt: 1 }}
          >
            <ListItemText
              primary="AI Bulk Networking Import"
              secondary="Parse notes into multiple records"
            />
          </ListItemButton>
        </List>
      </DialogContent>
    </Dialog>
  );
}
