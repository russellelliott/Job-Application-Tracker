import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { getApplication } from './db';
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
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<JobApplication | null>(null);

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

  const appId = useMemo(() => app?.id || (app as any)?._id || id, [app, id]);

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
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        View Application
      </h2>

      <div
        style={{
          height: 'calc(100vh - 250px)',
          minHeight: 220,
          overflowY: 'auto',
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
          background: '#fff',
          paddingTop: 12,
          paddingBottom: 8,
          marginTop: 12,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 8,
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
      </div>
    </div>
  );
}
