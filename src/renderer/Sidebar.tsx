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
          let hasCandidate = false;

          (app.timeline || []).forEach((ev: any) => {
            const stage = ev.stage || '';
            const isInterviewOrAssessment =
              stage === 'Assessment' ||
              (typeof stage === 'string' && stage.startsWith('Interview'));

            if (isInterviewOrAssessment) {
              // --- TODAY BADGE CHECK (RED) ---
              const dueStr = ev.due_date;
              if (dueStr) {
                const d = /^\d{4}-\d{2}-\d{2}$/.test(dueStr)
                    ? new Date(`${dueStr}T00:00:00`)
                    : new Date(dueStr);
                const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                if (dTime === todayStart) {
                   const isDone = stage === 'Assessment' && !!ev.completed_at;
                   if (!isDone) {
                      todayC++;
                   }
                }
              }

              // --- VISIBILITY CANDIDATE CHECKS (ORANGE BADGE) ---

              // 1. Completed
              if (stage === 'Assessment' && ev.completed_at) {
                const cDate = /^\d{4}-\d{2}-\d{2}$/.test(ev.completed_at)
                  ? new Date(`${ev.completed_at}T00:00:00`)
                  : new Date(ev.completed_at);
                if (!isNaN(cDate.getTime())) {
                   const cTime = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate()).getTime();
                   // Show if within last 2 weeks (matching ScheduleView)
                   if (cTime >= twoWeeksAgo) {
                       hasCandidate = true;
                   }
                }
              } else if (typeof stage === 'string' && stage.startsWith('Interview')) {
                 const idate = ev.due_date;
                 if (idate) {
                    const iDateObj = /^\d{4}-\d{2}-\d{2}$/.test(idate)
                        ? new Date(`${idate}T00:00:00`)
                        : new Date(idate);
                    if (!isNaN(iDateObj.getTime())) {
                       const iTime = new Date(iDateObj.getFullYear(), iDateObj.getMonth(), iDateObj.getDate()).getTime();
                       // Show if completed (past) AND within last 2 weeks
                       if (iTime < todayStart && iTime >= twoWeeksAgo) {
                           hasCandidate = true;
                       }
                    }
                 }
              }

              // 2. Upcoming
              const isDoneAssessment = stage === 'Assessment' && !!ev.completed_at;
              if (!isDoneAssessment) {
                 const strictDueDate = ev.due_date;
                 if (strictDueDate) {
                    const sd = /^\d{4}-\d{2}-\d{2}$/.test(strictDueDate)
                          ? new Date(`${strictDueDate}T00:00:00`)
                          : new Date(strictDueDate);
                    if (!isNaN(sd.getTime())) {
                       const sdTime = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate()).getTime();
                       if (sdTime >= todayStart) {
                           hasCandidate = true;
                       }
                    }
                 }
              }

              // 3. Received
              const receivedStr = ev.date;
              if (receivedStr) {
                 const rd = /^\d{4}-\d{2}-\d{2}$/.test(receivedStr)
                    ? new Date(`${receivedStr}T00:00:00`)
                    : new Date(receivedStr);
                 if (!isNaN(rd.getTime())) {
                   const rdTime = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate()).getTime();
                   if (rdTime >= twoWeeksAgo) {
                       hasCandidate = true;
                   }
                 }
              }
            }
          });

          if (hasCandidate) {
            visibleTotal++;
          }
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
