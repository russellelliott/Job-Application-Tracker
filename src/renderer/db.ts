import PouchDB from 'pouchdb-browser';
import { JobApplication, Contact } from '../types';

// --- Contact deduplication & merge utilities ---

/**
 * Check if two contacts are duplicates (all 5 fields match).
 * Empty/null values are treated as equal to each other.
 */
export function isDuplicateContact(a: Contact, b: Contact): boolean {
  return (
     (a.name || '') === (b.name || '') &&
     (a.email || '') === (b.email || '') &&
     (a.phone || '') === (b.phone || '') &&
     (a.linkedin_url || '') === (b.linkedin_url || '') &&
     (a.connection_type || '') === (b.connection_type || '')
   );
}

/**
 * Merge two contacts by combining non-null/non-empty fields.
 */
export function mergeContacts(a: Contact, b: Contact): Contact {
  return {
    name: a.name || b.name,
    email: a.email || b.email,
    phone: a.phone || b.phone,
    linkedin_url: a.linkedin_url || b.linkedin_url,
    connection_type: a.connection_type || b.connection_type,
  };
}

/**
 * Merge an array of contacts into a deduplicated list.
 * Duplicates are merged by combining non-null fields.
 */
export function mergeContactArray(contacts: Contact[]): Contact[] {
  const merged: Contact[] = [];
  for (const contact of contacts) {
    const dupIndex = merged.findIndex((c) => isDuplicateContact(c, contact));
    if (dupIndex >= 0) {
      merged[dupIndex] = mergeContacts(merged[dupIndex], contact);
    } else {
      merged.push({ ...contact });
    }
  }
  return merged;
}

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

// --- Contact sharing helpers ---

/**
 * Get a sorted list of distinct company names from all applications.
 */
export const getDistinctCompanies = async (): Promise<string[]> => {
  const all = await getAllApplications();
  const companies = new Set<string>();
  for (const app of all) {
    if (app.company_name && app.company_name.trim()) {
      companies.add(app.company_name.trim());
     }
   }
  return Array.from(companies).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
};

/**
 * Get the union of all contacts across all applications for a given company.
 * Contacts are deduplicated using the 5-field match (name, email, phone, linkedin_url, connection_type).
 */
export const getCompanyContacts = async (companyName: string): Promise<Contact[]> => {
  const all = await getAllApplications();
  const normalizedCompany = companyName.trim().toLowerCase();
  const allContacts: Contact[] = [];
  for (const app of all) {
    if ((app.company_name || '').trim().toLowerCase() === normalizedCompany) {
      if (app.contacts && Array.isArray(app.contacts)) {
        allContacts.push(...app.contacts);
       }
     }
   }
  return mergeContactArray(allContacts);
};

/**
  * Get all unique contacts across all applications, grouped by company.
  * Only returns contacts that have at least one application.
  * Contacts are sorted alphabetically by company name.
  */
export const getAllContacts = async (): Promise< Array<{
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  connection_type: string | null;
  companies: string[];
  applications: Array<{ id: string; company_name: string | null; role_title: string | null; date: string }>;
}> > => {
  const all = await getAllApplications();

   // Step 1: Group applications by company (normalized lowercase)
  const companyAppsMap = new Map<string, JobApplication[]>();

  for (const app of all) {
    const companyName = app.company_name?.trim() || '';
    if (!companyName) continue; // Skip applications without a company name
    const normalized = companyName.toLowerCase();
    if (!companyAppsMap.has(normalized)) {
      companyAppsMap.set(normalized, []);
    }
    companyAppsMap.get(normalized)!.push(app);
   }

   // Step 2: For each company, collect all contacts from its applications
   // Map: contactKey -> { contact, companies, applications }
  const contactMap = new Map<string, {
    contact: Contact;
    companies: Set<string>;
    applications: Array<{ id: string; company_name: string | null; role_title: string | null; date: string }>;
   }>();

  for (const [normalizedCompany, apps] of companyAppsMap.entries()) {
    const displayName = apps[0]?.company_name || normalizedCompany;

    for (const app of apps) {
      const contacts = app.contacts || [];
      for (const contact of contacts) {
         // Only consider a contact if it has at least one field filled
        const hasAnyField = !!(contact.name || contact.email || contact.phone || contact.linkedin_url || contact.connection_type);
        if (!hasAnyField) continue;

         // Use the full 5-field combination as the key
        const key = [
          contact.name || '',
          contact.email || '',
          contact.phone || '',
          contact.linkedin_url || '',
          contact.connection_type || '',
         ].join('|');

        if (!contactMap.has(key)) {
          contactMap.set(key, {
            contact: { ...contact },
            companies: new Set<string>(),
            applications: [],
           });
         }

        const entry = contactMap.get(key)!;
        entry.companies.add(displayName);

         // Find the most recent timeline date from this application
        let mostRecentDate = '';
        if (app.timeline && app.timeline.length > 0) {
          const dates = app.timeline.map((t: any) => t.date || '').filter(Boolean).sort().reverse();
          mostRecentDate = dates[0] || '';
         }

        entry.applications.push({
          id: app.id,
          company_name: app.company_name,
          role_title: app.role_title,
          date: mostRecentDate,
         });
       }
     }
   }

  // Step 3: Filter out contacts with no applications
  const contactsWithApps = Array.from(contactMap.entries()).filter(([, entry]) => entry.applications.length > 0);

  // Step 4: Sort applications by date descending within each contact
  for (const [, entry] of contactsWithApps) {
    entry.applications.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  }

   // Step 5: Sort contacts alphabetically by company name (primary), then by contact fields (secondary)
  contactsWithApps.sort((a, b) => {
    const aCompanies = Array.from(a[1].companies);
    const bCompanies = Array.from(b[1].companies);
    const aPrimaryCompany = aCompanies.length > 0 ? aCompanies[0].toLowerCase() : '';
    const bPrimaryCompany = bCompanies.length > 0 ? bCompanies[0].toLowerCase() : '';
    const cmp = aPrimaryCompany.localeCompare(bPrimaryCompany);
    if (cmp !== 0) return cmp;
     // Secondary sort by contact key fields for consistent ordering within same company
    const aKey = [a[0], a[1].contact.email || '', a[1].contact.phone || ''];
    const bKey = [b[0], b[1].contact.email || '', b[1].contact.phone || ''];
    return aKey.join('|').localeCompare(bKey.join('|'));
   });

  // Step 6: Return sorted results with companies sorted alphabetically
  return contactsWithApps.map(([, entry]) => ({
    ...entry.contact,
    companies: Array.from(entry.companies).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    applications: entry.applications,
  }));
};

/**
 * Update all applications for a given company with a new contacts list.
 */
const updateCompanyContacts = async (companyName: string, contacts: Contact[]): Promise<void> => {
  const all = await getAllApplications();
  const normalizedCompany = companyName.trim().toLowerCase();
  const updates: Promise<any>[] = [];

  for (const app of all) {
    if ((app.company_name || '').trim().toLowerCase() === normalizedCompany) {
      const updatedApp = { ...app, contacts: [...contacts] } as any;
      updatedApp.timeline = normalizeTimeline(updatedApp.timeline as any);
      updates.push(db.put(updatedApp));
     }
   }

  await Promise.all(updates);
};

export const addApplication = async (app: JobApplication) => {
   // store both _id and id to make retrieval consistent
  const doc = { ...app, _id: app.id, id: app.id } as any;
  if (doc.timeline) doc.timeline = normalizeTimeline(doc.timeline as any);
  const result = await db.put(doc);

  // Propagate contacts to all other applications for the same company
  if (app.company_name && app.contacts && app.contacts.length > 0) {
    try {
      const allApps = await getAllApplications();
      const normalizedCompany = app.company_name.trim().toLowerCase();
      const companyApps = allApps.filter(
        (a) => (a.company_name || '').trim().toLowerCase() === normalizedCompany && a.id !== app.id
      );

      // Build merged contacts: existing contacts from all apps + new app's contacts
      const allContacts: Contact[] = [];
      for (const a of companyApps) {
        if (a.contacts && Array.isArray(a.contacts)) {
          allContacts.push(...a.contacts);
         }
       }
      allContacts.push(...app.contacts);
      const merged = mergeContactArray(allContacts);

      // Update all other applications for this company
      await updateCompanyContacts(app.company_name, merged);
     } catch (e) {
       // Don't fail the application add if contact propagation fails
       console.error('Failed to propagate contacts:', e);
     }
   }

  return result;
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
  const result = await db.put(merged);

   // Propagate contact changes to all other applications for the same company
  if (app.company_name && app.contacts) {
    try {
      const allApps = await getAllApplications();
      const normalizedCompany = app.company_name.trim().toLowerCase();
      const companyApps = allApps.filter(
         (a) => (a.company_name || '').trim().toLowerCase() === normalizedCompany && a.id !== app.id
       );

        // Build merged contacts: existing contacts from all apps + updated app's contacts
      const allContacts: Contact[] = [];
      for (const a of companyApps) {
        if (a.contacts && Array.isArray(a.contacts)) {
          allContacts.push(...a.contacts);
          }
        }
      allContacts.push(...app.contacts);
      const mergedContacts = mergeContactArray(allContacts);

       // Update all other applications for this company
      await updateCompanyContacts(app.company_name, mergedContacts);
      } catch (e) {
       console.error('Failed to propagate contact updates:', e);
      }
    }

  return result;
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
