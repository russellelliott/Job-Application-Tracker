export function getDisplayDate(application: any): number {
  const timeline = application.timeline || [];
  if (timeline.length === 0) return -Infinity;
  const lastEvent = timeline[timeline.length - 1] || null;
  if (!lastEvent) return -Infinity;
  const stage = lastEvent.stage || '';
  const dateStr =
    typeof stage === 'string' && stage.toLowerCase().includes('interview')
      ? lastEvent.due_date || lastEvent.date
      : lastEvent.date;
  if (!dateStr) return -Infinity;
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? -Infinity : t;
}

export function compareApplicationsForTableOrder(a: any, b: any): number {
  const aDate = getDisplayDate(a);
  const bDate = getDisplayDate(b);

  // Newest first by display date.
  if (aDate !== bDate) return bDate - aDate;

  const companyA = String(a.company_name || '').toLowerCase();
  const companyB = String(b.company_name || '').toLowerCase();
  const companyCompare = companyA.localeCompare(companyB);
  if (companyCompare !== 0) return companyCompare;

  const roleA = String(a.role_title || '').toLowerCase();
  const roleB = String(b.role_title || '').toLowerCase();
  const roleCompare = roleA.localeCompare(roleB);
  if (roleCompare !== 0) return roleCompare;

  const idA = String(a.id || a._id || '');
  const idB = String(b.id || b._id || '');
  return idA.localeCompare(idB);
}

export function getApplicationIdsInTableOrder(applications: any[]): string[] {
  return [...applications]
    .sort(compareApplicationsForTableOrder)
    .map((application) => String(application.id || application._id || ''))
    .filter(Boolean);
}
