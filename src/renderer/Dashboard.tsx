import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllApplications } from './db';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';


function Dashboard() {
  const [counts, setCounts] = useState({
    submitted: 0,
    drafts: 0,
    submittedToday: 0,
    interviewsUpcoming: 0,
    interviewsTotal: 0,
    offersTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getAllApplications()
      .then((apps) => {
        if (!mounted) return;

        let appSubmittedCount = 0;
        let appDraftCount = 0;
        let submittedToday = 0;
        let interviewsUpcoming = 0;
        let interviewsTotal = 0;
        let offersTotal = 0;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        apps.forEach((app) => {
          // Check submission status
          const hasSubmitted = (app.timeline || []).some((ev: any) => ev.stage === 'Application Submitted');
          if (hasSubmitted) {
            appSubmittedCount++;
          } else {
            appDraftCount++;
          }

          // Timeline events analysis
          (app.timeline || []).forEach((ev: any) => {
            const stage = (ev.stage || '');

            // Submitted Today
            if (stage === 'Application Submitted' && ev.date) {
               let dateTs = 0;
               if (/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
                  dateTs = new Date(ev.date + 'T00:00:00').getTime();
               } else {
                  dateTs = new Date(ev.date).getTime();
               }

               const d = new Date(dateTs);
               if (d.getFullYear() === now.getFullYear() &&
                   d.getMonth() === now.getMonth() &&
                   d.getDate() === now.getDate()) {
                 submittedToday++;
               }
            }

            // Interviews
            if (typeof stage === 'string' && stage.startsWith('Interview')) {
              interviewsTotal++;
              const dueStr = ev.due_date || ev.date;
              if (dueStr) {
                const d = new Date(dueStr);
                const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                if (t >= todayStart) {
                  interviewsUpcoming++;
                }
              }
            }

            // Offers
            if (stage === 'Offer') {
              offersTotal++;
            }
          });
        });

        setCounts({
          submitted: appSubmittedCount,
          drafts: appDraftCount,
          submittedToday,
          interviewsUpcoming,
          interviewsTotal,
          offersTotal,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h2>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        {/* Applications Box */}
        <div style={{
          flex: 1,
          padding: 24,
          backgroundColor: '#cfe8fc', // Bolder blue
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #90caf9'
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1e3a8a', marginBottom: 8 }}>Applications</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#1e40af' }}>{counts.submitted}</span>
            <span style={{ fontSize: 18, color: '#64748b', fontWeight: 500 }}>
              (+{counts.drafts} drafts)
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500, color: '#15803d' }}>
            ({counts.submittedToday} applications submitted today)
          </div>
        </div>

        {/* Interviews Box */}
        <div style={{
          flex: 1,
          padding: 24,
          backgroundColor: '#fef3c7', // Bolder yellow
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #fcd34d'
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#713f12', marginBottom: 8 }}>Upcoming Interviews</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#854d0e' }}>{counts.interviewsUpcoming}</span>
             <span style={{ fontSize: 18, color: '#854d0e', opacity: 0.7, fontWeight: 500 }}>
              ({counts.interviewsTotal} total)
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#854d0e', opacity: 0.8 }}>
            Based on scheduled dates
          </div>
        </div>
      </div>

      {/* Offers Box - Green (Conditional) */}
      {counts.offersTotal > 0 && (
        <div style={{
          padding: 24,
          backgroundColor: '#dcfce7',
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #86efac',
          marginBottom: 32,
          maxWidth: '50%'
        }}>
           <div style={{ fontSize: 18, fontWeight: 600, color: '#14532d', marginBottom: 8 }}>Offers</div>
           <div style={{ fontSize: 36, fontWeight: 700, color: '#166534' }}>{counts.offersTotal}</div>
        </div>
      )}

      {/* Spacer to push button to bottom */}
      <div style={{ flex: 1 }}></div>

      {/* Big Add Button */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', paddingBottom: 24 }}>
         <Button
           variant="contained"
           size="large"
           startIcon={<AddIcon />}
           onClick={() => navigate('/applications/add')}
           sx={{ py: 2, px: 6, fontSize: '1.2rem', textTransform: 'none', borderRadius: 2 }}
         >
           Add New Application
         </Button>
      </div>
    </div>
  );
}

export default Dashboard;
