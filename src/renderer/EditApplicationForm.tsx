import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplication, updateApplication } from './db';
import { JobApplication } from '../types';

export default function EditApplicationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Partial<JobApplication> | null>(null);
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
        setLoading(false);
        return null;
      })
      .catch(() => setLoading(false));
  }, [id]);

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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Edit Application</h2>
      <form className="space-y-4 max-w-xl" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="company_name" className="block font-medium">Company Name</label>
          <input id="company_name" name="company_name" className="input" value={app.company_name || ''} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="role_title" className="block font-medium">Role Title</label>
          <input id="role_title" name="role_title" className="input" value={app.role_title || ''} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="location" className="block font-medium">Location</label>
          <input id="location" name="location" className="input" value={app.location || ''} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="job_url" className="block font-medium">Job URL</label>
          <input id="job_url" name="job_url" className="input" value={app.job_url || ''} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="source" className="block font-medium">Source</label>
          <select id="source" name="source" className="input" value={app.source || ''} onChange={handleChange}>
            <option value="">-- Select Source --</option>
            <option value="Cold Application">Cold Application</option>
            <option value="Direct Connection">Direct Connection</option>
            <option value="In-Person Event">In-Person Event</option>
            <option value="Inbound Outreach">Inbound Outreach</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Auxiliary URLs</label>
          {(app.auxiliary_urls || []).map((url, idx) => (
            <div key={idx} className="flex gap-2 mb-1">
              <input className="input flex-1" value={url} onChange={(e) => setAuxUrl(idx, e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => removeAuxUrl(idx)}>-</button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addAuxUrl}>Add URL</button>
        </div>

        <div>
          <label className="block font-medium">Contacts</label>
          {(app.contacts || []).map((c, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 mb-1">
              <input className="input" placeholder="Name" value={c.name || ''} onChange={(e) => setContactField(idx, 'name', e.target.value)} />
              <input className="input" placeholder="Email" value={c.email || ''} onChange={(e) => setContactField(idx, 'email', e.target.value)} />
              <input className="input" placeholder="LinkedIn" value={c.linkedin_url || ''} onChange={(e) => setContactField(idx, 'linkedin_url', e.target.value)} />
              <input className="input" placeholder="Connection Type" value={c.connection_type || ''} onChange={(e) => setContactField(idx, 'connection_type', e.target.value)} />
              <div className="col-span-4">
                <button type="button" className="btn-secondary mt-1" onClick={() => removeContact(idx)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addContact}>Add Contact</button>
        </div>

        <div>
          <label className="block font-medium">Timeline</label>
          {(app.timeline || []).map((ev, idx) => (
            <div key={idx} className="border rounded p-2 mb-2">
              <div className="grid grid-cols-3 gap-2">
                <input className="input" value={(ev as any).stage || ''} onChange={(e) => setTimelineEvent(idx, 'stage', e.target.value)} placeholder="Stage" />
                <input className="input" type="date" value={(ev as any).date ? new Date((ev as any).date).toISOString().slice(0,10) : ''} onChange={(e) => setTimelineEvent(idx, 'date', e.target.value)} />
                <input className="input" type="date" value={(ev as any).due_date ? new Date((ev as any).due_date).toISOString().slice(0,10) : ''} onChange={(e) => setTimelineEvent(idx, 'due_date', e.target.value)} />
              </div>
              <div className="mt-2">
                <textarea className="input w-full" value={(ev as any).notes || ''} onChange={(e) => setTimelineEvent(idx, 'notes', e.target.value)} placeholder="Notes" />
              </div>
              <div className="mt-2">
                <button type="button" className="btn-secondary" onClick={() => removeTimelineEvent(idx)}>Remove Event</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addTimelineEvent}>Add Event</button>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary">Save</button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/applications')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
