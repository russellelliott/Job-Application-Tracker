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
      count: appsList.filter((app) => app.timeline?.some((ev) => ev.stage === stage)).length,
    }));
  }
  // Interview transition rate
  const interview1 =
    cold.filter((app) => app.timeline?.some((ev) => ev.stage === 'Interview 1')).length +
    warm.filter((app) => app.timeline?.some((ev) => ev.stage === 'Interview 1')).length;
  const sent =
    cold.filter((app) => app.timeline?.some((ev) => ev.stage === 'Application Submitted')).length +
    warm.filter((app) => app.timeline?.some((ev) => ev.stage === 'Application Submitted')).length;
  const assessment =
    cold.filter((app) => app.timeline?.some((ev) => ev.stage === 'Assessment')).length +
    warm.filter((app) => app.timeline?.some((ev) => ev.stage === 'Assessment')).length;
  const interviewTransition = interview1 / ((interview1 + sent + assessment) || 1);
  // Next step rates
  const nextStepRates = [];
  for (let i = 1; i < stages.length - 1; i++) {
    const prev = apps.filter((app) => app.timeline?.some((ev) => ev.stage === stages[i])).length;
    const next = apps.filter((app) => app.timeline?.some((ev) => ev.stage === stages[i + 1])).length;
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


function AnalyticsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsData()
      .then((apps) => {
        setStats(computeStats(apps));
        setLoading(false);
        return null;
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading analytics...</div>;
  if (!stats) return <div>No analytics data available.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-blue-700">
            Cold Leads Funnel
          </h3>
          <BarChart width={350} height={250} data={stats.cold.funnelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill={coldColors[0]} />
          </BarChart>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2 text-yellow-700">
            Warm Leads Funnel
          </h3>
          <BarChart width={350} height={250} data={stats.warm.funnelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill={warmColors[0]} />
          </BarChart>
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
