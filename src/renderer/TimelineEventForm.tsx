import React, { useState } from 'react';
import { TimelineEvent } from '../types';

interface TimelineEventFormProps {
  onSubmit: (event: TimelineEvent) => void;
  existingEvent?: TimelineEvent;
}

const EVENT_TYPES = ['Assessment', 'Follow-up', 'Interview', 'Other'];

const TimelineEventForm: React.FC<TimelineEventFormProps> = ({
  onSubmit,
  existingEvent,
}) => {
  const inputFromStored = (s?: string | null) => {
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (typeof s === 'string' && s.length >= 10) return s.slice(0, 10);
    try {
      return new Date(s).toISOString().slice(0, 10);
    } catch (e) {
      return '';
    }
  };

  const [type, setType] = useState(existingEvent?.stage || 'Assessment');
  const [date, setDate] = useState(inputFromStored(existingEvent?.date || ''));
  const [dueDate, setDueDate] = useState(
    inputFromStored((existingEvent as any)?.due_date || ''),
  );
  const [completedAt, setCompletedAt] = useState(
    inputFromStored((existingEvent as any)?.completed_at || ''),
  );
  const [notes, setNotes] = useState(existingEvent?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let event: TimelineEvent;
    const store = (s: string) => (s ? `${s}T00:00:00` : '');
    if (type === 'Assessment') {
      event = {
        stage: type,
        date: store(date),
        due_date: store(dueDate),
        completed_at: store(completedAt),
        notes,
      };
    } else if (type === 'Follow-up') {
      event = { stage: type, date: store(date), notes };
    } else if (type.startsWith('Interview')) {
      event = {
        stage: type,
        date: store(date),
        due_date: store(dueDate),
        notes,
      };
    } else {
      event = { stage: type, date: store(date), notes };
    }
    onSubmit(event);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium">Event Type</label>
        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
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
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      {(type === 'Assessment' || type.startsWith('Interview')) && (
        <div>
          <label className="block font-medium">Due Date</label>
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      )}
      {type === 'Assessment' && (
        <div>
          <label className="block font-medium">Completed At</label>
          <input
            className="input"
            type="date"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
          />
        </div>
      )}
      <div>
        <label className="block font-medium">Notes</label>
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary">
        Save Event
      </button>
    </form>
  );
};

export default TimelineEventForm;
