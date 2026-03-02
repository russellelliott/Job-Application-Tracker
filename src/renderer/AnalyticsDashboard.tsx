import React, { useEffect, useState } from 'react';
import { BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar } from 'recharts';
import { getAnalyticsData } from './db';
import { JobApplication } from '../types';

const coldColors = ['#6366f1', '#818cf8', '#a5b4fc']; // blue/purple
const warmColors = ['#fbbf24', '#f59e42', '#fcd34d']; // orange/yellow

function computeStats(apps: JobApplication[]) {
  // Group by lead type
  const cold = apps.filter((app) => app.source === 'Cold Application');
  const warm = apps.filter((app) => app.source !== 'Cold Application');
  // Funnel stages
  const stages = [
    'Application Submitted',
    'Assessment',
    'Interview 1',
    'Interview 2',
    'Interview 3',
    'Offer',
  ];
  function funnel(appsList: JobApplication[]) {
    return stages.map((stage) => ({
      stage,
      count: appsList.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === stage.toLowerCase())).length,
    }));
  }
  // Interview transition rate
  const interview1 =
    cold.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === 'interview 1')).length +
    warm.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === 'interview 1')).length;
  const sent =
    cold.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === 'application submitted')).length +
    warm.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === 'application submitted')).length;
  const assessment =
    cold.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === 'assessment')).length +
    warm.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === 'assessment')).length;
  const interviewTransition = interview1 / ((interview1 + sent + assessment) || 1);
  // Next step rates
  const nextStepRates = [];
  for (let i = 1; i < stages.length - 1; i++) {
    const prev = apps.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === stages[i].toLowerCase())).length;
    const next = apps.filter((app) => (app.timeline || []).some((ev) => (ev.stage || '').toLowerCase() === stages[i + 1].toLowerCase())).length;
    nextStepRates.push({
      label: `${stages[i]} → ${stages[i + 1]}`,
      rate: prev ? next / prev : 0,
    });
  }
  return {
    interviewTransition,
    nextStepRates,
    cold: { funnelData: funnel(cold) },
    warm: { funnelData: funnel(warm) },
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
      // get start of week (Sunday)
      const week = new Date(d);
      week.setDate(week.getDate() - week.getDay());
      const weekStr = week.toISOString().slice(0, 10);

      if (!weeks[weekStr]) weeks[weekStr] = { applications: 0, interviews: 0 };
      if ((ev.stage || '').toLowerCase() === 'application submitted') weeks[weekStr].applications++;
      if (typeof ev.stage === 'string' && ev.stage.toLowerCase().startsWith('interview')) weeks[weekStr].interviews++;
    });
  });
  Object.entries(weeks).forEach(([date, vals]) => trends.push({ date, ...vals }));
  trends.sort((a, b) => a.date.localeCompare(b.date));
  return trends;
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
        return null;
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading analytics...</div>;
  if (!stats) return <div>No analytics data available.</div>;

  return (
    <div className="p-6" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      <h2 className="text-2xl font-bold mb-4">Analytics</h2>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Recent Trends (Weekly)</h3>
        <BarChart width={700} height={250} data={trends}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="applications" fill="#6366f1" name="Applications" />
          <Bar dataKey="interviews" fill="#fbbf24" name="Interviews" />
        </BarChart>
      </div>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Funnel Breakdown</h3>
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-700">Lead Type</th>
                {stats.cold.funnelData.map((d: any) => (
                  <th key={d.stage} className="px-6 py-3 font-semibold text-gray-700 whitespace-nowrap">
                    {d.stage}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-indigo-600">Cold Leads</td>
                {stats.cold.funnelData.map((d: any) => (
                  <td key={d.stage} className="px-6 py-4 text-gray-900">
                    {d.count}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-amber-600">Warm Leads</td>
                {stats.warm.funnelData.map((d: any) => (
                  <td key={d.stage} className="px-6 py-4 text-gray-900">
                    {d.count}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Next-Step Rates</h3>
        <BarChart width={700} height={250} data={stats.nextStepRates}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="rate" fill="#6366f1" />
        </BarChart>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
