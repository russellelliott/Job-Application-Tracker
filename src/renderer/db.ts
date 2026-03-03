import PouchDB from 'pouchdb-browser';
import { JobApplication } from '../types';

// Create or open the PouchDB database
const db = new PouchDB<JobApplication>('job-applications');

// Normalize a date-only string (YYYY-MM-DD) to local-midnight form
const normalizeDateString = (s?: string | null) => {
  if (!s) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00`;
  return s;
};

const normalizeTimeline = (timeline?: JobApplication['timeline']) => {
  if (!timeline) return timeline;
  return timeline.map((ev: any) => {
    const out = { ...ev } as any;
    if (out.date) out.date = normalizeDateString(out.date);
    if (out.due_date) out.due_date = normalizeDateString(out.due_date);
    return out;
  });
};

// Run a one-time migration to update existing docs that have date-only strings
(async () => {
  try {
    const all = await db.allDocs<JobApplication>({ include_docs: true });
    for (const row of all.rows) {
      const doc = row.doc as any;
      if (!doc) continue;
      const oldTimeline = doc.timeline || [];
      const newTimeline = normalizeTimeline(oldTimeline);
      const changed =
        JSON.stringify(oldTimeline) !== JSON.stringify(newTimeline);
      if (changed) {
        const updated = { ...doc, timeline: newTimeline };
        try {
          await db.put(updated);
        } catch (e) {
          // ignore individual put errors
          // console.error('migration put failed', e);
        }
      }
    }
  } catch (e) {
    // migration failed; continue without blocking app
  }
})();

// CRUD utility functions
export const addApplication = async (app: JobApplication) => {
  // store both _id and id to make retrieval consistent
  const doc = { ...app, _id: app.id, id: app.id } as any;
  if (doc.timeline) doc.timeline = normalizeTimeline(doc.timeline as any);
  return db.put(doc);
};

export const getAllApplications = async (): Promise<JobApplication[]> => {
  const result = await db.allDocs<JobApplication>({ include_docs: true });
  return result.rows
    .map((row) => {
      const d = row.doc!;
      if (d && !(d as any).id) (d as any).id = (d as any)._id;
      return d;
    })
    .filter(Boolean);
};

export const getApplication = async (
  id: string,
): Promise<JobApplication | null> => {
  try {
    return await db.get(id);
  } catch (e) {
    // fallback: scan all docs for matching id or _id
    const all = await getAllApplications();
    const found = all.find((d) => d.id === id || (d as any)._id === id);
    return found || null;
  }
};

export const updateApplication = async (app: JobApplication) => {
  const existing = await db.get(app.id);
  const merged = { ...existing, ...app } as any;
  if (merged.timeline)
    merged.timeline = normalizeTimeline(merged.timeline as any);
  return db.put(merged);
};

export const deleteApplication = async (id: string) => {
  const doc = await db.get(id);
  return db.remove(doc);
};

// --- Analytics & Dashboard helpers ---

// Helper: get last timeline event date
function getLastTimelineDate(app: JobApplication): string | undefined {
  if (!app.timeline || app.timeline.length === 0) return undefined;
  return app.timeline[app.timeline.length - 1].date;
}

// Note: `getStagnantApplications` helper removed — compute stagnant state in UI when needed.

// Helper: dashboard stats
export const getDashboardStats = async () => {
  const all = await getAllApplications();
  const totalApplications = all.length;
  let totalInterviews = 0;
  let totalOffers = 0;
  let totalAssessments = 0;
  const trends: Array<{
    date: string;
    applications: number;
    interviews: number;
  }> = [];

  // Simple trend: count per week
  const weeks: Record<string, { applications: number; interviews: number }> =
    {};
  all.forEach((app) => {
    (app.timeline || []).forEach((ev) => {
      const week = new Date(ev.date);
      week.setDate(week.getDate() - week.getDay());
      const weekStr = week.toISOString().slice(0, 10);
      if (!weeks[weekStr]) weeks[weekStr] = { applications: 0, interviews: 0 };
      if (ev.stage === 'Application Submitted') weeks[weekStr].applications++;
      if (ev.stage.startsWith('Interview')) weeks[weekStr].interviews++;
      if (ev.stage === 'Assessment') totalAssessments++;
      if (ev.stage === 'Offer') totalOffers++;
      if (ev.stage.startsWith('Interview')) totalInterviews++;
    });
  });
  Object.entries(weeks).forEach(([date, vals]) =>
    trends.push({ date, ...vals }),
  );
  trends.sort((a, b) => a.date.localeCompare(b.date));
  return {
    totalApplications,
    totalInterviews,
    totalOffers,
    totalAssessments,
    trends,
  };
};

// Helper: analytics data (for funnel, rates, etc)
export const getAnalyticsData = async (): Promise<JobApplication[]> => {
  const all = await getAllApplications();
  return all;
};

export default db;
