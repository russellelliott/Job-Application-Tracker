import React, { useEffect, useState } from 'react';
import {
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Bar,
  Cell,
  ResponsiveContainer,
  Sankey,
  Layer,
  Rectangle,
} from 'recharts';
import { getAnalyticsData } from './db';
import { JobApplication } from '../types';

// --- CONSTANTS FOR SANKEY STYLING ---
const COLOR_APPLICATIONS = '#6366f1';
const COLOR_ASSESSMENTS = '#818cf8';
const COLOR_INTERVIEW_1 = '#fbbf24';
const COLOR_INTERVIEW_2 = '#f59e0b';
const COLOR_INTERVIEW_3 = '#d97706';
const COLOR_REJECTED = '#ef4444';

const TINT_INDIGO = '#c7d2fe';
const TINT_YELLOW = '#fde68a';
const TINT_RED = '#fca5a5';

const ASSESSMENTS_Y_OFFSET = 70;
const NODE_Y_OFFSETS: Record<number, number> = {
  1: ASSESSMENTS_Y_OFFSET,
};

// --- DATA PROCESSING HELPERS ---

const isSubmitted = (app: JobApplication) => {
  return (app.timeline || []).some(
    (ev) => ev.stage === 'Application Submitted'
  );
};

function computeSankeyData(apps: JobApplication[]) {
  const activeApps = apps.filter(isSubmitted);

  const getStages = (app: JobApplication) =>
    (app.timeline || []).map((ev) => (ev.stage || '').toLowerCase().trim());

  // 1. App -> Assessment
  const appsWithAssessment = activeApps.filter((app) =>
    getStages(app).includes('assessment'),
  );
  const valAppToAssessment = appsWithAssessment.length;

  // 2. App -> Interview 1 (Direct, skipping assessment)
  const appsDirectToInt1 = activeApps.filter((app) => {
    const s = getStages(app);
    return s.includes('interview 1') && !s.includes('assessment');
  });
  const valAppToInterview1 = appsDirectToInt1.length;

  // 3. Assessment -> Interview 1
  const valAssessmentToInterview1 = appsWithAssessment.filter((app) =>
    getStages(app).includes('interview 1'),
  ).length;

  // 4. Interview 1 -> Interview 2
  const appsWithInt1 = activeApps.filter((app) =>
    getStages(app).includes('interview 1'),
  );
  const appsWithInt2 = activeApps.filter((app) =>
    getStages(app).includes('interview 2'),
  );
  const valInt1ToInt2 = appsWithInt2.length;

  // 5. Interview 2 -> Interview 3
  const appsWithInt3 = activeApps.filter((app) =>
    getStages(app).includes('interview 3'),
  );
  const valInt2ToInt3 = appsWithInt3.length;

  // --- REJECTION CALCULATIONS (Sinks) ---
  // To keep the Sankey balanced: Output must equal Input for each node.
  const valAppToRejected =
    activeApps.length - valAppToAssessment - valAppToInterview1;
  const valAssessmentToRejected =
    valAppToAssessment - valAssessmentToInterview1;
  const valInt1ToRejected = appsWithInt1.length - valInt1ToInt2;
  const valInt2ToRejected = appsWithInt2.length - valInt2ToInt3;
  const valInt3ToRejected = appsWithInt3.length;

  return {
    nodes: [
      { name: 'Applications', color: COLOR_APPLICATIONS }, // 0
      { name: 'Assessments', color: COLOR_ASSESSMENTS }, // 1
      { name: 'Interview 1', color: COLOR_INTERVIEW_1 }, // 2
      { name: 'Interview 2', color: COLOR_INTERVIEW_2 }, // 3
      { name: 'Interview 3', color: COLOR_INTERVIEW_3 }, // 4
      { name: 'Rejected / No Response', color: COLOR_REJECTED }, // 5
    ],
    links: [
      // Forward Progress
      { source: 0, target: 2, value: valAppToInterview1, color: TINT_YELLOW },
      { source: 0, target: 1, value: valAppToAssessment, color: TINT_INDIGO },
      {
        source: 1,
        target: 2,
        value: valAssessmentToInterview1,
        color: TINT_YELLOW,
      },
      { source: 2, target: 3, value: valInt1ToInt2, color: TINT_YELLOW },
      { source: 3, target: 4, value: valInt2ToInt3, color: TINT_YELLOW },

      // Rejections (Ordered to flow to the bottom)
      { source: 4, target: 5, value: valInt3ToRejected, color: TINT_RED },
      { source: 3, target: 5, value: valInt2ToRejected, color: TINT_RED },
      { source: 2, target: 5, value: valInt1ToRejected, color: TINT_RED },
      { source: 1, target: 5, value: valAssessmentToRejected, color: TINT_RED },
      { source: 0, target: 5, value: valAppToRejected, color: TINT_RED },
    ].filter((link) => link.value > 0), // Hide empty links
  };
}

function computeStats(apps: JobApplication[]) {
  // 1. MUST exclude drafts
  const activeApps = apps.filter(isSubmitted);

  const cold = activeApps.filter((app) => app.source === 'Cold Application');
  const warm = activeApps.filter((app) => app.source !== 'Cold Application');

  const getPathData = (appsList: JobApplication[]) => {
    const getStages = (app: JobApplication) =>
      (app.timeline || []).map((ev) => (ev.stage || '').toLowerCase().trim());

    // --- INTERVIEW 1 BREAKDOWN ---

    // Filter apps that reached Interview 1
    const appsWithInt1 = appsList.filter((app) =>
      getStages(app).includes('interview 1'),
    );

    // Path A: App -> Assessment -> Interview 1
    const pathAssess = appsWithInt1.filter((app) => {
      const s = getStages(app);
      return s.includes('application submitted') && s.includes('assessment');
    }).length;

    // Path B: App -> Interview 1 (Directly, skipping assessment)
    const pathDirect = appsWithInt1.filter((app) => {
      const s = getStages(app);
      return s.includes('application submitted') && !s.includes('assessment');
    }).length;

    // Path C: The "Missing" Data Catch-all
    // (Reached Int 1, but no 'Application Submitted' event was ever logged)
    const pathOther = appsWithInt1.filter((app) => {
      const s = getStages(app);
      return !s.includes('application submitted');
    }).length;

    // --- INTERVIEW 2 & BEYOND ---

    const reachedInt2 = appsList.filter((app) =>
      getStages(app).includes('interview 2'),
    ).length;
    const reachedInt3 = appsList.filter((app) =>
      getStages(app).includes('interview 3'),
    ).length;

    const int1ToInt2Rate =
      appsWithInt1.length > 0
        ? Math.round((reachedInt2 / appsWithInt1.length) * 100)
        : 0;
    const int2ToInt3Rate =
      reachedInt2 > 0
        ? Math.round((reachedInt3 / reachedInt2) * 100)
        : 0;

    return [
      { label: 'Total Apps', count: appsList.length },
      { label: 'App → Assess → Int 1', count: pathAssess },
      { label: 'App → Int 1 (Direct)', count: pathDirect },
      // { label: 'Int 1 (No App Event)', count: pathOther },
      { label: 'TOTAL Int 1', count: appsWithInt1.length }, // Sum of the 3 above
      { label: 'Int 2', count: reachedInt2 },
      { label: 'Int 1 → 2 (%)', count: `${int1ToInt2Rate}%` },
      { label: 'Int 3', count: reachedInt3 },
      { label: 'Int 2 → 3 (%)', count: `${int2ToInt3Rate}%` },
    ];
  };

  return {
    coldFunnel: getPathData(cold),
    warmFunnel: getPathData(warm),
  };
}

function computeTrends(apps: JobApplication[]) {
  const weeks: Record<string, { applications: number; assessments: number; interviews: number }> =
    {};

  // Filter for active apps (no drafts) to match other metrics
  apps
    .filter(isSubmitted)
    .forEach((app) => {
      (app.timeline || []).forEach((ev) => {
        if (!ev.date) return;
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return;

        const week = new Date(d);
        week.setDate(week.getDate() - week.getDay());
        const weekStr = week.toISOString().slice(0, 10);

        if (!weeks[weekStr])
          weeks[weekStr] = { applications: 0, assessments: 0, interviews: 0 };
        const stage = (ev.stage || '').toLowerCase().trim();
        if (stage === 'application submitted') weeks[weekStr].applications++;
        if (stage === 'assessment') weeks[weekStr].assessments++;
        if (stage.startsWith('interview')) weeks[weekStr].interviews++;
      });
    });

  return Object.entries(weeks)
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}


// --- SANKEY SUB-COMPONENTS ---
function CustomNode({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth,
}: any) {
  const yOffset = NODE_Y_OFFSETS[index] ?? 0;
  const adjustedY = y + yOffset;
  const isOut = x + width + 80 > (containerWidth || 1000);
  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={adjustedY}
        width={width}
        height={height}
        fill={payload.color}
        rx={2}
      />
      <text
        x={isOut ? x - 10 : x + width + 10}
        y={adjustedY + height / 2 - 2}
        textAnchor={isOut ? 'end' : 'start'}
        fontSize="12"
        fontWeight="bold"
        fill="#333"
      >
        {payload.value}
      </text>
      <text
        x={isOut ? x - 10 : x + width + 10}
        y={adjustedY + height / 2 + 12}
        textAnchor={isOut ? 'end' : 'start'}
        fontSize="10"
        fill="#666"
      >
        {payload.name}
      </text>
    </Layer>
  );
}

function CustomFilledLink(props: any) {
  const { sourceX, targetX, linkWidth, payload } = props;
  let { sourceY, targetY } = props;

  const nodeNameOffsets: Record<string, number> = {
    Assessments: ASSESSMENTS_Y_OFFSET,
  };
  sourceY += nodeNameOffsets[payload.source?.name] ?? 0;
  targetY += nodeNameOffsets[payload.target?.name] ?? 0;

  if (linkWidth <= 0) return null;
  const midX = (sourceX + targetX) / 2;
  const d = `M${sourceX},${sourceY - linkWidth / 2} C${midX},${sourceY - linkWidth / 2} ${midX},${targetY - linkWidth / 2} ${targetX},${targetY - linkWidth / 2} L${targetX},${targetY + linkWidth / 2} C${midX},${targetY + linkWidth / 2} ${midX},${sourceY + linkWidth / 2} ${sourceX},${sourceY + linkWidth / 2} Z`;

  return (
    <path
      d={d}
      fill={payload.color || '#E5E7EB'}
      fillOpacity={0.4}
      stroke="none"
    />
  );
}

function computeApplicationMetrics(apps: JobApplication[]) {
  // Compute count metrics for applications, assessments, and interviews
  const activeApps = apps.filter(isSubmitted);

  const getStages = (app: JobApplication) =>
    (app.timeline || []).map((ev) => (ev.stage || '').toLowerCase().trim());

  const totalApplications = activeApps.length;
  const totalAssessments = activeApps.filter((app) =>
    getStages(app).includes('assessment'),
  ).length;
  const totalInterviews = activeApps.filter((app) => {
    const s = getStages(app);
    return (
      s.includes('interview 1') ||
      s.includes('interview 2') ||
      s.includes('interview 3')
    );
  }).length;

  return [
    {
      label: 'Applications',
      value: totalApplications,
      fill: '#6366f1',
    },
    {
      label: 'Assessments',
      value: totalAssessments,
      fill: '#818cf8',
    },
    {
      label: 'Interviews',
      value: totalInterviews,
      fill: '#fbbf24',
    },
  ];
}

// --- MAIN COMPONENT ---
function AnalyticsDashboard() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sankey'>('overview');
  const [sankeyFilter, setSankeyFilter] = useState<'all' | 'cold' | 'warm'>(
    'all',
  );
  const [sankeyData, setSankeyData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsData()
      .then((data) => {
        setApps(data);
        setSankeyData(computeSankeyData(data));
        setStats(computeStats(data));
        setTrends(computeTrends(data));
        setMetricsData(computeApplicationMetrics(data));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;

    let filteredApps = apps;
    if (sankeyFilter === 'cold') {
      filteredApps = apps.filter((a) => a.source === 'Cold Application');
    } else if (sankeyFilter === 'warm') {
      filteredApps = apps.filter((a) => a.source !== 'Cold Application');
    }

    setSankeyData(computeSankeyData(filteredApps));
  }, [sankeyFilter, apps, loading]);

  if (loading)
    return <div className="p-6 text-gray-500">Loading analytics...</div>;

  return (
    <div className="p-6 w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Analytics Dashboard
      </h2>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('sankey')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'sankey'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pipeline Flow
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Application Metrics Bar Chart */}
          <div className="mb-10 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 text-gray-800">
              Activity Summary
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metricsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis type="number" fontSize={12} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    fontSize={12}
                    width={140}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                  >
                    {metricsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Trends Bar Chart - Stacked */}
          <div className="mb-10 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 text-gray-800">
              Weekly Activity Trends
            </h3>
            <div style={{ width: '100%', height: '400px' }}>
              {trends.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No activity data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="applications" stackId="stack" fill="#6366f1" name="Applications" />
                    <Bar dataKey="assessments" stackId="stack" fill="#818cf8" name="Assessments" />
                    <Bar dataKey="interviews" stackId="stack" fill="#fbbf24" name="Interviews" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pipeline Performance Table with Borders */}
          {stats && (
            <div>
              <h3 className="text-lg font-semibold mb-6 text-gray-800">
                Pipeline Performance
              </h3>
              <div className="overflow-hidden rounded-lg shadow-sm bg-white border border-gray-300">
                <table className="w-full text-left text-sm data-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-gray-700">
                        Lead Source
                      </th>
                      {stats.coldFunnel.map((d: any) => (
                        <th
                          key={d.label}
                          className="px-6 py-4 font-semibold text-gray-700"
                        >
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        Cold Applications
                      </td>
                      {stats.coldFunnel.map((d: any, i: number) => (
                        <td key={i} className="px-6 py-4 text-gray-900 text-base">
                          {d.count}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-amber-600">
                        Warm / Referrals
                      </td>
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
          )}
        </>
      )}

      {/* Sankey Tab */}
      {activeTab === 'sankey' && (
        <div className="mb-10 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-row justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Application Pipeline Flow
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Visualization of how applications progress through stages
              </p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {(
                [
                  { key: 'all', label: 'All', activeColor: '#16a34a' },
                  { key: 'cold', label: 'Cold', activeColor: '#2563eb' },
                  { key: 'warm', label: 'Warm', activeColor: '#eab308' },
                ] as const
              ).map(({ key, label, activeColor }) => {
                const isActive = sankeyFilter === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSankeyFilter(key)}
                    className="px-3 py-1 text-sm rounded-md transition-all font-medium"
                    style={
                      isActive
                        ? {
                            backgroundColor: activeColor,
                            color: '#fff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                          }
                        : { color: '#4b5563' }
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ width: '100%', height: '500px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankeyData}
                node={<CustomNode />}
                link={<CustomFilledLink />}
                nodePadding={100}
                margin={{ top: 10, left: 10, right: 120, bottom: 10 }}
                iterations={0}
              >
                <Tooltip />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
