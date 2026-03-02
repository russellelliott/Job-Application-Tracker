// TypeScript interfaces for Job Application Tracker

export interface Contact {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  connection_type: string | null;
}

export type TimelineEvent =
  | { stage: 'Application Submitted' | 'Draft' | 'Follow-up'; date: string; notes: string | null }
  | { stage: 'Assessment'; date: string; due_date: string; completed_at: string | null; notes: string | null }
  | { stage: string; date: string; due_date: string; notes: string | null };


export interface JobApplication {
  id: string; // PouchDB _id
  company_name: string | null;
  role_title: string | null;
  location: string | null;
  source: 'Cold Application' | 'Direct Connection' | 'In-Person Event' | 'Inbound Outreach' | null;
  job_url: string | null;
  auxiliary_urls: string[];
  contacts: Contact[];
  timeline: TimelineEvent[];
  raw_notes: string[];
  // For stagnant badge
  lastTimelineDate?: string;
}

// Analytics types
export interface AnalyticsStats {
  interviewTransition: number;
  nextStepRates: Array<{ label: string; rate: number }>;
  cold: { funnelData: Array<{ stage: string; count: number }> };
  warm: { funnelData: Array<{ stage: string; count: number }> };
}
