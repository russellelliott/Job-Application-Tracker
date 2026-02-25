import React from 'react';
import { JobApplication } from '../types';

interface AddApplicationFormProps {
  onSubmit: (app: Partial<JobApplication>) => void;
}

const SOURCE_OPTIONS = [
  { value: 'Cold Application', label: 'Cold Application', tooltip: 'Public job boards (LinkedIn, Otta, Simplify) without a referral.' },
  { value: 'Direct Connection', label: 'Direct Connection', tooltip: 'Personal contact, referral, or alumni network.' },
  { value: 'In-Person Event', label: 'In-Person Event', tooltip: 'Career fairs, tech mixers, or campus events.' },
  { value: 'Inbound Outreach', label: 'Inbound Outreach', tooltip: 'Recruiter/Founder reached out directly.' },
];

export default function AddApplicationForm({ onSubmit }: AddApplicationFormProps) {
  const [form, setForm] = React.useState<Partial<JobApplication>>({
    auxiliary_urls: [''],
    contacts: [{ name: '', email: '', linkedin_url: '', connection_type: '' }],
    timeline: [],
    raw_notes: [''],
  });

  // Handle simple fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Auxiliary URLs
  const handleAuxUrlChange = (idx: number, value: string) => {
    const urls = [...(form.auxiliary_urls || [])];
    urls[idx] = value;
    setForm({ ...form, auxiliary_urls: urls });
  };
  const addAuxUrl = () => setForm({ ...form, auxiliary_urls: [...(form.auxiliary_urls || []), ''] });
  const removeAuxUrl = (idx: number) => {
    const urls = [...(form.auxiliary_urls || [])];
    urls.splice(idx, 1);
    setForm({ ...form, auxiliary_urls: urls });
  };

  // Contacts
  const handleContactChange = (idx: number, field: string, value: string) => {
    const contacts = [...(form.contacts || [])];
    contacts[idx] = { ...contacts[idx], [field]: value };
    setForm({ ...form, contacts });
  };
  const addContact = () => setForm({ ...form, contacts: [...(form.contacts || []), { name: '', email: '', linkedin_url: '', connection_type: '' }] });
  const removeContact = (idx: number) => {
    const contacts = [...(form.contacts || [])];
    contacts.splice(idx, 1);
    setForm({ ...form, contacts });
  };

  // Notes
  const handleNoteChange = (idx: number, value: string) => {
    const notes = [...(form.raw_notes || [])];
    notes[idx] = value;
    setForm({ ...form, raw_notes: notes });
  };
  const addNote = () => setForm({ ...form, raw_notes: [...(form.raw_notes || []), ''] });
  const removeNote = (idx: number) => {
    const notes = [...(form.raw_notes || [])];
    notes.splice(idx, 1);
    setForm({ ...form, raw_notes: notes });
  };

  // Timeline logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    let timeline = form.timeline || [];
    if (form.source) {
      timeline = [
        ...timeline,
        { stage: 'Application Submitted', date: now, notes: null },
      ];
    } else {
      timeline = [
        ...timeline,
        { stage: 'Draft', date: now, notes: null },
      ];
    }
    onSubmit({ ...form, timeline });
  };

  const source = form.source as string | undefined;
  const buttonLabel = source ? 'Submit Application' : 'Save as Draft';

  return (
    <form className="space-y-4 max-w-xl" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium">Company Name</label>
        <input name="company_name" className="input" onChange={handleChange} />
      </div>
      <div>
        <label className="block font-medium">Role Title</label>
        <input name="role_title" className="input" onChange={handleChange} />
      </div>
      <div>
        <label className="block font-medium">Location</label>
        <input name="location" className="input" onChange={handleChange} />
      </div>
      <div>
        <label className="block font-medium">Job URL</label>
        <input name="job_url" className="input" onChange={handleChange} />
      </div>
      <div>
        <label className="block font-medium">Source</label>
        <select name="source" className="input" onChange={handleChange}>
          <option value="">-- Select Source --</option>
          {SOURCE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value} title={opt.tooltip}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-medium">Auxiliary URLs</label>
        {(form.auxiliary_urls || []).map((url, idx) => (
          <div key={idx} className="flex gap-2 mb-1">
            <input className="input flex-1" value={url} onChange={e => handleAuxUrlChange(idx, e.target.value)} />
            <button type="button" className="btn-secondary" onClick={() => removeAuxUrl(idx)}>-</button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addAuxUrl}>Add URL</button>
      </div>
      <div>
        <label className="block font-medium">Contacts</label>
        {(form.contacts || []).map((contact, idx) => (
          <div key={idx} className="flex gap-2 mb-1">
            <input className="input" placeholder="Name" value={contact.name || ''} onChange={e => handleContactChange(idx, 'name', e.target.value)} />
            <input className="input" placeholder="Email" value={contact.email || ''} onChange={e => handleContactChange(idx, 'email', e.target.value)} />
            <input className="input" placeholder="LinkedIn" value={contact.linkedin_url || ''} onChange={e => handleContactChange(idx, 'linkedin_url', e.target.value)} />
            <input className="input" placeholder="Connection Type" value={contact.connection_type || ''} onChange={e => handleContactChange(idx, 'connection_type', e.target.value)} />
            <button type="button" className="btn-secondary" onClick={() => removeContact(idx)}>-</button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addContact}>Add Contact</button>
      </div>
      <div>
        <label className="block font-medium">Notes</label>
        {(form.raw_notes || []).map((note, idx) => (
          <div key={idx} className="flex gap-2 mb-1">
            <input className="input flex-1" value={note} onChange={e => handleNoteChange(idx, e.target.value)} />
            <button type="button" className="btn-secondary" onClick={() => removeNote(idx)}>-</button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addNote}>Add Note</button>
      </div>
      <button type="submit" className="btn-primary">{buttonLabel}</button>
    </form>
  );
}
