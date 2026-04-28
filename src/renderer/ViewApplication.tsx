import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAllApplications, getApplication, updateApplication } from './db';
import { getApplicationIdsInTableOrder } from './applicationOrdering';
import { JobApplication, TimelineEvent } from '../types';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUrl(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value);
}

function toHref(value: string) {
  if (isEmail(value)) return `mailto:${value}`;
  if (/^www\./i.test(value)) return `https://${value}`;
  return value;
}

function LinkableText({ value }: { value?: string | null }) {
  const text = (value || '').trim();
  if (!text) return <span style={{ color: '#6b7280' }}>Not provided</span>;

  const tokenRegex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  const parts = text.split(tokenRegex);

  return (
    <span>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (isEmail(part) || isUrl(part)) {
          const href = toHref(part);
          return (
            <a
              key={`${part}-${idx}`}
              href={href}
              target={href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>;
      })}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontWeight: 600, color: '#374151' }}>{label}</div>
      <div style={{ minWidth: 0 }}>
        <LinkableText value={value} />
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export default function ViewApplication() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<JobApplication | null>(null);
  const [applicationIds, setApplicationIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submittedSnackOpen, setSubmittedSnackOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setApp(null);
      return;
    }

    getApplication(id)
      .then((doc) => {
        setApp(doc);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const navStateIds = (location.state as any)?.orderedApplicationIds;
    if (Array.isArray(navStateIds) && navStateIds.length > 0) {
      setApplicationIds(
        navStateIds.map((value: any) => String(value)).filter(Boolean),
      );
      return;
    }

    getAllApplications()
      .then((all) => setApplicationIds(getApplicationIdsInTableOrder(all)))
      .catch(() => setApplicationIds([]));
  }, [id, location.state]);

  const appId = useMemo(() => app?.id || (app as any)?._id || id, [app, id]);
  const currentIndex = useMemo(() => {
    if (!appId) return -1;
    return applicationIds.indexOf(appId);
  }, [applicationIds, appId]);
  const previousId = currentIndex > 0 ? applicationIds[currentIndex - 1] : null;
  const nextId =
    currentIndex >= 0 && currentIndex < applicationIds.length - 1
      ? applicationIds[currentIndex + 1]
      : null;
  const hasSubmitted = useMemo(
    () =>
      (app?.timeline || []).some(
        (ev) => (ev?.stage || '') === 'Application Submitted',
      ),
    [app],
  );

  const markAsSubmittedToday = async () => {
    if (!app || !appId || hasSubmitted || submitting) return;
    setSubmitting(true);
    const today = new Date();
    const nowDateOnly = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;
    const timeline = [
      ...(app.timeline || []),
      {
        stage: 'Application Submitted',
        date: nowDateOnly,
        notes: null,
      } as TimelineEvent,
    ];

    try {
      await updateApplication({ ...(app as JobApplication), id: appId, timeline });
      setApp((prev) => (prev ? { ...prev, timeline } : prev));
      setSubmittedSnackOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <CircularProgress size={22} />
      </div>
    );
  }

  if (!app) {
    return <div style={{ padding: 24 }}>Application not found.</div>;
  }

  return (
    <div
      style={{
        padding: 24,
        paddingBottom: 96,
        boxSizing: 'border-box',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        View Application
      </h2>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 12,
        }}
      >
        <div style={{ color: '#4b5563', fontSize: 13 }}>
          {currentIndex >= 0 && applicationIds.length > 0
            ? `${currentIndex + 1} of ${applicationIds.length}`
            : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tooltip title="Previous application">
            <span>
              <IconButton
                aria-label="Previous application"
                onClick={() =>
                  previousId &&
                  navigate(`/applications/${previousId}/view`, {
                    state: { orderedApplicationIds: applicationIds },
                  })
                }
                disabled={!previousId}
              >
                <ChevronLeftIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Next application">
            <span>
              <IconButton
                aria-label="Next application"
                onClick={() =>
                  nextId &&
                  navigate(`/applications/${nextId}/view`, {
                    state: { orderedApplicationIds: applicationIds },
                  })
                }
                disabled={!nextId}
              >
                <ChevronRightIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      <div
        style={{
          height: 'calc(100vh - 255px)',
          minHeight: 220,
          overflowY: 'scroll',
          overflowX: 'hidden',
          scrollbarGutter: 'stable',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: '#fff',
          padding: '12px 16px',
        }}
      >
        <FieldRow label="Company Name" value={app.company_name} />
        <FieldRow label="Role Title" value={app.role_title} />
        <FieldRow label="Location" value={app.location} />
        <FieldRow label="Source" value={app.source} />
        <FieldRow label="Job URL" value={app.job_url} />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Auxiliary URLs</div>
          {(app.auxiliary_urls || []).length === 0 ? (
            <div style={{ color: '#6b7280' }}>None</div>
          ) : (
            <Stack spacing={0.75}>
              {(app.auxiliary_urls || []).map((url, idx) => (
                <div key={`${url}-${idx}`}>
                  <LinkableText value={url} />
                </div>
              ))}
            </Stack>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Contacts</div>
          {(app.contacts || []).length === 0 ? (
            <div style={{ color: '#6b7280' }}>None</div>
          ) : (
            <Stack spacing={1.25}>
              {(app.contacts || []).map((c, idx) => (
                <div key={`${c.email || c.name || 'contact'}-${idx}`} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
                  <FieldRow label="Name" value={c.name} />
                  <FieldRow label="Email" value={c.email} />
                  <FieldRow label="Phone" value={c.phone} />
                  <FieldRow label="LinkedIn" value={c.linkedin_url} />
                  <FieldRow label="Connection Type" value={c.connection_type} />
                </div>
              ))}
            </Stack>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Timeline</div>
          {(app.timeline || []).length === 0 ? (
            <div style={{ color: '#6b7280' }}>None</div>
          ) : (
            <Stack spacing={1.25}>
              {(app.timeline || []).map((ev: TimelineEvent, idx: number) => (
                <div key={`${ev.stage}-${ev.date}-${idx}`} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
                  <FieldRow label="Stage" value={ev.stage || ''} />
                  <FieldRow label="Date" value={formatDate((ev as any).date)} />
                  {'due_date' in ev && (
                    <FieldRow label="Due Date" value={formatDate((ev as any).due_date)} />
                  )}
                  {'completed_at' in ev && (
                    <FieldRow
                      label="Completed At"
                      value={formatDate((ev as any).completed_at)}
                    />
                  )}
                  <FieldRow label="Notes" value={(ev as any).notes || ''} />
                </div>
              ))}
            </Stack>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Raw Notes</div>
          {(app.raw_notes || []).length === 0 ? (
            <div style={{ color: '#6b7280' }}>None</div>
          ) : (
            <Stack spacing={0.75}>
              {(app.raw_notes || []).map((n, idx) => (
                <div key={`${n?.slice(0, 12) || 'note'}-${idx}`}>
                  <LinkableText value={n} />
                </div>
              ))}
            </Stack>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1200,
          background: '#fff',
          paddingTop: 12,
          paddingBottom: 12,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 'min(1080px, calc(100% - 32px))',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
        <Button variant="text" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<ModeEditIcon />}
          onClick={() => navigate(`/applications/${appId}/edit`)}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircleIcon />}
          disabled={hasSubmitted || submitting}
          onClick={() => setConfirmSubmitOpen(true)}
        >
          {hasSubmitted ? 'Already Submitted' : 'Mark Submitted Today'}
        </Button>
        </div>
      </div>

      <Dialog
        open={confirmSubmitOpen}
        onClose={() => {
          if (!submitting) setConfirmSubmitOpen(false);
        }}
      >
        <DialogTitle>Mark as submitted today?</DialogTitle>
        <DialogContent>
          This will add an Application Submitted timeline event for today.
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmSubmitOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={submitting}
            onClick={async () => {
              await markAsSubmittedToday();
              setConfirmSubmitOpen(false);
            }}
          >
            {submitting ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={submittedSnackOpen}
        autoHideDuration={2200}
        onClose={() => setSubmittedSnackOpen(false)}
      >
        <Alert
          onClose={() => setSubmittedSnackOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Application marked as submitted.
        </Alert>
      </Snackbar>
    </div>
  );
}
