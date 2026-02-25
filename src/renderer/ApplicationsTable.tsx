
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllApplications } from './db';

export default function ApplicationsTable() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getAllApplications()
      .then((all) => setJobs(all))
      .catch(console.error);
  }, []);


  // Sort jobs by _id descending (higher ids first)
  const sortedJobs = [...jobs].sort((a, b) => {
    const idA = Number(a._id);
    const idB = Number(b._id);
    if (!isNaN(idA) && !isNaN(idB)) {
      return idB - idA;
    }
    return String(b._id).localeCompare(String(a._id));
  });

  const filtered = sortedJobs.filter(app =>
    (app.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (app.role_title || '').toLowerCase().includes(search.toLowerCase())
  );

  const isStagnant = (app: any) => {
    const timeline = app.timeline || [];
    // find most recent timeline date (ignore nulls)
    const dates = timeline
      .map((ev: any) => ev?.date)
      .filter((d: any) => d)
      .map((d: any) => new Date(d).getTime())
      .filter((t: number) => !Number.isNaN(t));
    if (dates.length === 0) return false;
    const latest = Math.max(...dates);
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    return Date.now() - latest > fourteenDays;
  };

  return (
    <div>
      <div className="flex mb-4">
        <input
          className="input flex-1"
          placeholder="Search by company or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd' }}>
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="border px-2 py-1">Company</th>
              <th className="border px-2 py-1">Role</th>
              <th className="border px-2 py-1">Location</th>
              <th className="border px-2 py-1">Source</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => {
              const stagnant = isStagnant(app);
              return (
                <tr key={app.id || app._id} style={stagnant ? { backgroundColor: '#fff8e1' } : undefined}>
                  <td className="border px-2 py-1">{app.company_name}</td>
                  <td className="border px-2 py-1">{app.role_title}</td>
                  <td className="border px-2 py-1">{app.location}</td>
                  <td className="border px-2 py-1">{app.source}</td>
                  <td className="border px-2 py-1">{app.timeline?.[app.timeline.length-1]?.stage}</td>
                  <td className="border px-2 py-1">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => navigate(`/applications/${app.id || app._id}/edit`)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
