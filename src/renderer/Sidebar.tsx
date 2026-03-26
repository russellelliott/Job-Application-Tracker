import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import db, { getAllApplications } from './db';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState({ today: 0, upcoming: 0 });

  const fetchCounts = async () => {
    try {
      const apps = await getAllApplications();
      let todayC = 0;
      let upcomingC = 0;
      const now = new Date();
      // Reset to beginning of today
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();

      apps.forEach((app) => {
        (app.timeline || []).forEach((ev: any) => {
          const stage = ev.stage || '';
          const isInterviewOrAssessment =
            stage === 'Assessment' ||
            (typeof stage === 'string' && stage.startsWith('Interview'));

          if (isInterviewOrAssessment) {
            const dueStr = ev.due_date;
            if (dueStr) {
              let d: Date;
              if (/^\d{4}-\d{2}-\d{2}$/.test(dueStr)) {
                // Parse YYYY-MM-DD as local midnight
                const [y, m, day] = dueStr.split('-').map(Number);
                d = new Date(y, m - 1, day);
              } else {
                d = new Date(dueStr);
              }

              // Normalize to midnight local time
              const dTime = new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate(),
              ).getTime();

              if (!isNaN(dTime)) {
                // Determine if event is active (not completed)
                let isComplete = false;
                if (stage === 'Assessment' && ev.completed_at) {
                  isComplete = true;
                }
                // Interviews are considered "upcoming" if date is today or future.
                // Past interviews are implicitly "done" or passed.

                if (!isComplete && dTime >= todayStart) {
                  upcomingC++;
                  if (dTime === todayStart) {
                    todayC++;
                  }
                }
              }
            }
          }
        });
      });
      setCounts({ today: todayC, upcoming: upcomingC });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  useEffect(() => {
    fetchCounts();
    const changes = db
      .changes({ since: 'now', live: true, include_docs: true })
      .on('change', () => {
        fetchCounts();
      });
    return () => {
      changes.cancel();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Job Tracker
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" component={NavLink} to="/">
              Dashboard
            </Button>
            <Button color="inherit" component={NavLink} to="/applications">
              Applications
            </Button>
            <Badge
              badgeContent={counts.upcoming}
              color="warning"
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              <Badge badgeContent={counts.today} color="error">
                <Button color="inherit" component={NavLink} to="/schedule">
                  Schedule
                </Button>
              </Badge>
            </Badge>
            <Button color="inherit" component={NavLink} to="/analytics">
              Analytics
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <main
        style={{
          flex: 1,
          backgroundColor: '#f8fafc',
          padding: 16,
          overflow: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}
