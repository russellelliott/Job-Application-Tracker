import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { JobApplication } from '../types';

interface AddApplicationFormProps {
  onSubmit: (
    app: Partial<JobApplication>,
  ) => Promise<string | void> | string | void;
}

const SOURCE_OPTIONS = [
  'Cold Application',
  'Direct Connection',
  'In-Person Event',
  'Inbound Outreach',
];

export default function AddApplicationForm({
  onSubmit,
}: AddApplicationFormProps) {
  const [form, setForm] = React.useState<Partial<JobApplication>>({
    auxiliary_urls: [''],
    contacts: [
      { name: '', email: '', phone: '', linkedin_url: '', connection_type: '' },
    ],
    timeline: [],
    raw_notes: [''],
    source: 'Cold Application',
  });

  const [snackOpen, setSnackOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [submittedType, setSubmittedType] = React.useState<
    'draft' | 'submitted' | null
  >(null);
  const navigate = useNavigate();

  const handleChange = (name: string, value: any) =>
    setForm((prev) => ({ ...(prev || {}), [name]: value }));

  const handleAuxUrlChange = (idx: number, value: string) => {
    setForm((prev) => ({
      ...(prev || {}),
      auxiliary_urls: [
        ...(prev?.auxiliary_urls || []).slice(0, idx),
        value,
        ...(prev?.auxiliary_urls || []).slice(idx + 1),
      ],
    }));
  };
  const addAuxUrl = () =>
    setForm((prev) => ({
      ...(prev || {}),
      auxiliary_urls: [...(prev?.auxiliary_urls || []), ''],
    }));
  const removeAuxUrl = (idx: number) =>
    setForm((prev) => {
      const arr = [...(prev?.auxiliary_urls || [])];
      arr.splice(idx, 1);
      return { ...(prev || {}), auxiliary_urls: arr };
    });

  const handleContactChange = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const contacts = [...(prev?.contacts || [])];
      contacts[idx] = { ...(contacts[idx] || {}), [field]: value } as any;
      return { ...(prev || {}), contacts };
    });
  };
  const addContact = () =>
    setForm((prev) => ({
      ...(prev || {}),
      contacts: [
        ...(prev?.contacts || []),
        {
          name: '',
          email: '',
          phone: '',
          linkedin_url: '',
          connection_type: '',
        },
      ],
    }));
  const removeContact = (idx: number) =>
    setForm((prev) => {
      const c = [...(prev?.contacts || [])];
      c.splice(idx, 1);
      return { ...(prev || {}), contacts: c };
    });

  const handleNoteChange = (idx: number, value: string) =>
    setForm((prev) => {
      const notes = [...(prev?.raw_notes || [])];
      notes[idx] = value;
      return { ...(prev || {}), raw_notes: notes };
    });
  const addNote = () =>
    setForm((prev) => ({
      ...(prev || {}),
      raw_notes: [...(prev?.raw_notes || []), ''],
    }));
  const removeNote = (idx: number) =>
    setForm((prev) => {
      const n = [...(prev?.raw_notes || [])];
      n.splice(idx, 1);
      return { ...(prev || {}), raw_notes: n };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Keep legacy form submit behaviour: default to draft
    await submitWithStatus('draft');
  };

  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);

  const submitWithStatus = async (finalStatus: 'draft' | 'submitted') => {
    if (finalStatus === 'submitted') setAttemptedSubmit(true);
    // create local YYYY-MM-DD at local-midnight and append T00:00:00
    const today = new Date();
    const nowDateOnly = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;
    let timeline = form.timeline || [];
    timeline = [
      ...timeline,
      {
        stage: finalStatus === 'submitted' ? 'Application Submitted' : 'Draft',
        date: nowDateOnly,
        notes: null,
      },
    ];

    if (finalStatus === 'submitted' && !isValid) {
      // don't submit if invalid
      return;
    }

    setSubmittedType(finalStatus);
    const result = await onSubmit({ ...form, timeline });
    if (typeof result === 'string') {
      setCreatedId(result);
      setConfirmOpen(true);
    } else {
      setSnackOpen(true);
    }
  };

  const isValid = useMemo(() => {
    return !!(
      form.company_name &&
      form.company_name.toString().trim() &&
      form.role_title &&
      form.role_title.toString().trim() &&
      form.location &&
      form.location.toString().trim() &&
      form.job_url &&
      form.job_url.toString().trim() &&
      (form.source || '').toString().trim()
    );
  }, [form]);

  return (
    <div
      style={{
        padding: 24,
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Add Application
      </h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            paddingRight: 12,
            flex: 1,
            overflowY: 'auto',
            paddingBottom: 160,
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 720 }}>
            <TextField
              required
              label="Company Name"
              value={form.company_name || ''}
              onChange={(e) => handleChange('company_name', e.target.value)}
              error={
                attemptedSubmit &&
                !(form.company_name && form.company_name.toString().trim())
              }
              helperText={
                attemptedSubmit &&
                !(form.company_name && form.company_name.toString().trim())
                  ? 'Required'
                  : ''
              }
            />
            <TextField
              required
              label="Role Title"
              value={form.role_title || ''}
              onChange={(e) => handleChange('role_title', e.target.value)}
              error={
                attemptedSubmit &&
                !(form.role_title && form.role_title.toString().trim())
              }
              helperText={
                attemptedSubmit &&
                !(form.role_title && form.role_title.toString().trim())
                  ? 'Required'
                  : ''
              }
            />
            <TextField
              required
              label="Location"
              value={form.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              error={
                attemptedSubmit &&
                !(form.location && form.location.toString().trim())
              }
              helperText={
                attemptedSubmit &&
                !(form.location && form.location.toString().trim())
                  ? 'Required'
                  : ''
              }
            />
            <TextField
              required
              label="Job URL"
              value={form.job_url || ''}
              onChange={(e) => handleChange('job_url', e.target.value)}
              error={
                attemptedSubmit &&
                !(form.job_url && form.job_url.toString().trim())
              }
              helperText={
                attemptedSubmit &&
                !(form.job_url && form.job_url.toString().trim())
                  ? 'Required'
                  : ''
              }
            />

            <FormControl fullWidth>
              <InputLabel id="source-label">Source</InputLabel>
              <Select
                labelId="source-label"
                label="Source"
                value={form.source || 'Cold Application'}
                onChange={(e) => handleChange('source', e.target.value)}
                required
              >
                {SOURCE_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>
                Auxiliary URLs
              </div>
              {(form.auxiliary_urls || []).map((u, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <TextField
                    fullWidth
                    value={u}
                    onChange={(e) => handleAuxUrlChange(idx, e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeAuxUrl(idx)}>
                    <RemoveIcon />
                  </IconButton>
                </div>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addAuxUrl}>
                Add URL
              </Button>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Contacts</div>
              {(form.contacts || []).map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <TextField
                    label="Name"
                    value={c.name || ''}
                    onChange={(e) =>
                      handleContactChange(idx, 'name', e.target.value)
                    }
                  />
                  <TextField
                    label="Email"
                    value={c.email || ''}
                    onChange={(e) =>
                      handleContactChange(idx, 'email', e.target.value)
                    }
                  />
                  <TextField
                    label="Phone"
                    value={c.phone || ''}
                    onChange={(e) =>
                      handleContactChange(idx, 'phone', e.target.value)
                    }
                  />
                  <TextField
                    label="LinkedIn"
                    value={c.linkedin_url || ''}
                    onChange={(e) =>
                      handleContactChange(idx, 'linkedin_url', e.target.value)
                    }
                  />
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" onClick={() => removeContact(idx)}>
                      <RemoveIcon />
                    </IconButton>
                  </div>
                </div>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addContact}>
                Add Contact
              </Button>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Notes</div>
              {(form.raw_notes || []).map((n, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <TextField
                    fullWidth
                    value={n}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeNote(idx)}>
                    <RemoveIcon />
                  </IconButton>
                </div>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addNote}>
                Add Note
              </Button>
            </div>

            {/* Footer buttons now control draft/submitted state; radio options removed */}
          </Stack>
        </div>

        <div
          style={{
            position: 'fixed',
            left: 24,
            right: 24,
            bottom: 12,
            background: '#fff',
            paddingTop: 12,
            paddingBottom: 12,
            marginTop: 12,
            borderTop: '1px solid #e5e7eb',
            zIndex: 200,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Button variant="text" onClick={() => navigate(-1)}>
              Back
            </Button>
            {/* Show Save Draft always; show Submit only when required fields are filled */}
            <Button
              variant="contained"
              color="secondary"
              onClick={() => submitWithStatus('draft')}
            >
              Save Draft
            </Button>
            {isValid ? (
              <Button
                variant="contained"
                color="success"
                onClick={() => submitWithStatus('submitted')}
              >
                Submit Application
              </Button>
            ) : null}
            <Button
              variant="outlined"
              onClick={() => navigate('/applications')}
            >
              Exit
            </Button>
          </div>
        </div>

        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => setSnackOpen(false)}
        >
          <Alert
            onClose={() => setSnackOpen(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            Application saved
          </Alert>
        </Snackbar>

        {/* Confirmation dialog after create - gives navigation options */}
        {confirmOpen && createdId && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60,
            }}
          >
            <div
              style={{
                background: submittedType === 'draft' ? '#f3e8ff' : '#dcfce7',
                padding: 24,
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                width: 420,
                border:
                  submittedType === 'draft'
                    ? '1px solid #d8b4fe'
                    : '1px solid #86efac',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: submittedType === 'draft' ? '#6b21a8' : '#166534',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {submittedType === 'draft'
                  ? 'Draft Saved'
                  : 'Application Submitted'}
              </h3>
              <p
                style={{
                  color: submittedType === 'draft' ? '#581c87' : '#14532d',
                  marginBottom: 24,
                }}
              >
                {submittedType === 'draft'
                  ? 'Application has been saved as a draft.'
                  : 'Application was successfully submitted to the tracker.'}
              </p>
              <div
                style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
              >
                <button
                  onClick={() => {
                    setConfirmOpen(false);
                    setCreatedId(null);
                    setForm({
                      auxiliary_urls: [''],
                      contacts: [
                        {
                          name: '',
                          email: '',
                          phone: '',
                          linkedin_url: '',
                          connection_type: '',
                        },
                      ],
                      timeline: [],
                      raw_notes: [''],
                      source: 'Cold Application',
                      company_name: '',
                      role_title: '',
                      location: '',
                      job_url: '',
                    });
                    setAttemptedSubmit(false);
                    setSubmittedType(null);
                  }}
                  style={{
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.1)',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: '#374151',
                    fontWeight: 500,
                  }}
                >
                  Add another
                </button>
                <button
                  onClick={() => {
                    setConfirmOpen(false);
                    navigate(`/applications/${createdId}/edit`);
                  }}
                  style={{
                    background:
                      submittedType === 'draft' ? '#9333ea' : '#16a34a',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: 500,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setConfirmOpen(false);
                    navigate('/applications');
                  }}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${submittedType === 'draft' ? '#9333ea' : '#16a34a'}`,
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: submittedType === 'draft' ? '#9333ea' : '#16a34a',
                    fontWeight: 500,
                  }}
                >
                  Applications
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
