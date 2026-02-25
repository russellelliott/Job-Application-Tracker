import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllApplications } from './db';
import { JobApplication, TimelineEvent } from '../types';

function isUpcoming(event: TimelineEvent) {
  if (event.stage === 'Assessment' || event.stage.startsWith('Interview')) {
    const due = event.due_date || event.date;
    return new Date(due) > new Date();
  }
  return false;
}

export default function ScheduleView() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [events, setEvents] = useState<Array<{app: JobApplication, event: TimelineEvent}>>([]);

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
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Upcoming Assessments & Interviews</h2>
      <table className="min-w-full bg-white data-table">
        <thead>
          <tr>
            <th className="px-2 py-1">Company</th>
            <th className="px-2 py-1">Role</th>
            <th className="px-2 py-1">Type</th>
            <th className="px-2 py-1">Due Date</th>
            <th className="px-2 py-1">Notes</th>
            <th className="px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map(({ app, event }, idx) => (
            <tr key={idx}>
              <td className="px-2 py-1">{app.company_name}</td>
              <td className="px-2 py-1">{app.role_title}</td>
              <td className="px-2 py-1">{event.stage}</td>
              <td className="px-2 py-1">{(event as any).due_date || event.date}</td>
              <td className="px-2 py-1">{event.notes}</td>
              <td className="px-2 py-1">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => navigate(`/applications/${app.id || app._id}/edit`)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {events.length === 0 && <div className="mt-4 text-gray-500">No upcoming assessments or interviews.</div>}
    </div>
  );
}
