
import React, { useEffect, useState } from 'react';
import PouchDB from 'pouchdb-browser';
// Load processed_applications.json from public directory

const db = new PouchDB('job-applications');

export default function ApplicationsTable() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
      // Use Electron IPC to load data from the main process
      window.electron.readInitialData()
        .then(jobsData => {
          db.bulkDocs(jobsData).then(() => {
            console.log(`${jobsData.length} jobs imported!`);
            db.allDocs({ include_docs: true }).then(({ rows }) => setJobs(rows.map(r => r.doc)));
          });
        })
        .catch(console.error);
    }, []);


  // Sort jobs by _id (as number if possible)
  const sortedJobs = [...jobs].sort((a, b) => {
    const idA = Number(a._id);
    const idB = Number(b._id);
    if (!isNaN(idA) && !isNaN(idB)) {
      return idA - idB;
    }
    return String(a._id).localeCompare(String(b._id));
  });

  const filtered = sortedJobs.filter(app =>
    (app.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (app.role_title || '').toLowerCase().includes(search.toLowerCase())
  );

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
            {filtered.map(app => (
              <tr key={app._id}>
                <td className="border px-2 py-1">{app.company_name}</td>
                <td className="border px-2 py-1">{app.role_title}</td>
                <td className="border px-2 py-1">{app.location}</td>
                <td className="border px-2 py-1">{app.source}</td>
                <td className="border px-2 py-1">{app.timeline?.[app.timeline.length-1]?.stage}</td>
                <td className="border px-2 py-1">
                  <button className="btn-secondary">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
