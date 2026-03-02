
import React from 'react';
import { NavLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import { useEffect, useState } from 'react';
import { getAllApplications } from './db';
import Box from '@mui/material/Box';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState({ today: 0, upcoming: 0 });

  useEffect(() => {
    let mounted = true;
    getAllApplications().then(apps => {
      if (!mounted) return;
      let todayC = 0;
      let upcomingC = 0;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      apps.forEach(app => {
        (app.timeline || []).forEach((ev: any) => {
          const stage = ev.stage || '';
          if (ev && (stage === 'Assessment' || (typeof stage === 'string' && stage.startsWith('Interview')))) {
            const dueStr = ev.due_date || ev.date;
            if (dueStr) {
               const d = new Date(dueStr);
               // Compare dates ignoring time
               const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

               if (dTime === todayStart) {
                 todayC++;
               }
               if (dTime >= todayStart) {
                 upcomingC++;
               }
            }
          }
        });
      });
      setCounts({ today: todayC, upcoming: upcomingC });
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

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
            <Badge badgeContent={counts.upcoming} color="warning" anchorOrigin={{ vertical: 'top', horizontal: 'left' }}>
              <Badge badgeContent={counts.today} color="error">
                <Button color="inherit" component={NavLink} to="/schedule">Schedule</Button>
              </Badge>
            </Badge>
            <Button color="inherit" component={NavLink} to="/analytics">Analytics</Button>
          </Box>
        </Toolbar>
      </AppBar>
      <main style={{ flex: 1, backgroundColor: '#f8fafc', padding: 16, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
