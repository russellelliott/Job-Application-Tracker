import React, { useEffect, useState } from 'react';
import { BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar, ResponsiveContainer } from 'recharts';
import { getAnalyticsData } from './db';
import { JobApplication } from '../types';

function computeStats(apps: JobApplication[]) {
  // CRITICAL: Exclude drafts immediately
  const activeApps = apps.filter(app => app.status !== 'Draft');

  const cold = activeApps.filter((app) => app.source === 'Cold Application');
  const warm = activeApps.filter((app) => app.source !== 'Cold Application');

  const getPathData = (appsList: JobApplication[]) => {
    const getStages = (app: JobApplication) =>
      (app.timeline || []).map(ev => (ev.stage || '').toLowerCase().trim());

    // 1. Total Applications (Events where "Application Submitted" was logged)
    const totalSubmitted = appsList.filter(app =>
      getStages(app).includes('application submitted')
    ).length;

    // 2. Count Interview 1s
    const reachedInt1 = appsList.filter(app =>
      getStages(app).includes('interview 1')
    ).length;

    // 3. Count Interview 2s
    const reachedInt2 = appsList.filter(app =>
      getStages(app).includes('interview 2')
    ).length;

    // 4. Calculate Transition (Int 1 -> Int 2)
    // We use Math.round to keep the table clean
    const transitionRate = reachedInt1 > 0
      ? Math.round((reachedInt2 / reachedInt1) * 100)
      : 0;

    return [
      { label: 'Applications', count: totalSubmitted },
      { label: 'Interview 1', count: reachedInt1 },
      { label: 'Interview 2', count: reachedInt2 },
      { label: 'Conversion', count: `${transitionRate}%` },
    ];
  };

  return {
    coldFunnel: getPathData(cold),
    warmFunnel: getPathData(warm),
  };
}

function computeTrends(apps: JobApplication[]) {
  const trends: Array<{ date: string; applications: number; interviews: number }> = [];
  const weeks: Record<string, { applications: number; interviews: number }> = {};

  apps.forEach((app) => {
    (app.timeline || []).forEach((ev) => {
      if (!ev.date) return;
      const d = new Date(ev.date);
      if (isNaN(d.getTime())) return;
      const week = new Date(d);
      week.setDate(week.getDate() - week.getDay());
      const weekStr = week.toISOString().slice(0, 10);

      if (!weeks[weekStr]) weeks[weekStr] = { applications: 0, interviews: 0 };
      const stage = (ev.stage || '').toLowerCase();
      if (stage === 'application submitted') weeks[weekStr].applications++;
      if (stage.startsWith('interview')) weeks[weekStr].interviews++;
    });
  });

  Object.entries(weeks).forEach(([date, vals]) => trends.push({ date, ...vals }));
  return trends.sort((a, b) => a.date.localeCompare(b.date));
}

function AnalyticsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsData()
      .then((apps) => {
        setStats(computeStats(apps));
        setTrends(computeTrends(apps));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading analytics...</div>;
  if (!stats) return <div className="p-6">No analytics data available.</div>;

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Analytics</h2>

      {/* Weekly Trends Chart */}
      <div className="mb-10 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Weekly Activity</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={12} tickMargin={10} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend verticalAlign="top" height={36}/>
              <Bar name="Applications" dataKey="applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar name="Interviews" dataKey="interviews" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Pipeline Performance</h3>
        <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Lead Source</th>
                {stats.coldFunnel.map((d: any) => (
                  <th key={d.label} className="px-6 py-4 font-semibold text-gray-700">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-indigo-600">Cold Applications</td>
                {stats.coldFunnel.map((d: any, i: number) => (
                  <td key={i} className="px-6 py-4 text-gray-900 text-base">
                    {d.count}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-amber-600">Warm / Referrals</td>
                {stats.warmFunnel.map((d: any, i: number) => (
                  <td key={i} className="px-6 py-4 text-gray-900 text-base">
                    {d.count}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
