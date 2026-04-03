import React, { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useNavigate } from 'react-router-dom';
import { addApplication } from './db';
import { Contact, JobApplicationInput } from '../types';

const SOURCE_OPTIONS = [
  'Cold Application',
  'Direct Connection',
  'In-Person Event',
  'Inbound Outreach',
];

type ReviewItem = {
  id: string;
  application: JobApplicationInput;
  status: 'under_review' | 'completed' | 'skipped';
};

type ScreenMode = 'input' | 'review';

const createUuid = () => {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }

  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const todayLocalMidnight = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00`;
};

const defaultContact = (): Contact => ({
  name: null,
  email: null,
  phone: null,
  linkedin_url: null,
  connection_type: null,
});

const normalizeImportedRecord = (
  app: JobApplicationInput,
): JobApplicationInput => {
  return {
    company_name: app.company_name || null,
    role_title: app.role_title || null,
    location: app.location || null,
    source: app.source || null,
    job_url: app.job_url || null,
    auxiliary_urls: Array.isArray(app.auxiliary_urls)
      ? app.auxiliary_urls.filter(Boolean)
      : [],
    contacts:
      Array.isArray(app.contacts) && app.contacts.length > 0
        ? app.contacts.map((c) => ({
            name: c?.name || null,
            email: c?.email || null,
            phone: c?.phone || null,
            linkedin_url: c?.linkedin_url || null,
            connection_type: c?.connection_type || null,
          }))
        : [defaultContact()],
    timeline: Array.isArray(app.timeline) ? app.timeline : [],
    raw_notes: Array.isArray(app.raw_notes)
      ? app.raw_notes.filter(Boolean)
      : [],
  };
};

const getStatusLabel = (status: ReviewItem['status']) => {
  if (status === 'completed') return 'Completed';
  if (status === 'skipped') return 'Skipped';
  return 'Under Review';
};

const getStatusChipColor = (status: ReviewItem['status']) => {
  if (status === 'completed') return 'success';
  if (status === 'skipped') return 'error';
  return 'warning';
};

const getStatusDotColor = (status: ReviewItem['status']) => {
  if (status === 'completed') return '#16a34a';
  if (status === 'skipped') return '#dc2626';
  return '#f59e0b';
};

const getRequiredFieldsErrors = (app: JobApplicationInput): string[] => {
  const errors: string[] = [];
  if (!app.company_name || !app.company_name.trim()) {
    errors.push('Company name');
  }
  if (!app.role_title || !app.role_title.trim()) {
    errors.push('Role title');
  }
  if (!app.location || !app.location.trim()) {
    errors.push('Location');
  }
  if (!app.job_url || !app.job_url.trim()) {
    errors.push('Job URL');
  }
  if (!app.source || !app.source.trim()) {
    errors.push('Source');
  }
  return errors;
};

export default function BulkNetworkingImport() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ScreenMode>('input');
  const [rawText, setRawText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = reviewItems[currentIndex] || null;
  const allReviewed = useMemo(
    () =>
      reviewItems.length > 0 &&
      reviewItems.every((item) => item.status !== 'under_review'),
    [reviewItems],
  );
  const completedCount = useMemo(
    () => reviewItems.filter((item) => item.status === 'completed').length,
    [reviewItems],
  );
  const skippedCount = useMemo(
    () => reviewItems.filter((item) => item.status === 'skipped').length,
    [reviewItems],
  );

  const parseNotes = async () => {
    setParseError(null);
    setSubmitError(null);

    const input = rawText.trim();
    if (!input) {
      setParseError('Paste networking notes before parsing.');
      return;
    }

    try {
      setIsParsing(true);
      const parsed = await window.electron.parseNetworkingNotes(input);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setParseError(
          'No applications were detected. Try adding more detail in your notes.',
        );
        setReviewItems([]);
        setCurrentIndex(0);
        return;
      }

      setReviewItems(
        parsed.map((app) => ({
          id: createUuid(),
          application: normalizeImportedRecord(app),
          status: 'under_review',
        })),
      );
      setCurrentIndex(0);
      setMode('review');
    } catch (error: unknown) {
      setParseError(
        error instanceof Error
          ? error.message
          : 'Unable to parse notes with Gemini.',
      );
      setReviewItems([]);
      setCurrentIndex(0);
    } finally {
      setIsParsing(false);
    }
  };

  const updateCurrent = (
    updater: (application: JobApplicationInput) => JobApplicationInput,
  ) => {
    setReviewItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== currentIndex) return item;
        return {
          ...item,
          application: updater(item.application),
          status: item.status === 'completed' ? 'under_review' : item.status,
        };
      }),
    );
  };

  const setAppField = <K extends keyof JobApplicationInput>(
    field: K,
    value: JobApplicationInput[K],
  ) => {
    updateCurrent((app) => ({ ...app, [field]: value }));
  };

  const setCurrentStatus = (
    status: 'under_review' | 'completed' | 'skipped',
  ) => {
    // Prevent marking as completed if required fields are missing
    if (status === 'completed' && currentItem) {
      const errors = getRequiredFieldsErrors(currentItem.application);
      if (errors.length > 0) {
        return;
      }
    }
    setReviewItems((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, status } : item,
      ),
    );
  };

  const goPrev = () => {
    if (reviewItems.length === 0) return;
    setCurrentIndex((idx) =>
      idx === 0 ? reviewItems.length - 1 : Math.max(0, idx - 1),
    );
  };

  const goNext = () => {
    if (reviewItems.length === 0) return;
    setCurrentIndex((idx) => (idx + 1) % reviewItems.length);
  };

  const setContactField = (
    contactIndex: number,
    field: keyof Contact,
    value: string,
  ) => {
    updateCurrent((app) => {
      const contacts = [...(app.contacts || [])];
      const existing = contacts[contactIndex] || defaultContact();
      contacts[contactIndex] = {
        ...existing,
        [field]: value.trim() ? value : null,
      };
      return { ...app, contacts };
    });
  };

  const addContact = () => {
    updateCurrent((app) => ({
      ...app,
      contacts: [...(app.contacts || []), defaultContact()],
    }));
  };

  const removeContact = (contactIndex: number) => {
    updateCurrent((app) => {
      const contacts = [...(app.contacts || [])];
      contacts.splice(contactIndex, 1);
      return {
        ...app,
        contacts: contacts.length ? contacts : [defaultContact()],
      };
    });
  };

  const confirmAndSave = async () => {
    if (!allReviewed || isSaving) return;

    setSubmitError(null);
    try {
      setIsSaving(true);
      const itemsToPersist = reviewItems.filter(
        (item) => item.status === 'completed',
      );
      await Promise.all(
        itemsToPersist.map(async (item) => {
          const hasTimeline =
            item.application.timeline && item.application.timeline.length > 0;
          const defaultTimeline: JobApplicationInput['timeline'] = [
            {
              stage: 'Draft',
              date: todayLocalMidnight(),
              notes: null,
            },
          ];
          const timeline = hasTimeline
            ? item.application.timeline
            : defaultTimeline;

          await addApplication({
            ...item.application,
            id: createUuid(),
            timeline,
          });
        }),
      );

      setConfirmOpen(false);
      navigate('/applications');
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to save imported applications.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100%', boxSizing: 'border-box' }}>
      {mode === 'input' && (
        <Box
          sx={{
            border: '1px solid #cbd5e1',
            borderRadius: 2,
            bgcolor: '#fff',
            height: 'calc(100vh - 150px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
              px: 2,
              py: 1.5,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              AI-Powered Bulk Networking Import
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
              Paste unstructured notes, parse with Gemini, then review each
              generated application in a verification carousel.
            </Typography>
          </Box>

          <Box sx={{ px: 2, py: 2, overflowY: 'auto', flex: 1 }}>
            <TextField
              label="Raw Networking Notes"
              placeholder="Paste companies, contacts, job openings, links, and context here..."
              multiline
              minRows={20}
              fullWidth
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </Box>

          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              zIndex: 2,
              background: '#fff',
              borderTop: '1px solid #e2e8f0',
              px: 2,
              py: 1.5,
            }}
          >
            {parseError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {parseError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={parseNotes}
                disabled={isParsing || !rawText.trim()}
              >
                {isParsing ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CircularProgress size={16} color="inherit" /> Parsing...
                  </span>
                ) : (
                  'Parse with Gemini'
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setMode('review')}
                disabled={reviewItems.length === 0}
              >
                Back to Verification Carousel
              </Button>
              <Button variant="text" onClick={() => navigate('/applications')}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {mode === 'review' && currentItem && (
        <Box
          sx={{
            border: '1px solid #cbd5e1',
            borderRadius: 2,
            bgcolor: '#fff',
            height: 'calc(100vh - 150px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {(() => {
            const requiredFieldErrors = getRequiredFieldsErrors(
              currentItem.application,
            );
            return (
              <>
                <Box
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 3,
                    background: '#fff',
                    borderBottom: '1px solid #e2e8f0',
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Verify Application {currentIndex + 1} / {reviewItems.length}
                    </Typography>
                    <Chip
                      label={getStatusLabel(currentItem.status)}
                      color={getStatusChipColor(currentItem.status)}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setMode('input')}
                        sx={{ textTransform: 'none' }}
                      >
                        Back to Notes
                      </Button>
                      <Button variant="outlined" onClick={goPrev}>
                        Previous
                      </Button>
                      <Button variant="outlined" onClick={goNext}>
                        Next
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <button
                        type="button"
                        aria-label="Mark as skipped"
                        onClick={() => setCurrentStatus('skipped')}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border:
                            currentItem.status === 'skipped'
                              ? '2px solid #7f1d1d'
                              : '1px solid #fecaca',
                          background: '#dc2626',
                          boxShadow: 'none',
                          padding: 0,
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Mark as under review"
                        onClick={() => setCurrentStatus('under_review')}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border:
                            currentItem.status === 'under_review'
                              ? '2px solid #78350f'
                              : '1px solid #fcd34d',
                          background: '#f59e0b',
                          boxShadow: 'none',
                          padding: 0,
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Mark as completed"
                        onClick={() => setCurrentStatus('completed')}
                        disabled={requiredFieldErrors.length > 0}
                        title={
                          requiredFieldErrors.length > 0
                            ? `Missing required fields: ${requiredFieldErrors.join(', ')}`
                            : 'Mark this application as completed'
                        }
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border:
                            currentItem.status === 'completed'
                              ? '2px solid #14532d'
                              : '1px solid #86efac',
                          background: '#16a34a',
                          boxShadow: 'none',
                          padding: 0,
                          opacity:
                            requiredFieldErrors.length > 0 ? 0.5 : 1,
                          cursor:
                            requiredFieldErrors.length > 0
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    {reviewItems.map((item, idx) => {
                      const isCurrent = idx === currentIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          aria-label={`Go to record ${idx + 1}`}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: isCurrent
                              ? '2px solid #0f172a'
                              : '1px solid #cbd5e1',
                            background: getStatusDotColor(item.status),
                            boxShadow: 'none',
                            padding: 0,
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>

                <Box sx={{ px: 2, py: 2, overflowY: 'auto', flex: 1 }}>
                  <Stack spacing={2}>
                    {requiredFieldErrors.length > 0 && (
                      <Alert severity="warning">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 0.5 }}
                        >
                          Required fields to mark as completed:
                        </Typography>
                        <Typography variant="body2">
                          {requiredFieldErrors.join(', ')}
                        </Typography>
                      </Alert>
                    )}
                    <TextField
                      label="Company"
                      value={currentItem.application.company_name || ''}
                      onChange={(e) =>
                        setAppField('company_name', e.target.value.trim() || null)
                      }
                    />
                    <TextField
                      label="Role Title"
                      value={currentItem.application.role_title || ''}
                      onChange={(e) =>
                        setAppField('role_title', e.target.value.trim() || null)
                      }
                    />
                    <TextField
                      label="Location"
                      value={currentItem.application.location || ''}
                      onChange={(e) =>
                        setAppField('location', e.target.value.trim() || null)
                      }
                    />

                    <FormControl fullWidth>
                      <InputLabel id="bulk-source-label">Source</InputLabel>
                      <Select
                        labelId="bulk-source-label"
                        label="Source"
                        value={currentItem.application.source || ''}
                        onChange={(e) =>
                          setAppField(
                            'source',
                            (e.target.value ||
                              null) as JobApplicationInput['source'],
                          )
                        }
                      >
                        <MenuItem value="">(None)</MenuItem>
                        {SOURCE_OPTIONS.map((source) => (
                          <MenuItem key={source} value={source}>
                            {source}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Primary Job URL"
                      value={currentItem.application.job_url || ''}
                      onChange={(e) =>
                        setAppField('job_url', e.target.value.trim() || null)
                      }
                    />

                    <TextField
                      label="Auxiliary URLs (one per line)"
                      multiline
                      minRows={2}
                      value={(currentItem.application.auxiliary_urls || []).join(
                        '\n',
                      )}
                      onChange={(e) =>
                        setAppField(
                          'auxiliary_urls',
                          e.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean),
                        )
                      }
                    />

                    <Box>
                      <Typography sx={{ fontWeight: 600, mb: 1 }}>
                        Contacts
                      </Typography>
                      {(currentItem.application.contacts || []).map(
                        (contact, contactIndex) => {
                          const contactKey = [
                            contact.name || 'unknown',
                            contact.email || 'unknown',
                            contact.linkedin_url || 'unknown',
                            contact.phone || 'unknown',
                            String(contactIndex),
                          ].join('-');

                          return (
                            <Box
                              key={contactKey}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns:
                                  '1fr 1fr 1fr 1fr 1fr auto',
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <TextField
                                label="Name"
                                value={contact.name || ''}
                                onChange={(e) =>
                                  setContactField(
                                    contactIndex,
                                    'name',
                                    e.target.value,
                                  )
                                }
                              />
                              <TextField
                                label="Email"
                                value={contact.email || ''}
                                onChange={(e) =>
                                  setContactField(
                                    contactIndex,
                                    'email',
                                    e.target.value,
                                  )
                                }
                              />
                              <TextField
                                label="Phone"
                                value={contact.phone || ''}
                                onChange={(e) =>
                                  setContactField(
                                    contactIndex,
                                    'phone',
                                    e.target.value,
                                  )
                                }
                              />
                              <TextField
                                label="LinkedIn"
                                value={contact.linkedin_url || ''}
                                onChange={(e) =>
                                  setContactField(
                                    contactIndex,
                                    'linkedin_url',
                                    e.target.value,
                                  )
                                }
                              />
                              <TextField
                                label="Connection Type"
                                value={contact.connection_type || ''}
                                onChange={(e) =>
                                  setContactField(
                                    contactIndex,
                                    'connection_type',
                                    e.target.value,
                                  )
                                }
                              />
                              <IconButton
                                onClick={() => removeContact(contactIndex)}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </Box>
                          );
                        },
                      )}
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={addContact}
                      >
                        Add Contact
                      </Button>
                    </Box>

                    <TextField
                      label="Notes (one per line)"
                      helperText="Use this for any other company, role, or context details."
                      multiline
                      minRows={3}
                      value={(currentItem.application.raw_notes || []).join(
                        '\n',
                      )}
                      onChange={(e) =>
                        setAppField(
                          'raw_notes',
                          e.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </Stack>
                </Box>

                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: allReviewed ? '#166534' : '#854d0e' }}
                  >
                    {allReviewed
                      ? `Ready: ${completedCount} completed, ${skippedCount} skipped.`
                      : 'Every record must be set to Completed (green) or Skipped (red) before submit.'}
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={!allReviewed || isSaving}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {isSaving ? 'Saving...' : 'Submit All to Database'}
                  </Button>
                </Box>
              </>
            );
          })()}
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Bulk Save</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Completed applications to save: {completedCount}
          </Typography>
          <Typography variant="body2">
            Skipped applications to ignore: {skippedCount}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={confirmAndSave}
            variant="contained"
            color="success"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {submitError && (
        <Alert sx={{ mt: 2 }} severity="error">
          {submitError}
        </Alert>
      )}
    </Box>
  );
}
