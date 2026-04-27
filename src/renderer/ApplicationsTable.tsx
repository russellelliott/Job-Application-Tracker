import React, { useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import LinkIcon from '@mui/icons-material/Link';
import { useNavigate } from 'react-router-dom';
import { getAllApplications } from './db';

type StatusKey =
  | 'all'
  | 'draft'
  | 'submitted'
  | 'assessment'
  | 'interview_1'
  | 'interview_2'
  | 'interview_3';

const STATUS_META: Record<
  Exclude<StatusKey, 'all'>,
  { label: string; color: string }
> = {
  draft: { label: 'Draft', color: '#9c27b0' },
  submitted: { label: 'Submitted', color: '#6366f1' },
  assessment: { label: 'Assessment', color: '#818cf8' },
  interview_1: { label: 'Interview 1', color: '#fbbf24' },
  interview_2: { label: 'Interview 2', color: '#f59e0b' },
  interview_3: { label: 'Interview 3', color: '#d97706' },
};

const STATUS_FILTERS: Array<StatusKey> = [
  'all',
  'draft',
  'submitted',
  'assessment',
  'interview_1',
  'interview_2',
  'interview_3',
];

function getStatusKey(app: any): Exclude<StatusKey, 'all'> {
  const timeline = app.timeline || [];
  if (timeline.length === 0) return 'draft';

  // Find the most recent non-followup event
  for (let i = timeline.length - 1; i >= 0; i--) {
    const event = timeline[i];
    const stage = String(event?.stage || '').trim().toLowerCase();
    const isFollowup = stage.includes('follow-up') || stage.includes('followup');

    if (!isFollowup) {
      // This is the status we use
      if (!stage || stage === 'draft') return 'draft';
      if (stage === 'application submitted') return 'submitted';
      if (stage === 'assessment') return 'assessment';

      const interviewMatch = stage.match(/^interview\s*(\d+)/);
      if (interviewMatch) {
        if (interviewMatch[1] === '1') return 'interview_1';
        if (interviewMatch[1] === '2') return 'interview_2';
        if (interviewMatch[1] === '3') return 'interview_3';
      }

      return 'submitted';
    }
  }

  // If all events are follow-ups, default to draft
  return 'draft';
}

function hasFollowup(app: any): boolean {
  const timeline = app.timeline || [];
  const lastEvent = timeline[timeline.length - 1];
  if (!lastEvent) return false;
  const stage = String(lastEvent.stage || '').trim().toLowerCase();
  return stage.includes('follow-up') || stage.includes('followup');
}

function getStatusLabel(status: Exclude<StatusKey, 'all'>) {
  return STATUS_META[status].label;
}

function getStatusColor(status: Exclude<StatusKey, 'all'>) {
  return STATUS_META[status].color;
}

function getSourceColor(source: string): string {
  return source === 'Cold Application' ? '#2563eb' : '#eab308';
}

export default function ApplicationsTable() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>('all');
  const getTableViewportHeight = () => Math.max(260, window.innerHeight - 230);
  const [tableViewportHeight, setTableViewportHeight] = useState<number>(
    typeof window === 'undefined' ? 460 : getTableViewportHeight(),
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
      const companyA = String(a.company_name || '').toLowerCase();
      const companyB = String(b.company_name || '').toLowerCase();
      const companyCompare = companyA.localeCompare(companyB);
      if (companyCompare !== 0) return companyCompare;

      const roleA = String(a.role_title || '').toLowerCase();
      const roleB = String(b.role_title || '').toLowerCase();
      const roleCompare = roleA.localeCompare(roleB);
      if (roleCompare !== 0) return roleCompare;

      const idA = String(a.id || a._id || '');
      const idB = String(b.id || b._id || '');
      return idA.localeCompare(idB);
    }
    return bDate - aDate;
  });

  const searchFilteredJobs = useMemo(
    () =>
      sortedJobs.filter(
        (app) =>
          (app.company_name || '')
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (app.role_title || '').toLowerCase().includes(search.toLowerCase()),
      ),
    [search, sortedJobs],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusKey, number> = {
      all: searchFilteredJobs.length,
      draft: 0,
      submitted: 0,
      assessment: 0,
      interview_1: 0,
      interview_2: 0,
      interview_3: 0,
    };

    searchFilteredJobs.forEach((app) => {
      counts[getStatusKey(app)] += 1;
    });

    return counts;
  }, [searchFilteredJobs]);

  const filtered = useMemo(
    () =>
      selectedStatus === 'all'
        ? searchFilteredJobs
        : searchFilteredJobs.filter(
            (app) => getStatusKey(app) === selectedStatus,
          ),
    [searchFilteredJobs, selectedStatus],
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {STATUS_FILTERS.map((status) => {
          const isAll = status === 'all';
          const isSelected = selectedStatus === status;
          const count = statusCounts[status];
          const label = isAll ? 'All' : getStatusLabel(status);
          const color = isAll ? '#475569' : getStatusColor(status);

          return (
            <Chip
              key={status}
              label={`${label} ${count}`}
              clickable
              onClick={() => setSelectedStatus(status)}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={{
                height: 28,
                fontWeight: 600,
                borderColor: color,
                color: isSelected ? '#fff' : color,
                bgcolor: isSelected ? color : 'transparent',
                '& .MuiChip-label': {
                  px: 1,
                  fontSize: '0.75rem',
                },
                '&:hover': {
                  bgcolor: isSelected ? color : `${color}14`,
                },
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          height: tableViewportHeight,
          overflowY: 'scroll',
          overflowX: 'hidden',
          scrollbarGutter: 'stable both-edges',
          border: '1px solid #ddd',
          paddingRight: 4,
          boxSizing: 'border-box',
        }}
      >
        <table
          className="min-w-full bg-white data-table"
          style={{
            width: '100%',
            tableLayout: 'fixed',
            fontSize: '0.82rem',
            lineHeight: 1.1,
          }}
        >
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="px-2 py-1">Company</th>
              <th className="px-2 py-1">Role</th>
              <th className="px-2 py-1">Location</th>
              <th className="px-2 py-1">Source</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => {
              const stagnant = isStagnant(app);
              const lastEvent =
                (app.timeline || [])[app.timeline?.length - 1] || null;
              const statusKey = getStatusKey(app);
              const baseLabel = getStatusLabel(statusKey);
              const statusLabel = hasFollowup(app)
                ? `${baseLabel} · Follow-up`
                : baseLabel;
              const statusColor = getStatusColor(statusKey);
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
                  <td
                    className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                    title={app.company_name || ''}
                  >
                    {app.company_name}
                  </td>
                  <td
                    className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                    title={app.role_title || ''}
                  >
                    {app.role_title}
                  </td>
                  <td
                    className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                    title={app.location || ''}
                  >
                    {app.location}
                  </td>
                  <td
                    className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                    title={app.source || ''}
                  >
                    {app.source && (
                      <Chip
                        label={app.source}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: getSourceColor(app.source),
                          color: '#fff',
                          '& .MuiChip-label': {
                            px: 1,
                          },
                        }}
                      />
                    )}
                  </td>
                  <td
                    className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                    title={statusLabel}
                  >
                    <Chip
                      label={statusLabel}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: statusColor,
                        color: '#fff',
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {statusDate
                      ? new Date(statusDate).toLocaleDateString()
                      : ''}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <IconButton
                      size="small"
                      aria-label="View application"
                      sx={{ p: 0.25 }}
                      onClick={() =>
                        navigate(`/applications/${app.id || app._id}/view`)
                      }
                    >
                      <RemoveRedEyeIcon fontSize="small" />
                    </IconButton>
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
                    {(app.job_url ||
                      (app.contacts && app.contacts[0]?.email)) && (
                      <IconButton
                        size="small"
                        aria-label="Open link"
                        sx={{ p: 0.25 }}
                        component="a"
                        href={
                          app.job_url ||
                          (app.contacts && app.contacts[0]?.email
                            ? `mailto:${app.contacts[0].email}`
                            : undefined)
                        }
                        target={app.job_url ? '_blank' : undefined}
                        rel={app.job_url ? 'noreferrer' : undefined}
                      >
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    )}
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
