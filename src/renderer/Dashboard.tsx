import React, { useEffect, useState } from 'react';
import { BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar } from 'recharts';
import { getDashboardStats, getStagnantApplications } from './db';


function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [stagnantCount, setStagnantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getStagnantApplications()])
      .then(([statsData, stagnantApps]) => {
        setStats(statsData);
        setStagnantCount(stagnantApps.length);
        setLoading(false);
        return null;
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded shadow p-4">
          <div className="text-lg font-semibold">Applications</div>
          <div className="text-2xl">{stats.totalApplications}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-lg font-semibold">Interviews</div>
          <div className="text-2xl">{stats.totalInterviews}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-lg font-semibold">Offers</div>
          <div className="text-2xl">{stats.totalOffers}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-lg font-semibold">Stagnant</div>
          <div className="text-2xl text-red-500">{stagnantCount}</div>
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Recent Trends</h3>
        <BarChart width={700} height={250} data={stats.trends}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="applications" fill="#6366f1" />
          <Bar dataKey="interviews" fill="#fbbf24" />
        </BarChart>
      </div>
    </div>
  );
}

export default Dashboard;

export default Dashboard;
