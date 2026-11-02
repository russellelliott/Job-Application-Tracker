import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import Autocomplete from '@mui/material/Autocomplete';
import { JobApplication } from '../types';
import {
  getDistinctCompanies,
  getCompanyContacts,
  searchAllContacts,
} from './db';

interface AddApplicationFormProps {
  onSubmit: (
    app: Partial<JobApplication>,
  ) => Promise<string | void> | string | void;
}

const SOURCE_OPTIONS = [
  'Cold Application',
  'Direct Connection',
  'In-Person Event',
  'Inbound Outreach',
];

export default function AddApplicationForm({
  onSubmit,
}: AddApplicationFormProps) {
  const initialForm: Partial<JobApplication> = {
    auxiliary_urls: [''],
    contacts: [
      {
        name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        connection_type: '',
      },
    ],
    timeline: [],
    raw_notes: [''],
    source: 'Cold Application',
  };

  const [form, setForm] = React.useState<Partial<JobApplication>>(initialForm);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyInput, setCompanyInput] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);
  const [submittedType, setSubmittedType] = React.useState<
    'draft' | 'submitted' | null
  >(null);
  const navigate = useNavigate();

  // Load all contacts (for autocomplete) once on mount
  const [allContacts, setAllContacts] = useState<
    Array<{
      name: string | null;
      email: string | null;
      phone: string | null;
      linkedin_url: string | null;
      connection_type: string | null;
      company: string;
    }>
  >([]);
  React.useEffect(() => {
    (async () => {
      const contacts = await searchAllContacts('');
      setAllContacts(contacts);
    })();
  }, []);

   // Load distinct companies on mount
  useEffect(() => {
     (async () => {
       const companies = await getDistinctCompanies();
       setCompanyOptions(companies);
      })();
   }, []);

  // Load contacts when a company is selected from autocomplete
  const handleCompanyChange = useCallback(async (value: string | null) => {
    setSelectedCompany(value);
    if (value) {
      const contacts = await getCompanyContacts(value);
      setForm((prev) => ({ ...(prev || {}), contacts }));
    } else {
      // Reset to single empty contact when no company selected
      setForm((prev) => ({
        ...(prev || {}),
        contacts: [
          {
            name: '',
            email: '',
            phone: '',
            linkedin_url: '',
            connection_type: '',
          },
        ],
      }));
    }
  }, []);

  const handleChange = (name: string, value: any) =>
    setForm((prev) => ({ ...(prev || {}), [name]: value }));

  const handleAuxUrlChange = (idx: number, value: string) => {
    setForm((prev) => ({
      ...(prev || {}),
      auxiliary_urls: [
        ...(prev?.auxiliary_urls || []).slice(0, idx),
        value,
        ...(prev?.auxiliary_urls || []).slice(idx + 1),
      ],
    }));
  };
  const addAuxUrl = () =>
    setForm((prev) => ({
      ...(prev || {}),
      auxiliary_urls: [...(prev?.auxiliary_urls || []), ''],
    }));
  const removeAuxUrl = (idx: number) =>
    setForm((prev) => {
      const arr = [...(prev?.auxiliary_urls || [])];
      arr.splice(idx, 1);
      return { ...(prev || {}), auxiliary_urls: arr };
    });

  const handleContactChange = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const contacts = [...(prev?.contacts || [])];
      contacts[idx] = { ...(contacts[idx] || {}), [field]: value } as any;
      return { ...(prev || {}), contacts };
    });
  };
  const addContact = () =>
    setForm((prev) => ({
      ...(prev || {}),
      contacts: [
        ...(prev?.contacts || []),
        {
          name: '',
          email: '',
          phone: '',
          linkedin_url: '',
          connection_type: '',
        },
      ],
    }));
  const removeContact = (idx: number) =>
    setForm((prev) => {
      const c = [...(prev?.contacts || [])];
      c.splice(idx, 1);
      return { ...(prev || {}), contacts: c };
    });

  const handleNoteChange = (idx: number, value: string) =>
    setForm((prev) => {
      const notes = [...(prev?.raw_notes || [])];
      notes[idx] = value;
      return { ...(prev || {}), raw_notes: notes };
    });
  const addNote = () =>
    setForm((prev) => ({
      ...(prev || {}),
      raw_notes: [...(prev?.raw_notes || []), ''],
    }));
  const removeNote = (idx: number) =>
    setForm((prev) => {
      const n = [...(prev?.raw_notes || [])];
      n.splice(idx, 1);
      return { ...(prev || {}), raw_notes: n };
    });

  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);

  const isValid = useMemo(() => {
    return !!(
      form.company_name &&
      form.company_name.toString().trim() &&
      form.role_title &&
      form.role_title.toString().trim() &&
      form.location &&
      form.location.toString().trim() &&
      form.job_url &&
      form.job_url.toString().trim() &&
      (form.source || '').toString().trim()
    );
  }, [form]);

  const hasAnyRequired = useMemo(() => {
    return !!(
      (form.company_name && String(form.company_name).trim()) ||
      (form.role_title && String(form.role_title).trim()) ||
      (form.location && String(form.location).trim()) ||
      (form.job_url && String(form.job_url).trim())
    );
  }, [form]);

  const submitWithStatus = async (finalStatus: 'draft' | 'submitted') => {
    if (finalStatus === 'submitted') setAttemptedSubmit(true);
    // create local YYYY-MM-DD at local-midnight and append T00:00:00
    const today = new Date();
    const nowDateOnly = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;
    let timeline = form.timeline || [];
    timeline = [
      ...timeline,
      {
        stage: finalStatus === 'submitted' ? 'Application Submitted' : 'Draft',
        date: nowDateOnly,
        notes: null,
      },
    ];

    if (finalStatus === 'submitted' && !isValid) {
      // don't submit if invalid
      return;
    }

    setSubmittedType(finalStatus);
    await onSubmit({ ...form, timeline });
    setSnackOpen(true);
    // Clear the form after successful save/submit
    setForm(initialForm);
    setSelectedCompany(null);
    setCompanyInput('');
    setAttemptedSubmit(false);
    setSubmittedType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Keep legacy form submit behaviour: default to draft
    await submitWithStatus('draft');
  };

  let toastMessage = 'Application saved';
  if (submittedType === 'submitted') {
    toastMessage = 'Application submitted';
  } else if (submittedType === 'draft') {
    toastMessage = 'Draft saved';
  }

  return (
    <div
      style={{
        padding: 24,
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Add Application
      </h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            paddingRight: 12,
            flex: 1,
            overflowY: 'auto',
            paddingBottom: 160,
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 720 }}>
            {/* Company Name with Autocomplete */}
            <Autocomplete
              freeSolo
              value={selectedCompany}
              inputValue={companyInput}
              onInputChange={(event, newInputValue, reason) => {
                setCompanyInput(newInputValue);
                if (reason !== 'reset') {
                  handleChange('company_name', newInputValue);
                  setSelectedCompany(null);
                }
              }}
              onChange={(event, newValue) => {
                const companyName = newValue || '';
                handleChange('company_name', companyName);
                setCompanyInput(companyName);
                handleCompanyChange(companyName || null);
                if (!newValue) {
                  setSelectedCompany(null);
                }
              }}
              options={companyOptions}
              isOptionEqualToValue={(option, value) => option === value}
              selectOnFocus
              clearOnBlur={false}
              handleHomeEndKeys
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Company Name"
                  required
                  error={
                    attemptedSubmit &&
                    !(form.company_name && form.company_name.toString().trim())
                  }
                  helperText={
                    attemptedSubmit &&
                    !(form.company_name && form.company_name.toString().trim())
                      ? 'Required'
                      : ''
                  }
                />
              )}
              renderOption={(props, option) => <li {...props}>{option}</li>}
            />

            <TextField
              required
              label="Role Title"
              value={form.role_title || ''}
              onChange={(e) => handleChange('role_title', e.target.value)}
              error={
                attemptedSubmit &&
                !(form.role_title && form.role_title.toString().trim())
              }
              helperText={
                attemptedSubmit &&
                !(form.role_title && form.role_title.toString().trim())
                  ? 'Required'
                  : ''
              }
            />
            <TextField
              required
              label="Location"
              value={form.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              error={
                attemptedSubmit &&
                !(form.location && form.location.toString().trim())
              }
              helperText={
                attemptedSubmit &&
                !(form.location && form.location.toString().trim())
                  ? 'Required'
                  : ''
              }
            />
            <TextField
              required
              label="Job URL"
              value={form.job_url || ''}
              onChange={(e) => handleChange('job_url', e.target.value)}
              error={
                attemptedSubmit &&
                !(form.job_url && form.job_url.toString().trim())
              }
              helperText={
                attemptedSubmit &&
                !(form.job_url && form.job_url.toString().trim())
                  ? 'Required'
                  : ''
              }
            />

            <FormControl fullWidth>
              <InputLabel id="source-label">Source</InputLabel>
              <Select
                labelId="source-label"
                label="Source"
                value={form.source || 'Cold Application'}
                onChange={(e) => handleChange('source', e.target.value)}
                required
              >
                {SOURCE_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>
                Auxiliary URLs
              </div>
              {(form.auxiliary_urls || []).map((u, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <TextField
                    fullWidth
                    value={u}
                    onChange={(e) => handleAuxUrlChange(idx, e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeAuxUrl(idx)}>
                    <RemoveIcon />
                  </IconButton>
                </div>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addAuxUrl}>
                Add URL
              </Button>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Contacts</div>
              {(form.contacts || []).map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Autocomplete
                    freeSolo
                    options={allContacts.filter(
                      (ct) =>
                        !c.name ||
                        ct.name?.toLowerCase().includes((c.name || '').toLowerCase()) ||
                        ct.email?.toLowerCase().includes((c.name || '').toLowerCase()) ||
                        ct.phone?.toLowerCase().includes((c.name || '').toLowerCase()) ||
                        ct.linkedin_url?.toLowerCase().includes((c.name || '').toLowerCase()) ||
                        ct.connection_type?.toLowerCase().includes((c.name || '').toLowerCase()),
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.company + (option.name || '') ===
                      (value as any).company + ((value as any).name || '')
                    }
                    value={c.name ? { ...c, company: '' } : null}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue !== 'string') {
                        setForm((prev) => {
                          const contacts = [...(prev?.contacts || [])];
                          contacts[idx] = {
                            name: newValue.name,
                            email: newValue.email,
                            phone: newValue.phone,
                            linkedin_url: newValue.linkedin_url,
                            connection_type: newValue.connection_type,
                          } as any;
                          return { ...(prev || {}), contacts };
                        });
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      const label = option.name || option.email || '';
                      return option.company ? `${label} (${option.company})` : label;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Name"
                        onChange={(e) =>
                          handleContactChange(idx, 'name', e.target.value)
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <div>
                          <div>{option.name || option.email || '(no name)'}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {option.company}
                            {[option.email, option.phone, option.linkedin_url]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      </li>
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    options={allContacts.filter(
                      (ct) =>
                        !c.email ||
                        ct.name?.toLowerCase().includes((c.email || '').toLowerCase()) ||
                        ct.email?.toLowerCase().includes((c.email || '').toLowerCase()) ||
                        ct.phone?.toLowerCase().includes((c.email || '').toLowerCase()) ||
                        ct.linkedin_url?.toLowerCase().includes((c.email || '').toLowerCase()) ||
                        ct.connection_type?.toLowerCase().includes((c.email || '').toLowerCase()),
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.company + (option.email || '') ===
                      (value as any).company + ((value as any).email || '')
                    }
                    value={c.email ? { ...c, company: '' } : null}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue !== 'string') {
                        setForm((prev) => {
                          const contacts = [...(prev?.contacts || [])];
                          contacts[idx] = {
                            name: newValue.name,
                            email: newValue.email,
                            phone: newValue.phone,
                            linkedin_url: newValue.linkedin_url,
                            connection_type: newValue.connection_type,
                          } as any;
                          return { ...(prev || {}), contacts };
                        });
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      const label = option.name || option.email || '';
                      return option.company ? `${label} (${option.company})` : label;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Email"
                        onChange={(e) =>
                          handleContactChange(idx, 'email', e.target.value)
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <div>
                          <div>{option.name || option.email || '(no name)'}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {option.company}
                            {[option.email, option.phone, option.linkedin_url]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      </li>
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    options={allContacts.filter(
                      (ct) =>
                        !c.phone ||
                        ct.name?.toLowerCase().includes((c.phone || '').toLowerCase()) ||
                        ct.email?.toLowerCase().includes((c.phone || '').toLowerCase()) ||
                        ct.phone?.toLowerCase().includes((c.phone || '').toLowerCase()) ||
                        ct.linkedin_url?.toLowerCase().includes((c.phone || '').toLowerCase()) ||
                        ct.connection_type?.toLowerCase().includes((c.phone || '').toLowerCase()),
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.company + (option.phone || '') ===
                      (value as any).company + ((value as any).phone || '')
                    }
                    value={c.phone ? { ...c, company: '' } : null}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue !== 'string') {
                        setForm((prev) => {
                          const contacts = [...(prev?.contacts || [])];
                          contacts[idx] = {
                            name: newValue.name,
                            email: newValue.email,
                            phone: newValue.phone,
                            linkedin_url: newValue.linkedin_url,
                            connection_type: newValue.connection_type,
                          } as any;
                          return { ...(prev || {}), contacts };
                        });
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      const label = option.phone || option.name || '';
                      return option.company ? `${label} (${option.company})` : label;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Phone"
                        onChange={(e) =>
                          handleContactChange(idx, 'phone', e.target.value)
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <div>
                          <div>{option.name || option.email || '(no name)'}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {option.company}
                            {[option.phone, option.linkedin_url]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      </li>
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    options={allContacts.filter(
                      (ct) =>
                        !c.linkedin_url ||
                        ct.name?.toLowerCase().includes((c.linkedin_url || '').toLowerCase()) ||
                        ct.email?.toLowerCase().includes((c.linkedin_url || '').toLowerCase()) ||
                        ct.phone?.toLowerCase().includes((c.linkedin_url || '').toLowerCase()) ||
                        ct.linkedin_url?.toLowerCase().includes((c.linkedin_url || '').toLowerCase()) ||
                        ct.connection_type?.toLowerCase().includes((c.linkedin_url || '').toLowerCase()),
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.company + (option.linkedin_url || '') ===
                      (value as any).company + ((value as any).linkedin_url || '')
                    }
                    value={c.linkedin_url ? { ...c, company: '' } : null}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue !== 'string') {
                        setForm((prev) => {
                          const contacts = [...(prev?.contacts || [])];
                          contacts[idx] = {
                            name: newValue.name,
                            email: newValue.email,
                            phone: newValue.phone,
                            linkedin_url: newValue.linkedin_url,
                            connection_type: newValue.connection_type,
                          } as any;
                          return { ...(prev || {}), contacts };
                        });
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      const label = option.linkedin_url || option.name || '';
                      return option.company ? `${label} (${option.company})` : label;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="LinkedIn"
                        onChange={(e) =>
                          handleContactChange(idx, 'linkedin_url', e.target.value)
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <div>
                          <div>{option.name || option.email || '(no name)'}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {option.company}
                            {[option.linkedin_url, option.email]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      </li>
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    options={allContacts.filter(
                      (ct) =>
                        !c.connection_type ||
                        ct.name?.toLowerCase().includes((c.connection_type || '').toLowerCase()) ||
                        ct.email?.toLowerCase().includes((c.connection_type || '').toLowerCase()) ||
                        ct.phone?.toLowerCase().includes((c.connection_type || '').toLowerCase()) ||
                        ct.linkedin_url?.toLowerCase().includes((c.connection_type || '').toLowerCase()) ||
                        ct.connection_type?.toLowerCase().includes((c.connection_type || '').toLowerCase()),
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.company + (option.connection_type || '') ===
                      (value as any).company + ((value as any).connection_type || '')
                    }
                    value={c.connection_type ? { ...c, company: '' } : null}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue !== 'string') {
                        setForm((prev) => {
                          const contacts = [...(prev?.contacts || [])];
                          contacts[idx] = {
                            name: newValue.name,
                            email: newValue.email,
                            phone: newValue.phone,
                            linkedin_url: newValue.linkedin_url,
                            connection_type: newValue.connection_type,
                          } as any;
                          return { ...(prev || {}), contacts };
                        });
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      const label = option.connection_type || option.name || '';
                      return option.company ? `${label} (${option.company})` : label;
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Connection Type"
                        onChange={(e) =>
                          handleContactChange(idx, 'connection_type', e.target.value)
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <div>
                          <div>{option.name || option.email || '(no name)'}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {option.company}
                            {[option.connection_type].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </li>
                    )}
                  />
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" onClick={() => removeContact(idx)}>
                      <RemoveIcon />
                    </IconButton>
                  </div>
                </div>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addContact}>
                Add Contact
              </Button>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Notes</div>
              {(form.raw_notes || []).map((n, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <TextField
                    fullWidth
                    value={n}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeNote(idx)}>
                    <RemoveIcon />
                  </IconButton>
                </div>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addNote}>
                Add Note
              </Button>
            </div>

            {/* Footer buttons now control draft/submitted state; radio options removed */}
          </Stack>
        </div>

        <div
          style={{
            position: 'fixed',
            left: 24,
            right: 24,
            bottom: 12,
            background: '#fff',
            paddingTop: 12,
            paddingBottom: 12,
            marginTop: 12,
            borderTop: '1px solid #e5e7eb',
            zIndex: 200,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Button variant="text" onClick={() => navigate(-1)}>
              Back
            </Button>
            {/* Show Save Draft only when at least one required field has content; purple styling */}
            {hasAnyRequired ? (
              <Button
                variant="contained"
                startIcon={<SaveAltIcon />}
                color="secondary"
                onClick={() => submitWithStatus('draft')}
              >
                Save Draft
              </Button>
            ) : null}
            {isValid ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => submitWithStatus('submitted')}
              >
                Submit Application
              </Button>
            ) : null}
            <Button
              variant="outlined"
              onClick={() => navigate('/applications')}
            >
              Exit
            </Button>
          </div>
        </div>

        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => setSnackOpen(false)}
        >
          <Alert
            onClose={() => setSnackOpen(false)}
            severity={submittedType === 'draft' ? 'info' : 'success'}
            variant="filled"
            sx={(theme) => ({
              width: '100%',
              ...(submittedType === 'draft'
                ? {
                    bgcolor: theme.palette.secondary.main,
                    color: theme.palette.secondary.contrastText,
                    '& .MuiAlert-icon': {
                      color: theme.palette.secondary.contrastText,
                    },
                    '& .MuiAlert-action': {
                      color: theme.palette.secondary.contrastText,
                    },
                  }
                : {}),
            })}
          >
            {toastMessage}
          </Alert>
        </Snackbar>
      </form>
     </div>
   );
}
