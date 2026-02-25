import PouchDB from 'pouchdb-browser';
import { JobApplication } from '../types';

// Create or open the PouchDB database
const db = new PouchDB<JobApplication>('job-applications');

// CRUD utility functions
export const addApplication = async (app: JobApplication) => {
  return db.put({ ...app, _id: app.id });
};

export const getAllApplications = async (): Promise<JobApplication[]> => {
  const result = await db.allDocs<JobApplication>({ include_docs: true });
  return result.rows.map((row) => row.doc!).filter(Boolean);
};

export const getApplication = async (id: string): Promise<JobApplication | null> => {
  try {
    return await db.get(id);
  } catch (e) {
    return null;
  }
};

export const updateApplication = async (app: JobApplication) => {
  const existing = await db.get(app.id);
  return db.put({ ...existing, ...app });
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

// Helper: get stagnant applications (no activity in 14+ days)
export const getStagnantApplications = async (): Promise<JobApplication[]> => {
  const all = await getAllApplications();
  const now = new Date();
  return all
    .filter((app) => {
      const last = getLastTimelineDate(app);
      if (!last) return false;
      const diff = (now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 14;
    })
    .map((app) => ({ ...app, lastTimelineDate: getLastTimelineDate(app) }));
};

// Helper: dashboard stats
export const getDashboardStats = async () => {
  const all = await getAllApplications();
  const totalApplications = all.length;
  let totalInterviews = 0;
  let totalOffers = 0;
  let totalAssessments = 0;
  const trends: Array<{ date: string; applications: number; interviews: number }> = [];

  // Simple trend: count per week
  const weeks: Record<string, { applications: number; interviews: number }> = {};
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
  Object.entries(weeks).forEach(([date, vals]) => trends.push({ date, ...vals }));
  trends.sort((a, b) => a.date.localeCompare(b.date));
  return { totalApplications, totalInterviews, totalOffers, totalAssessments, trends };
};

// Helper: analytics data (for funnel, rates, etc)
export const getAnalyticsData = async (): Promise<JobApplication[]> => {
  const all = await getAllApplications();
  return all;
};

export default db;
