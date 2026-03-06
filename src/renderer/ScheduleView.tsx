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

  const navigate = useNavigate();

  useEffect(() => {
    getAllApplications().then((apps) => {
      const up: typeof upcoming = [];
      const rec: typeof received = [];

      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
      const twoWeeksAgo = todayStart - 14 * 24 * 60 * 60 * 1000;

      apps.forEach((app) => {
        (app.timeline || []).forEach((ev) => {
          if (isAssessmentOrInterview(ev)) {
            // Check Upcoming (Due Date >= Today)
            const dueDate = (ev as any).due_date;
            const dDue = parseDate(dueDate);
            if (dDue) {
              const tDue = new Date(
                dDue.getFullYear(),
                dDue.getMonth(),
                dDue.getDate(),
              ).getTime();
              if (tDue >= todayStart) {
                up.push({ app, event: ev, sortDate: tDue });
              }
            }

            // Check Received (Date >= 2 Weeks Ago)
            const receivedDate = (ev as any).date;
            const dRec = parseDate(receivedDate);
            if (dRec) {
              const tRec = new Date(
                dRec.getFullYear(),
                dRec.getMonth(),
                dRec.getDate(),
              ).getTime();
              // Show if not stale (received within last 14 days OR in future)
              if (tRec >= twoWeeksAgo) {
                rec.push({ app, event: ev, sortDate: tRec });
              }
            }
          }
        });
      });

      // Sort upcoming ascending by due date
      up.sort((a, b) => a.sortDate - b.sortDate);

      // Filter received: if an app is in 'upcoming', don't show its 'received' events
      const upcomingAppIds = new Set(up.map((u) => u.app.id || (u.app as any)._id));
      const filteredRec = rec.filter((r) => !upcomingAppIds.has(r.app.id || (r.app as any)._id));

      // Sort received descending by received date
      filteredRec.sort((a, b) => b.sortDate - a.sortDate);

      setUpcoming(up);
      setReceived(filteredRec);
    });
  }, []);

  const displayDate = (s?: string | null) => {
    const d = parseDate(s);
    return d ? d.toLocaleDateString() : '';
  };

  const renderTable = (
    items: typeof upcoming,
    title: string,
    isUpcomingTable: boolean,
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
                  {isUpcomingTable ? 'Due Date' : 'Received Date'}
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
                const dateVal = isUpcomingTable
                  ? (event as any).due_date
                  : (event as any).date;
                const d = parseDate(dateVal);
                const now = new Date();
                const isToday =
                  d &&
                  d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() &&
                  d.getDate() === now.getDate();

                return (
                  <tr
                    key={`${app.id || app._id}-${idx}`}
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
                      {isToday && (
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
                          navigate(`/applications/${app.id || app._id}/edit`)
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
      {renderTable(upcoming, 'Upcoming (Due)', true)}
      {renderTable(received, 'Received (Recent)', false)}
    </div>
  );
}
