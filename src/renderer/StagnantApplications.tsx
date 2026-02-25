import React, { useEffect, useState } from 'react';
import { getStagnantApplications } from './db';
import { JobApplication } from '../types';


function StagnantApplications() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStagnantApplications()
      .then((data) => {
        setApps(data);
        setLoading(false);
        return null;
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading stagnant applications...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Stagnant Applications</h2>
      {apps.length === 0 ? (
        <div className="text-gray-500">No stagnant applications! 🎉</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Last Activity</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="px-4 py-2">{app.company_name}</td>
                <td className="px-4 py-2">{app.role_title}</td>
                <td className="px-4 py-2">
                  {app.lastTimelineDate
                    ? new Date(app.lastTimelineDate).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Follow Up
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StagnantApplications;

export default StagnantApplications;
