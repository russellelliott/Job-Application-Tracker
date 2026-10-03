import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { getAllContacts } from './db';

interface ContactRowData {
 name: string | null;
 email: string | null;
 phone: string | null;
 linkedin_url: string | null;
 connection_type: string | null;
 companies: string[];
 applications: Array<{
   id: string;
   company_name: string | null;
   role_title: string | null;
   date: string;
  }>;
}

function getContactDisplay(contact: ContactRowData): string {
   // Show name if available, otherwise fall back to email, LinkedIn, or phone
  if (contact.name) return contact.name;
  if (contact.email) return contact.email;
  if (contact.linkedin_url) return contact.linkedin_url;
  if (contact.phone) return contact.phone;
  return '(Unknown)';
}

function formatDate(dateStr: string): string {
  // Handle empty dates
  if (!dateStr) return '-';
  // If the date is already in ISO format, use it directly
  let dateToUse = dateStr;
  // Only append T00:00:00 if it's a date-only string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    dateToUse = `${dateStr}T00:00:00`;
  }
  try {
    const date = new Date(dateToUse);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  } catch {
    return '-';
  }
}

function filterContactsByCompany(
  contacts: ContactRowData[],
  searchQuery: string
): ContactRowData[] {
  if (!searchQuery.trim()) return contacts;
  const query = searchQuery.toLowerCase();
  return contacts.filter((contact) => {
     // Search by company name
    const matchesCompany = contact.companies.some((company) =>
      company.toLowerCase().includes(query)
    );
     // Search by contact name
    const matchesName = contact.name?.toLowerCase().includes(query) ?? false;
     // Search by email
    const matchesEmail = contact.email?.toLowerCase().includes(query) ?? false;
    return matchesCompany || matchesName || matchesEmail;
   });
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
     (async () => {
        const data = await getAllContacts();
        setContacts(data);
        setLoading(false);
       })();
   }, []);

    // Filter contacts based on search query
  const filteredContacts = useMemo(
    () => filterContactsByCompany(contacts, searchQuery),
    [contacts, searchQuery]
  );

   // Generate a stable key for each contact to use as expand toggle identity
  const contactKey = (c: ContactRowData) =>
    [c.name, c.email, c.phone, c.linkedin_url, c.connection_type].join('|');

  if (loading) {
    return <div style={{ padding: 24 }}>Loading contacts...</div>;
   }

  return (
    <div style={{ padding: 24, overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 16 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          Contacts
          </Typography>
          <Chip label={`${filteredContacts.length} / ${contacts.length}`} size="small" sx={{ marginLeft: 1 }} />
        </div>

        {/* Search bar for filtering contacts by company */}
<TextField
          placeholder="Search by company name or contact name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          sx={{ marginBottom: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
               </InputAdornment>
             ),
           }}
         />

        <TableContainer
        component={Paper}
        sx={{
         overflowY: 'auto',
         maxHeight: 'calc(100vh - 320px)',
         }}
        >
         <Table size="small">
           <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: '#f9fafb' }}>
            <TableRow>
             <TableCell sx={{ fontWeight: 600, fontSize: 13, width: 200 }}>Company</TableCell>
             <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>Name</TableCell>
             <TableCell sx={{ fontWeight: 600, fontSize: 13, width: 200 }}>Email</TableCell>
             <TableCell sx={{ fontWeight: 600, fontSize: 13, width: 140 }}>Phone</TableCell>
             <TableCell sx={{ fontWeight: 600, fontSize: 13, width: 120 }}>LinkedIn</TableCell>
             <TableCell sx={{ fontWeight: 600, fontSize: 13, width: 140 }}>Connection Type</TableCell>
                     <TableCell sx={{ fontWeight: 600, fontSize: 13, width: 40 }}></TableCell>
                      </TableRow>
                     </TableHead>
                     <TableBody>
                      {filteredContacts.map((contact) => {
             const key = contactKey(contact);
             const isOpen = openContactId === key;

             return (
                <React.Fragment key={key}>
                  <TableRow
                  hover
                  role="button"
                  onClick={() => setOpenContactId(isOpen ? null : key)}
                  sx={{ cursor: 'pointer', bgcolor: isOpen ? '#f0f7ff' : '#fff' }}
                  >
                   <TableCell>
                     {contact.companies.length > 0
                       ? contact.companies.join(', ')
                       : '(No company)'}
                    </TableCell>
                   <TableCell>{getContactDisplay(contact)}</TableCell>
                   <TableCell>
                     {contact.email ? (
                       <a
                       href={`mailto:${contact.email}`}
                       onClick={(e) => e.stopPropagation()}
                       >
                        {contact.email}
                       </a>
                       ) : (
                        '-'
                       )}
                    </TableCell>
                   <TableCell>{contact.phone || '-'}</TableCell>
                   <TableCell>
                     {contact.linkedin_url ? (
                       <a
                       href={contact.linkedin_url}
                       target="_blank"
                       rel="noopener noreferrer"
                       onClick={(e) => e.stopPropagation()}
                       >
                        Link
                        </a>
                       ) : (
                        '-'
                       )}
                    </TableCell>
                   <TableCell>{contact.connection_type || '-'}</TableCell>
                   <TableCell>
                     <Typography variant="caption" sx={{ transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>
                       ▶
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* Expanded row showing applications */}
                   <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, borderTop: 'none' }}>
                     <Collapse in={isOpen} timeout="auto">
                       <Box sx={{ padding: 2 }}>
                         <Typography variant="subtitle2" sx={{ marginBottom: 1, fontSize: 12, color: '#6b7280' }}>
                          Recent Applications
                          </Typography>
                         {contact.applications.length > 0 ? (
                            <Table size="small">
                             <TableBody>
                               {contact.applications.map((app) => (
                                 <TableRow
                                  key={app.id}
                                  hover
                                   onClick={() => {
                                     navigate(`/applications/${app.id}/view`);
                                     }}
                                  sx={{ cursor: 'pointer' }}
                                  >
                                   <TableCell sx={{ width: 200 }}>
                                      {app.company_name || '(No company)'}
                                     </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {app.role_title || '(No role)'}
                                       </Typography>
                                     </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b7280' }}>
                                       {formatDate(app.date)}
                                      </TableCell>
                                   </TableRow>
                                  ))}
                                 </TableBody>
                                </Table>
                               ) : (
                                 <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: 13 }}>
                                   No applications found
                                  </Typography>
                                )}
                         </Box>
                       </Collapse>
                     </TableCell>
                   </TableRow>
               </React.Fragment>
             );
            })}

{filteredContacts.length === 0 && contacts.length === 0 && (
             <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
               <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                No contacts found. Add applications with contact info to get started.
                </Typography>
               </TableCell>
             </TableRow>
             )}
{filteredContacts.length === 0 && contacts.length > 0 && (
              <TableRow>
               <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                 No companies match your search "{searchQuery}"
                </Typography>
               </TableCell>
             </TableRow>
             )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" sx={{ marginTop: 2, display: 'block', color: '#6b7280' }}>
        Tip: Click a row to expand and view the applications associated with that contact.
       </Typography>
     </div>
   );
 }
