
import React from 'react';
import { NavLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Job Tracker
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" component={NavLink} to="/">Dashboard</Button>
            <Button color="inherit" component={NavLink} to="/applications">Applications</Button>
            <Button color="inherit" component={NavLink} to="/schedule">Schedule</Button>
            <Button color="inherit" component={NavLink} to="/analytics">Analytics</Button>
          </Box>
        </Toolbar>
      </AppBar>
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: 16, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
