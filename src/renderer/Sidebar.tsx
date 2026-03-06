import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import { getAllApplications } from './db';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState({ today: 0, upcoming: 0 });

  useEffect(() => {
    let mounted = true;
    getAllApplications()
      .then((apps) => {
        if (!mounted) return;
        let todayC = 0;
        let visibleTotal = 0;
        const now = new Date();
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).getTime();
        const twoWeeksAgo = todayStart - 14 * 24 * 60 * 60 * 1000;

        apps.forEach((app) => {
          (app.timeline || []).forEach((ev: any) => {
            const stage = ev.stage || '';
            const isInterviewOrAssessment =
              stage === 'Assessment' ||
              (typeof stage === 'string' && stage.startsWith('Interview'));

            if (isInterviewOrAssessment) {
              let isVisible = false;

              // Check Upcoming Logic (for Schedule View Top Table)
              // If due_date >= today
              const dueStr = ev.due_date || ev.date; // Use due_date mainly
              if (dueStr) {
                let d: Date;
                if (/^\d{4}-\d{2}-\d{2}$/.test(dueStr)) {
                  d = new Date(`${dueStr}T00:00:00`);
                } else {
                  d = new Date(dueStr);
                }
                const dTime = new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate(),
                ).getTime();

                if (dTime === todayStart) {
                  todayC++;
                }

                // If it's upcoming (due date >= today), it is visible
                // Note: using ev.due_date specifically ideally, but keeping dueStr fallback logic for safety
                // Actually, strict "Upcoming" usually implies based on due_date.
                // Let's check strict due_date if available
                const strictDueDate = ev.due_date;
                if (strictDueDate) {
                   const sd =  /^\d{4}-\d{2}-\d{2}$/.test(strictDueDate)
                        ? new Date(`${strictDueDate}T00:00:00`)
                        : new Date(strictDueDate);
                   const sdTime = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate()).getTime();
                   if (sdTime >= todayStart) {
                       isVisible = true;
                   }
                }
                // Fallback for interviews that might use `date` as scheduled date if due_date invalid?
                // But EditForm uses `due_date` for Interview Date.
                // So checking `due_date` is correct for Upcoming.
              }

              // Check Received Logic (for Schedule View Bottom Table)
              // If date >= 2 weeks ago
              const receivedStr = ev.date;
              if (receivedStr) {
                 const rd = /^\d{4}-\d{2}-\d{2}$/.test(receivedStr)
                    ? new Date(`${receivedStr}T00:00:00`)
                    : new Date(receivedStr);
                 const rdTime = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate()).getTime();
                 if (rdTime >= twoWeeksAgo) {
                     isVisible = true;
                 }
              }

              if (isVisible) {
                visibleTotal++;
              }
            }
          });
        });
        setCounts({ today: todayC, upcoming: visibleTotal });
      })
      .catch(() => {});
    return () => {
      mounted = false;
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
