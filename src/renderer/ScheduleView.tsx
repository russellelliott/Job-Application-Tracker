import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { getAllApplications } from './db';
import { JobApplication, TimelineEvent } from '../types';

function parseDate(dStr?: string | null): Date | null {
  if (!dStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    return new Date(`${dStr}T00:00:00`);
  }
  const d = new Date(dStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isAssessmentOrInterview(evt: TimelineEvent) {
  const stage = evt.stage || '';
  return (
    stage === 'Assessment' ||
    (typeof stage === 'string' && stage.startsWith('Interview'))
  );
}

export default function ScheduleView() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'received' | 'completed'>('upcoming');
  const [completedView, setCompletedView] = useState<'unique' | 'all'>('unique');
  const [upcoming, setUpcoming] = useState<
    Array<{ app: JobApplication; event: TimelineEvent; sortDate: number }>
  >([]);
  const [received, setReceived] = useState<
    Array<{ app: JobApplication; event: TimelineEvent; sortDate: number }>
  >([]);
  const [completed, setCompleted] = useState<
    Array<{ app: JobApplication; event: TimelineEvent; sortDate: number }>
  >([]);

  const navigate = useNavigate();

  useEffect(() => {
    getAllApplications().then((apps) => {
      const up: typeof upcoming = [];
      const rec: typeof received = [];
      const allComp: typeof completed = [];

      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
      const twoWeeksAgo = todayStart - 14 * 24 * 60 * 60 * 1000;

      apps.forEach((app) => {
        // Collect all candidate items for this app
        const candidates: Array<{
          app: JobApplication;
          event: TimelineEvent;
          sortDate: number;
          type: 'upcoming' | 'received' | 'completed';
        }> = [];

        (app.timeline || []).forEach((ev) => {
          if (isAssessmentOrInterview(ev)) {
            // Check Completed
            if (ev.stage === 'Assessment' && (ev as any).completed_at) {
              const cDate = parseDate((ev as any).completed_at);
              if (cDate) {
                 const cTime = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate()).getTime();
                 // Add to candidates as completed
                 candidates.push({ app, event: ev, sortDate: cTime, type: 'completed' });
                 // Always add to allComp list
                 allComp.push({ app, event: ev, sortDate: cTime });
              }
            } else if (typeof ev.stage === 'string' && ev.stage.startsWith('Interview')) {
              const dueDate = (ev as any).due_date;
              const dDue = parseDate(dueDate);
              if (dDue) {
                const tDue = new Date(dDue.getFullYear(), dDue.getMonth(), dDue.getDate()).getTime();
                 if (tDue < todayStart) {
                   // Past interviews are completed
                   candidates.push({ app, event: ev, sortDate: tDue, type: 'completed' });
                   allComp.push({ app, event: ev, sortDate: tDue });
                 }
              }
            }

            // Check Upcoming
            const isDoneAssessment = ev.stage === 'Assessment' && !!(ev as any).completed_at;
            if (!isDoneAssessment) {
              const dueDate = (ev as any).due_date;
              const dDue = parseDate(dueDate);
              if (dDue) {
                const tDue = new Date(dDue.getFullYear(), dDue.getMonth(), dDue.getDate()).getTime();
                if (tDue >= todayStart) {
                  candidates.push({ app, event: ev, sortDate: tDue, type: 'upcoming' });
                }
              }
            }

            // Check Received
            const receivedDate = (ev as any).date;
            const dRec = parseDate(receivedDate);
            if (dRec) {
              const tRec = new Date(dRec.getFullYear(), dRec.getMonth(), dRec.getDate()).getTime();
              if (tRec >= twoWeeksAgo) {
                candidates.push({ app, event: ev, sortDate: tRec, type: 'received' });
              }
            }
          }
        });

        // SELECT BEST CANDIDATE FOR THIS APP for UPCOMING/RECEIVED tabs
        const appUpcoming = candidates.filter(c => c.type === 'upcoming').sort((a,b) => a.sortDate - b.sortDate);
        const appReceived = candidates.filter(c => c.type === 'received').sort((a,b) => b.sortDate - a.sortDate);
        // Note: completed are handled globally in allComp now, but we still use candidates logic for prioritizing display in other tabs?
        // Actually, previous logic was: if app has Upcoming, show in Upcoming. If not, if Received, show in Received. If not, show in Completed.
        // But requested change is "Show ALL completed interviews" in Completed tab.
        // So Completed tab is independent of Upcoming/Received status.

        if (appUpcoming.length > 0) {
           up.push(appUpcoming[0]);
        } else if (appReceived.length > 0) {
           // Ensure received item is not actually a completed task
           // (Logic simplified: if it's in received list, and not completed? Assessment received & completed is both.
           // If completed, we shouldn't show in Received list? The original code had this check.)
           // Let's keep logic simple: push top received event.
           rec.push(appReceived[0]);
        }
      });

      // Sort final lists
      up.sort((a, b) => a.sortDate - b.sortDate); // Earliest upcoming first
      allComp.sort((a, b) => b.sortDate - a.sortDate); // Latest completed first
      rec.sort((a, b) => b.sortDate - a.sortDate); // Latest received first

      setUpcoming(up);
      setReceived(rec);
      setCompleted(allComp);
    });
  }, []);

  const displayDate = (s?: string | null) => {
    const d = parseDate(s);
    return d ? d.toLocaleDateString() : '';
  };

  const renderTable = (
    items: typeof upcoming,
    mode: 'upcoming' | 'received' | 'completed',
  ) => {
    let displayItems = items;

    if (mode === 'completed') {
       if (completedView === 'unique') {
         // Filter for unique companies (latest event per company)
         const seenApps = new Set<string>();
         displayItems = [];
         for (const item of items) {
            const appId = item.app.id || (item.app as any)._id;
            if (!seenApps.has(appId)) {
               seenApps.add(appId);
               displayItems.push(item);
            }
         }
       }
       // If 'all', use items as is (already sorted by date desc)
    }

    return (
      <div className="flex flex-col h-full">
        {mode === 'completed' && (
          <div className="flex justify-end mb-2">
            <Tabs
              value={completedView}
              onChange={(e, v) => setCompletedView(v)}
              textColor="secondary"
              indicatorColor="secondary"
              aria-label="completed view tabs"
              sx={{ minHeight: 32 }}
            >
               <Tab label="Unique Companies" value="unique" sx={{ minHeight: 32, py: 0.5, fontSize: '0.8rem' }} />
               <Tab label="All Interviews" value="all" sx={{ minHeight: 32, py: 0.5, fontSize: '0.8rem' }} />
            </Tabs>
          </div>
        )}
        <div
          className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-sm bg-white"
          style={{ maxHeight: '500px', overflowY: 'auto' }}
        >
          <table className="min-w-full bg-white data-table sticky-header">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            {/* ... rest of table ... */}
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {mode === 'upcoming'
                    ? 'Due Date'
                    : mode === 'completed'
                      ? 'Completed/Date'
                      : 'Received Date'
                  }
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayItems.map(({ app, event }, idx) => {
                let dateVal;
                if (mode === 'upcoming') {
                   dateVal = (event as any).due_date;
                } else if (mode === 'completed') {
                   // If assessment, completed_at; if interview, due_date(interview date)
                   if (event.stage === 'Assessment') {
                      dateVal = (event as any).completed_at;
                   } else {
                      dateVal = (event as any).due_date;
                   }
                } else {
                   dateVal = (event as any).date;
                }

                const d = parseDate(dateVal);
                const now = new Date();
                const isToday =
                  d &&
                  d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() &&
                  d.getDate() === now.getDate();

                return (
                  <tr
                    key={`${app.id || (app as any)._id}-${idx}`}
                    className={isToday ? 'bg-red-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {app.company_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {app.role_title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          event.stage === 'Assessment'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {event.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {displayDate(dateVal)}
                      {isToday && mode === 'upcoming' && (
                        <span className="ml-2 text-red-600 font-bold text-xs">
                          (Today)
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate"
                      title={event.notes || ''}
                    >
                      {event.notes}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() =>
                          navigate(`/applications/${app.id || (app as any)._id}/edit`)
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full p-6 box-border overflow-hidden">
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="schedule tabs">
          <Tab label="Upcoming" value="upcoming" />
          <Tab label="Received" value="received" />
          <Tab label="Completed" value="completed" />
        </Tabs>
      </Box>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {activeTab === 'upcoming' && renderTable(upcoming, 'upcoming')}
        {activeTab === 'received' && renderTable(received, 'received')}
        {activeTab === 'completed' && renderTable(completed, 'completed')}
      </div>
    </div>
  );
}
