
import React, { useEffect, useState } from 'react';
import PouchDB from 'pouchdb-browser';
// Load processed_applications.json from public directory

const db = new PouchDB('job-applications');

export default function ApplicationsTable() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Only load from PouchDB, do not reimport JSON
    db.allDocs({ include_docs: true })
      .then(({ rows }) => setJobs(rows.map(r => r.doc)))
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
