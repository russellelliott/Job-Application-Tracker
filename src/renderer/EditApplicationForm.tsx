import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { JobApplication } from '../types';
import { getApplication, updateApplication, deleteApplication } from './db';

export default function EditApplicationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Partial<JobApplication> | null>(null);
  const [originalJson, setOriginalJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!id) {
      setLoading(false);
      setApp(null);
      return;
    }
    getApplication(id)
      .then((doc) => {
        setApp(doc || null);
        setOriginalJson(JSON.stringify(doc || {}));
        setLoading(false);
        return null;
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Convert stored date strings to `YYYY-MM-DD` for <input type="date">.
  // Parse the value into a JS Date and format using local date components
  // so it matches how the table displays dates (which uses `new Date(...)`).
  const dateToInput = (s?: string | null) => {
    if (!s) return '';
    // Already YYYY-MM-DD — parse as local midnight to avoid UTC shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(`${s}T00:00:00`);
      if (Number.isNaN(d.getTime())) return s;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    try {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return '';
      // Use UTC getters if the string is a UTC ISO string to avoid double-shifting
      const isUtc = s.endsWith('Z') || s.endsWith('z');
      const y = isUtc ? d.getUTCFullYear() : d.getFullYear();
      const m = String((isUtc ? d.getUTCMonth() : d.getMonth()) + 1).padStart(
        2,
        '0',
      );
      const day = String(isUtc ? d.getUTCDate() : d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return '';
    }
  };

  const isChanged = useMemo(() => {
    if (!app) return false;
    try {
      return JSON.stringify(app) !== originalJson;
    } catch {
      return false;
    }
  }, [app, originalJson]);

  if (loading) return <div>Loading application...</div>;
  if (!app) return <div>Application not found.</div>;

  // Separate handlers for text and select fields to satisfy MUI types
  const handleTextFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setApp((prev) => ({ ...(prev || {}), [name]: value }));
  };
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setApp((prev) => ({ ...(prev || {}), [name]: value }));
  };

  // Auxiliary URLs handlers
  const setAuxUrl = (idx: number, value: string) => {
    setApp((prev) => {
      const aux = [...(prev?.auxiliary_urls || [])];
      aux[idx] = value;
      return { ...(prev || {}), auxiliary_urls: aux };
    });
  };
  const addAuxUrl = () =>
    setApp((prev) => ({
      ...(prev || {}),
      auxiliary_urls: [...(prev?.auxiliary_urls || []), ''],
    }));
  const removeAuxUrl = (idx: number) =>
    setApp((prev) => {
      const aux = [...(prev?.auxiliary_urls || [])];
      aux.splice(idx, 1);
      return { ...(prev || {}), auxiliary_urls: aux };
    });

  // Contacts handlers
  const setContactField = (idx: number, field: string, value: string) => {
    setApp((prev) => {
      const contacts = [...(prev?.contacts || [])];
      contacts[idx] = { ...(contacts[idx] || {}), [field]: value };
      return { ...(prev || {}), contacts };
    });
  };
  const addContact = () =>
    setApp((prev) => ({
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
    setApp((prev) => {
      const contacts = [...(prev?.contacts || [])];
      contacts.splice(idx, 1);
      return { ...(prev || {}), contacts };
    });

  // Timeline handlers
  const setTimelineEvent = (idx: number, field: string, value: string) => {
    setApp((prev) => {
      const timeline = [...(prev?.timeline || [])];
      timeline[idx] = {
        ...(timeline[idx] || ({} as any)),
        [field]: value,
      } as any;
      return { ...(prev || {}), timeline };
    });
  };
  const addTimelineEvent = () => {
    const today = new Date();
    const dateLocalMidnight = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;
    return setApp((prev) => ({
      ...(prev || {}),
      timeline: [
        ...(prev?.timeline || []),
        { stage: 'Follow-up', date: dateLocalMidnight, notes: '' },
      ],
    }));
  };
  const removeTimelineEvent = (idx: number) =>
    setApp((prev) => {
      const timeline = [...(prev?.timeline || [])];
      timeline.splice(idx, 1);
      return { ...(prev || {}), timeline };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !id) return;
    // Ensure required fields
    const updated: JobApplication = { ...(app as JobApplication), id };
    await updateApplication(updated as JobApplication);
    navigate(`/applications/${id}/view`);
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteApplication(id);
      navigate('/applications');
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <div style={{ padding: 24, height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Edit Application
      </h2>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
            paddingRight: 12,
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 800 }}>
            <TextField
              label="Company Name"
              value={app.company_name || ''}
              onChange={handleTextFieldChange}
              name="company_name"
            />
            <TextField
              label="Role Title"
              value={app.role_title || ''}
              onChange={handleTextFieldChange}
              name="role_title"
            />
            <TextField
              label="Location"
              value={app.location || ''}
              onChange={handleTextFieldChange}
              name="location"
            />
            <TextField
              label="Job URL"
              value={app.job_url || ''}
              onChange={handleTextFieldChange}
              name="job_url"
            />

            <FormControl fullWidth>
              <InputLabel id="source-edit-label">Source</InputLabel>
              <Select
                labelId="source-edit-label"
                label="Source"
                name="source"
                value={app.source || ''}
                onChange={handleSelectChange}
              >
                <MenuItem value="">(None)</MenuItem>
                <MenuItem value="Cold Application">Cold Application</MenuItem>
                <MenuItem value="Direct Connection">Direct Connection</MenuItem>
                <MenuItem value="In-Person Event">In-Person Event</MenuItem>
                <MenuItem value="Inbound Outreach">Inbound Outreach</MenuItem>
              </Select>
            </FormControl>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>
                Auxiliary URLs
              </div>
              {(app.auxiliary_urls || []).map((url, idx) => (
                <div
                  key={url ? `aux-url-${url}-${idx}` : `aux-url-${idx}`}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <TextField
                    fullWidth
                    value={url}
                    onChange={(e) => setAuxUrl(idx, e.target.value)}
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
              {(app.contacts || []).map((c, idx) => (
                <div
                  key={c.email ? `contact-${c.email}-${idx}` : `contact-${idx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <TextField
                    label="Name"
                    value={c.name || ''}
                    onChange={(e) =>
                      setContactField(idx, 'name', e.target.value)
                    }
                  />
                  <TextField
                    label="Email"
                    value={c.email || ''}
                    onChange={(e) =>
                      setContactField(idx, 'email', e.target.value)
                    }
                  />
                  <TextField
                    label="Phone"
                    value={c.phone || ''}
                    onChange={(e) =>
                      setContactField(idx, 'phone', e.target.value)
                    }
                  />
                  <TextField
                    label="LinkedIn"
                    value={c.linkedin_url || ''}
                    onChange={(e) =>
                      setContactField(idx, 'linkedin_url', e.target.value)
                    }
                  />
                  <TextField
                    label="Connection Type"
                    value={c.connection_type || ''}
                    onChange={(e) =>
                      setContactField(idx, 'connection_type', e.target.value)
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
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Timeline</div>
              {(app.timeline || []).map((ev, idx) => {
                const stage = (ev as any).stage || '';
                const hasSubmitted = (app.timeline || []).some(
                  (t) => ((t as any).stage || '') === 'Application Submitted',
                );
                const hasInterview1 = (app.timeline || []).some(
                  (t) =>
                    typeof (t as any).stage === 'string' &&
                    (t as any).stage.toLowerCase().includes('interview 1'),
                );
                const hasInterview2 = (app.timeline || []).some(
                  (t) =>
                    typeof (t as any).stage === 'string' &&
                    (t as any).stage.toLowerCase().includes('interview 2'),
                );
                const isInterview =
                  typeof stage === 'string' &&
                  stage.toLowerCase().includes('interview');
                const isAssessment = stage === 'Assessment';
                return (
                  <div
                    key={(() => {
                      if (ev && (ev as any).stage) {
                        return `timeline-${(ev as any).stage}-${idx}`;
                      }
                      return `timeline-${idx}`;
                    })()}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>
                      <FormControl fullWidth>
                        <InputLabel id={`timeline-stage-label-${idx}`}>
                          Event Type
                        </InputLabel>
                        <Select
                          labelId={`timeline-stage-label-${idx}`}
                          label="Event Type"
                          value={stage}
                          onChange={(e) =>
                            setTimelineEvent(idx, 'stage', e.target.value)
                          }
                        >
                          <MenuItem
                            value="Draft"
                            disabled={hasSubmitted && stage !== 'Draft'}
                          >
                            Draft
                          </MenuItem>
                          <MenuItem value="Application Submitted">
                            Application Submitted
                          </MenuItem>
                          <MenuItem value="Follow-up">Follow-up</MenuItem>
                          <MenuItem value="Assessment">Assessment</MenuItem>
                          <MenuItem value="Interview 1">Interview 1</MenuItem>
                          <MenuItem
                            value="Interview 2"
                            disabled={!hasInterview1 && stage !== 'Interview 2'}
                          >
                            Interview 2
                          </MenuItem>
                          <MenuItem
                            value="Interview 3"
                            disabled={!hasInterview2 && stage !== 'Interview 3'}
                          >
                            Interview 3
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    {/* Use explicit if/else instead of nested ternary for clarity */}
                    {isInterview && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#374151',
                              marginBottom: 4,
                            }}
                          >
                            Received
                          </div>
                          <TextField
                            fullWidth
                            type="date"
                            value={dateToInput((ev as any).date)}
                            onChange={(e) =>
                              setTimelineEvent(idx, 'date', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#374151',
                              marginBottom: 4,
                            }}
                          >
                            Interview Date
                          </div>
                          <TextField
                            fullWidth
                            type="date"
                            value={dateToInput((ev as any).due_date)}
                            onChange={(e) =>
                              setTimelineEvent(idx, 'due_date', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                    {isAssessment && !isInterview && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#374151',
                              marginBottom: 4,
                            }}
                          >
                            Received
                          </div>
                          <TextField
                            fullWidth
                            type="date"
                            value={dateToInput((ev as any).date)}
                            onChange={(e) =>
                              setTimelineEvent(idx, 'date', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#374151',
                              marginBottom: 4,
                            }}
                          >
                            Due Date
                          </div>
                          <TextField
                            fullWidth
                            type="date"
                            value={dateToInput((ev as any).due_date)}
                            onChange={(e) =>
                              setTimelineEvent(idx, 'due_date', e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#374151',
                              marginBottom: 4,
                            }}
                          >
                            Completed At
                          </div>
                          <TextField
                            fullWidth
                            type="date"
                            value={dateToInput((ev as any).completed_at)}
                            onChange={(e) =>
                              setTimelineEvent(
                                idx,
                                'completed_at',
                                e.target.value,
                              )
                            }
                            InputLabelProps={{ shrink: true }}
                          />
                        </div>
                      </div>
                    )}
                    {!isInterview && !isAssessment && (
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#374151',
                            marginBottom: 4,
                          }}
                        >
                          Date
                        </div>
                        <TextField
                          fullWidth
                          type="date"
                          value={dateToInput((ev as any).date)}
                          onChange={(e) =>
                            setTimelineEvent(idx, 'date', e.target.value)
                          }
                        />
                      </div>
                    )}

                    <div style={{ marginTop: 8 }}>
                      <TextField
                        multiline
                        fullWidth
                        value={(ev as any).notes || ''}
                        onChange={(e) =>
                          setTimelineEvent(idx, 'notes', e.target.value)
                        }
                        placeholder="Notes"
                      />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Button
                        size="small"
                        onClick={() => removeTimelineEvent(idx)}
                      >
                        Remove Event
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addTimelineEvent}
              >
                Add Event
              </Button>
            </div>
            {/* Notes Section */}

            <div style={{ marginTop: 24 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Notes</div>
              {(app.raw_notes || []).map((n, idx) => (
                <div
                  key={n ? `note-${n.slice(0, 8)}-${idx}` : `note-${idx}`}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <TextField
                    fullWidth
                    value={n}
                    onChange={(e) => {
                      setApp((prev) => {
                        const notes = [...(prev?.raw_notes || [])];
                        notes[idx] = e.target.value;
                        return { ...(prev || {}), raw_notes: notes };
                      });
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      setApp((prev) => {
                        const notes = [...(prev?.raw_notes || [])];
                        notes.splice(idx, 1);
                        return { ...(prev || {}), raw_notes: notes };
                      });
                    }}
                  >
                    <RemoveIcon />
                  </IconButton>
                </div>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setApp((prev) => ({
                    ...(prev || {}),
                    raw_notes: [...(prev?.raw_notes || []), ''],
                  }));
                }}
              >
                Add Note
              </Button>
            </div>

            <div
              style={{
                position: 'sticky',
                bottom: 0,
                background: '#fff',
                paddingTop: 12,
                paddingBottom: 12,
                marginTop: 12,
                borderTop: '1px solid #e5e7eb',
                zIndex: 20,
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
                {isChanged && (
                  <Button variant="contained" type="submit">
                    Submit Changes
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => navigate('/applications')}
                >
                  Exit
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Delete Application
                </Button>
              </div>
            </div>
          </Stack>
        </div>
      </form>
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => {
          if (!deleting) setConfirmDeleteOpen(false);
        }}
      >
        <DialogTitle>Delete this application?</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 12 }}>
            This action is permanent and will remove the application from your
            database.
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div>
              <strong>Company:</strong> {app.company_name || 'Not provided'}
            </div>
            <div>
              <strong>Role:</strong> {app.role_title || 'Not provided'}
            </div>
            <div>
              <strong>Location:</strong> {app.location || 'Not provided'}
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={deleting}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
