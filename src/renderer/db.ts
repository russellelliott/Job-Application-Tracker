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
  return result.rows.map(row => row.doc!).filter(Boolean);
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

export default db;
