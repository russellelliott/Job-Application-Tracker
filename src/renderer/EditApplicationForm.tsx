import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplication, updateApplication } from './db';
import { JobApplication } from '../types';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

export default function EditApplicationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Partial<JobApplication> | null>(null);
  const [originalJson, setOriginalJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
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

  const isChanged = useMemo(() => {
    if (!app) return false;
    try {
      return JSON.stringify(app) !== originalJson;
    } catch (e) {
      return false;
    }
  }, [app, originalJson]);

  if (loading) return <div>Loading application...</div>;
  if (!app) return <div>Application not found.</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
  const addAuxUrl = () => setApp((prev) => ({ ...(prev || {}), auxiliary_urls: [...(prev?.auxiliary_urls || []), ''] }));
  const removeAuxUrl = (idx: number) => setApp((prev) => {
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
  const addContact = () => setApp((prev) => ({ ...(prev || {}), contacts: [...(prev?.contacts || []), { name: '', email: '', linkedin_url: '', connection_type: '' }] }));
  const removeContact = (idx: number) => setApp((prev) => {
    const contacts = [...(prev?.contacts || [])];
    contacts.splice(idx, 1);
    return { ...(prev || {}), contacts };
  });

  // Timeline handlers
  const setTimelineEvent = (idx: number, field: string, value: string) => {
    setApp((prev) => {
      const timeline = [...(prev?.timeline || [])];
      timeline[idx] = { ...(timeline[idx] || {} as any), [field]: value } as any;
      return { ...(prev || {}), timeline };
    });
  };
  const addTimelineEvent = () => setApp((prev) => ({ ...(prev || {}), timeline: [...(prev?.timeline || []), { stage: 'Follow-up', date: new Date().toISOString(), notes: '' }] }));
  const removeTimelineEvent = (idx: number) => setApp((prev) => {
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
    navigate('/applications');
  };

  return (
    <div style={{ padding: 24, height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Edit Application</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: 12 }}>
          <Stack spacing={2} sx={{ maxWidth: 800 }}>
          <TextField label="Company Name" value={app.company_name || ''} onChange={handleChange} name="company_name" />
          <TextField label="Role Title" value={app.role_title || ''} onChange={handleChange} name="role_title" />
          <TextField label="Location" value={app.location || ''} onChange={handleChange} name="location" />
          <TextField label="Job URL" value={app.job_url || ''} onChange={handleChange} name="job_url" />

          <FormControl fullWidth>
            <InputLabel id="source-edit-label">Source</InputLabel>
            <Select labelId="source-edit-label" label="Source" name="source" value={app.source || ''} onChange={handleChange}>
              <MenuItem value="">(None)</MenuItem>
              <MenuItem value="Cold Application">Cold Application</MenuItem>
              <MenuItem value="Direct Connection">Direct Connection</MenuItem>
              <MenuItem value="In-Person Event">In-Person Event</MenuItem>
              <MenuItem value="Inbound Outreach">Inbound Outreach</MenuItem>
            </Select>
          </FormControl>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Auxiliary URLs</div>
            {(app.auxiliary_urls || []).map((url, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <TextField fullWidth value={url} onChange={(e) => setAuxUrl(idx, e.target.value)} />
                <IconButton size="small" onClick={() => removeAuxUrl(idx)}><RemoveIcon /></IconButton>
              </div>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addAuxUrl}>Add URL</Button>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Contacts</div>
            {(app.contacts || []).map((c, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <TextField label="Name" value={c.name || ''} onChange={(e) => setContactField(idx, 'name', e.target.value)} />
                <TextField label="Email" value={c.email || ''} onChange={(e) => setContactField(idx, 'email', e.target.value)} />
                <TextField label="LinkedIn" value={c.linkedin_url || ''} onChange={(e) => setContactField(idx, 'linkedin_url', e.target.value)} />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton size="small" onClick={() => removeContact(idx)}><RemoveIcon /></IconButton>
                </div>
              </div>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addContact}>Add Contact</Button>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Timeline</div>
            {(app.timeline || []).map((ev, idx) => (
              <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <TextField value={(ev as any).stage || ''} onChange={(e) => setTimelineEvent(idx, 'stage', e.target.value)} placeholder="Stage" />
                  <TextField type="date" value={(ev as any).date ? new Date((ev as any).date).toISOString().slice(0,10) : ''} onChange={(e) => setTimelineEvent(idx, 'date', e.target.value)} />
                  <TextField type="date" value={(ev as any).due_date ? new Date((ev as any).due_date).toISOString().slice(0,10) : ''} onChange={(e) => setTimelineEvent(idx, 'due_date', e.target.value)} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <TextField multiline fullWidth value={(ev as any).notes || ''} onChange={(e) => setTimelineEvent(idx, 'notes', e.target.value)} placeholder="Notes" />
                </div>
                <div style={{ marginTop: 8 }}>
                  <Button size="small" onClick={() => removeTimelineEvent(idx)}>Remove Event</Button>
                </div>
              </div>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addTimelineEvent}>Add Event</Button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="text" onClick={() => navigate(-1)}>Back</Button>
            {isChanged && <Button variant="contained" type="submit">Submit Changes</Button>}
            <Button variant="outlined" onClick={() => navigate('/applications')}>Exit</Button>
          </div>
          </Stack>
        </div>
      </form>
    </div>
  );
}
