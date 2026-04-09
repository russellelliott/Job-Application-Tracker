import React, { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import db, { getAllApplications } from './db';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState({ interviews: 0 });

  const parseDate = (dStr?: string | null) => {
    if (!dStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      return new Date(`${dStr}T00:00:00`);
    }
    const parsed = new Date(dStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const fetchCounts = useCallback(async () => {
    try {
      const apps = await getAllApplications();
      let upcomingInterviewCount = 0;
      let receivedInterviewCount = 0;
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
          const isAssessmentOrInterview =
            stage === 'Assessment' ||
            (typeof stage === 'string' && stage.startsWith('Interview'));

          if (!isAssessmentOrInterview) {
            return;
          }

          const isDoneAssessment =
            stage === 'Assessment' && !!(ev as any).completed_at;

          if (!isDoneAssessment) {
            const dueDate = parseDate(ev.due_date);
            if (dueDate) {
              const dueTime = new Date(
                dueDate.getFullYear(),
                dueDate.getMonth(),
                dueDate.getDate(),
              ).getTime();

              if (typeof stage === 'string' && stage.startsWith('Interview')) {
                if (dueTime >= todayStart) {
                  upcomingInterviewCount += 1;
                }
              }
            }
          }

          const receivedDate = parseDate(ev.date);
          if (receivedDate) {
            const hasDueDate = !!parseDate(ev.due_date);
            const shouldIncludeReceived = !hasDueDate && !isDoneAssessment;

            if (shouldIncludeReceived) {
              receivedInterviewCount += 1;
            }
          }
        });
      });
      setCounts({
        interviews: upcomingInterviewCount + receivedInterviewCount,
      });
    } catch {
      // Intentionally ignore transient count refresh failures.
    }
  }, []);

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
  }, [fetchCounts]);

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
            <Badge badgeContent={counts.interviews} color="error">
              <Button color="inherit" component={NavLink} to="/schedule">
                Schedule
              </Button>
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
