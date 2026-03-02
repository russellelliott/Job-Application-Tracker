import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllApplications } from './db';
import { JobApplication, TimelineEvent } from '../types';

function isUpcoming(event: TimelineEvent) {
  if (event.stage === 'Assessment' || (typeof event.stage === 'string' && event.stage.startsWith('Interview'))) {
    const dueStr = event.due_date || event.date;
    if (!dueStr) return false;

    // Parse considering local midnight for YYYY-MM-DD
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueStr)) {
      d = new Date(dueStr + 'T00:00:00');
    } else {
      d = new Date(dueStr);
    }
    if (isNaN(d.getTime())) return false;

    // Compare date parts only (start of day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    return eventDay >= today;
  }
  return false;
}

export default function ScheduleView() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [events, setEvents] = useState<Array<{app: JobApplication, event: TimelineEvent}>>([]);

  const displayDate = (s?: string | null) => {
    if (!s) return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  useEffect(() => {
    getAllApplications().then(apps => {
      setApps(apps);
      const allEvents: Array<{app: JobApplication, event: TimelineEvent}> = [];
      apps.forEach(app => {
        (app.timeline || []).forEach(event => {
          if (isUpcoming(event)) {
            allEvents.push({ app, event });
          }
        });
      });
      allEvents.sort((a, b) => new Date((a.event as any).due_date || a.event.date).getTime() - new Date((b.event as any).due_date || b.event.date).getTime());
      setEvents(allEvents);
    });
  }, []);

  const navigate = useNavigate();

  return (
    <div className="w-full flex flex-col h-full p-6 box-border overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Upcoming Assessments & Interviews</h2>
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full bg-white data-table sticky-header">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map(({ app, event }, idx) => {
               const dateVal = (event as any).due_date || event.date;
               // Check if it's today logic for highlighting
               const d = dateVal && /^\d{4}-\d{2}-\d{2}$/.test(dateVal) ? new Date(dateVal + 'T00:00:00') : new Date(dateVal);
               const now = new Date();
               const isToday = d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

               return (
                <tr key={`${app.id || app._id}-${idx}`} className={isToday ? "bg-red-50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3 whitespace-nowrap">{app.company_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{app.role_title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      event.stage === 'Assessment' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {displayDate(dateVal)}
                    {isToday && <span className="ml-2 text-red-600 font-bold text-xs">(Today)</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={event.notes}>{event.notes}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => navigate(`/applications/${app.id || app._id}/edit`)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
             {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No upcoming assessments or interviews.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
