import React, { useState } from 'react';
import { TimelineEvent } from '../types';

interface TimelineEventFormProps {
  onSubmit: (event: TimelineEvent) => void;
  existingEvent?: TimelineEvent;
}

const EVENT_TYPES = [
  'Assessment',
  'Follow-up',
  'Interview',
  'Other',
];

const TimelineEventForm: React.FC<TimelineEventFormProps> = ({ onSubmit, existingEvent }) => {
  const [type, setType] = useState(existingEvent?.stage || 'Assessment');
  const [date, setDate] = useState(existingEvent?.date || '');
  const [dueDate, setDueDate] = useState((existingEvent as any)?.due_date || '');
  const [completedAt, setCompletedAt] = useState((existingEvent as any)?.completed_at || '');
  const [notes, setNotes] = useState(existingEvent?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let event: TimelineEvent;
    if (type === 'Assessment') {
      event = { stage: type, date, due_date: dueDate, completed_at: completedAt, notes };
    } else if (type === 'Follow-up') {
      event = { stage: type, date, notes };
    } else if (type.startsWith('Interview')) {
      event = { stage: type, date, due_date: dueDate, notes };
    } else {
      event = { stage: type, date, notes };
    }
    onSubmit(event);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium">Event Type</label>
        <select className="input" value={type} onChange={e => setType(e.target.value)}>
          <option value="Assessment">Assessment</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Interview 1">Interview 1</option>
          <option value="Interview 2">Interview 2</option>
          <option value="Interview 3">Interview 3</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="block font-medium">Date</label>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </div>
      {(type === 'Assessment' || type.startsWith('Interview')) && (
        <div>
          <label className="block font-medium">Due Date</label>
          <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      )}
      {type === 'Assessment' && (
        <div>
          <label className="block font-medium">Completed At</label>
          <input className="input" type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)} />
        </div>
      )}
      <div>
        <label className="block font-medium">Notes</label>
        <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary">Save Event</button>
    </form>
  );
};

export default TimelineEventForm;
