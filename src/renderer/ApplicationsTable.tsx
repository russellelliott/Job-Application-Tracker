import React, { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { useNavigate } from 'react-router-dom';
import { getAllApplications } from './db';
import AddApplicationOptionsDialog from './AddApplicationOptionsDialog';

export default function ApplicationsTable() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const getTableViewportHeight = () =>
    Math.max(260, window.innerHeight - 300);
  const [tableViewportHeight, setTableViewportHeight] = useState<number>(
    typeof window === 'undefined' ? 420 : getTableViewportHeight(),
  );
  const navigate = useNavigate();

  useEffect(() => {
    getAllApplications()
      .then((all) => setJobs(all))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleResize = () => setTableViewportHeight(getTableViewportHeight());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sort jobs by the date shown in the table (most-recent first)
  const getDisplayDate = (app: any) => {
    const timeline = app.timeline || [];
    if (timeline.length === 0) return -Infinity;
    const lastEvent = timeline[timeline.length - 1] || null;
    if (!lastEvent) return -Infinity;
    const stage = lastEvent.stage || '';
    const dateStr =
      typeof stage === 'string' && stage.toLowerCase().includes('interview')
        ? lastEvent.due_date || lastEvent.date
        : lastEvent.date;
    if (!dateStr) return -Infinity;
    const t = new Date(dateStr).getTime();
    return Number.isNaN(t) ? -Infinity : t;
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    const aDate = getDisplayDate(a);
    const bDate = getDisplayDate(b);
    // Sort descending (newest first)
    if (aDate === bDate) {
      // fallback to id based sort to keep deterministic order
      const idA = Number(a._id);
      const idB = Number(b._id);
      if (!isNaN(idA) && !isNaN(idB)) return idB - idA;
      return String(b._id).localeCompare(String(a._id));
    }
    return bDate - aDate;
  });

  const filtered = sortedJobs.filter(
    (app) =>
      (app.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.role_title || '').toLowerCase().includes(search.toLowerCase()),
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="flex mb-4">
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Search by company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </div>
      <div
        style={{
          height: tableViewportHeight,
          overflowY: 'auto',
          border: '1px solid #ddd',
        }}
      >
        <table
          className="min-w-full bg-white data-table"
          style={{
            width: '100%',
            tableLayout: 'fixed',
            fontSize: '0.87rem',
            lineHeight: 1.25,
          }}
        >
          <colgroup>
            <col style={{ width: '18%' }} />
            <col />
            <col style={{ width: 140 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 64 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="px-2 py-0">Company</th>
              <th className="px-2 py-0">Role</th>
              <th className="px-2 py-0">Location</th>
              <th className="px-2 py-0">Source</th>
              <th className="px-2 py-0">App Link</th>
              <th className="px-2 py-0">Status</th>
              <th className="px-2 py-0">Date</th>
              <th className="px-2 py-0 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => {
              const stagnant = isStagnant(app);
              const lastEvent =
                (app.timeline || [])[app.timeline?.length - 1] || null;
              const statusDate = (() => {
                if (!lastEvent) return '';
                const stage = (lastEvent as any).stage || '';
                if (
                  typeof stage === 'string' &&
                  stage.toLowerCase().includes('interview')
                ) {
                  return (
                    (lastEvent as any).due_date || (lastEvent as any).date || ''
                  );
                }
                return (lastEvent as any).date || '';
              })();
              return (
                <tr
                  key={app.id || app._id}
                  style={stagnant ? { backgroundColor: '#fff8e1' } : undefined}
                >
                  <td className="px-2 py-0">{app.company_name}</td>
                  <td
                    className="px-2 py-0 whitespace-nowrap overflow-hidden text-ellipsis"
                    title={app.role_title || ''}
                  >
                    {app.role_title}
                  </td>
                  <td
                    className="px-2 py-0 whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ maxWidth: 160 }}
                    title={app.location || ''}
                  >
                    {app.location}
                  </td>
                  <td
                    className="px-2 py-0 whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ maxWidth: 160 }}
                    title={app.source || ''}
                  >
                    {app.source}
                  </td>
                  <td className="px-2 py-0">
                    {app.job_url ? (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Link
                      </a>
                    ) : app.contacts &&
                      app.contacts[0] &&
                      app.contacts[0].email ? (
                      <a
                        href={`mailto:${app.contacts[0].email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {app.contacts[0].email}
                      </a>
                    ) : (
                      ''
                    )}
                  </td>
                  <td className="px-2 py-0">
                    {app.timeline?.[app.timeline.length - 1]?.stage}
                  </td>
                  <td className="px-2 py-0">
                    {statusDate
                      ? new Date(statusDate).toLocaleDateString()
                      : ''}
                  </td>
                  <td className="px-2 py-0 text-center">
                    <IconButton
                      size="small"
                      aria-label="Edit application"
                      sx={{ p: 0.25 }}
                      onClick={() =>
                        navigate(`/applications/${app.id || app._id}/edit`)
                      }
                    >
                      <ModeEditIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 8,
          paddingTop: 10,
          borderTop: '1px solid #ddd',
          backgroundColor: '#fff',
          position: 'sticky',
          bottom: 0,
        }}
      >
        <button
          className="btn-primary"
          onClick={() => setOptionsOpen(true)}
        >
          Add New Application(s)
        </button>
      </div>
      <AddApplicationOptionsDialog
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onSelectManual={() => navigate('/applications/add')}
        onSelectBulk={() => navigate('/applications/bulk-import')}
      />
    </div>
  );
}
