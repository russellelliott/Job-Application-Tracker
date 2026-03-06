import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      const comp: typeof completed = [];

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
                 // Show completed assessment only if within last 2 weeks
                 if (cTime >= twoWeeksAgo) {
                   candidates.push({ app, event: ev, sortDate: cTime, type: 'completed' });
                 }
              }
            } else if (typeof ev.stage === 'string' && ev.stage.startsWith('Interview')) {
              const dueDate = (ev as any).due_date;
              const dDue = parseDate(dueDate);
              if (dDue) {
                const tDue = new Date(dDue.getFullYear(), dDue.getMonth(), dDue.getDate()).getTime();
                 if (tDue < todayStart && tDue >= twoWeeksAgo) {
                   candidates.push({ app, event: ev, sortDate: tDue, type: 'completed' });
                 }
              }
            }

            // Check Upcoming
            // Assessment is NOT upcoming if completed (handled above logic or check here)
            const isDoneAssessment = ev.stage === 'Assessment' && !!(ev as any).completed_at;
            if (!isDoneAssessment) {
              const dueDate = (ev as any).due_date;
              const dDue = parseDate(dueDate);
              if (dDue) {
                const tDue = new Date(dDue.getFullYear(), dDue.getMonth(), dDue.getDate()).getTime();
                if (tDue >= todayStart) {
                  // Only push if future interview logic holds (Interviews < Today are completed)
                  // If it's today or future, it's upcoming.
                  candidates.push({ app, event: ev, sortDate: tDue, type: 'upcoming' });
                }
              }
            }

            // Check Received
            // Only if NOT upcoming and NOT completed?
            // "Recieved" logic: Recent (2 weeks).
            // Usually if it's "Received", it might not have a Due Date yet.
            // If it has a Due Date >= Today, it is also Upcoming.
            // We'll collect it, and prioritize later.
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

        // SELECT BEST CANDIDATE FOR THIS APP
        // Priority: Upcoming (Earliest) > Received (Latest) > Completed (Latest)
        // Actually, if we have Upcoming, we show that.
        // If no Upcoming, do we show Received or Completed?
        // "Received" means "Pending Action" usually. "Completed" means "Done".
        // Pending > Done.
        // So:
        // 1. Has Upcoming? Pick earliest upcoming.
        // 2. Has Received? Pick latest received? (Or earliest? "Oldest pending"? User didn't specify, but usually newest received is top of mind, or oldest is most urgent? Let's go with Newest Recieved matching typical feed).
        // 3. Has Completed? Pick latest completed ("just passed").

        // Filter candidates by type
        const appUpcoming = candidates.filter(c => c.type === 'upcoming').sort((a,b) => a.sortDate - b.sortDate); // Earliest first
        const appReceived = candidates.filter(c => c.type === 'received').sort((a,b) => b.sortDate - a.sortDate); // Newest first
        const appCompleted = candidates.filter(c => c.type === 'completed').sort((a,b) => b.sortDate - a.sortDate); // Newest (latest date) first

        if (appUpcoming.length > 0) {
           // Show ONLY the first upcoming event
           up.push(appUpcoming[0]);
        } else if (appReceived.length > 0) {
           // Show ONLY the most relevant received event
           // Note: check if this received event is same as completed one? (e.g. Assessment Recieved X, Completed Y).
           // If 'received' candidate refers to an event that is actually completed, we might have filtered it?
           // In `candidates` collection:
           // If assessment completed: added to `completed`.
           // Also added to `received` (based on date).
           // If I have a completed assessment, do I show it as "Received"? No.
           // Filter out received candidates that are actually completed events.
           const validReceived = appReceived.filter(r => {
              const isComp = appCompleted.some(c => c.event === r.event);
              return !isComp;
           });

           if (validReceived.length > 0) {
             rec.push(validReceived[0]);
           } else if (appCompleted.length > 0) {
             comp.push(appCompleted[0]);
           }
        } else if (appCompleted.length > 0) {
           // Show ONLY the latest completed event
           comp.push(appCompleted[0]);
        }
      });

      // Sort final lists
      up.sort((a, b) => a.sortDate - b.sortDate);
      comp.sort((a, b) => b.sortDate - a.sortDate);
      rec.sort((a, b) => b.sortDate - a.sortDate);

      setUpcoming(up);
      setReceived(rec);
      setCompleted(comp);
    });
  }, []);

  const displayDate = (s?: string | null) => {
    const d = parseDate(s);
    return d ? d.toLocaleDateString() : '';
  };

  const renderTable = (
    items: typeof upcoming,
    title: string,
    mode: 'upcoming' | 'received' | 'completed',
  ) => {
    return (
      <div className="flex flex-col mb-6" style={{ maxHeight: '45vh' }}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full bg-white data-table sticky-header">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
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
              {items.map(({ app, event }, idx) => {
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
              {items.length === 0 && (
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
      {renderTable(upcoming, 'Upcoming', 'upcoming')}
      {renderTable(received, 'Received', 'received')}
      {renderTable(completed, 'Completed', 'completed')}

    </div>
  );
}
