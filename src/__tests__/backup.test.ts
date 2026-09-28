// Tests for backup validation logic
import { validateBackup } from '../backupValidation';
import type { BackupFile } from '../types';

describe('backup validation', () => {
  describe('validateBackup', () => {
    it('should accept a valid backup file object', () => {
      const backup: BackupFile = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [],
      };

      expect(validateBackup(backup)).toBe(true);
    });

    it('should reject non-object values', () => {
      expect(validateBackup(null)).toBe(false);
      expect(validateBackup(undefined)).toBe(false);
      expect(validateBackup('string')).toBe(false);
      expect(validateBackup(123)).toBe(false);
      expect(validateBackup([])).toBe(false);
    });

    it('should reject unknown format strings', () => {
      const data = {
        format: 'unknown-format',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [],
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should reject unsupported versions', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 2,
        createdAt: new Date().toISOString(),
        docs: [],
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should reject invalid createdAt date strings', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: 'not-a-date',
        docs: [],
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should reject missing createdAt field', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 1,
        docs: [],
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should reject non-array docs field', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: 'not-an-array',
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should accept backup with documents', () => {
      const backup: BackupFile = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [
          {
            id: 'test-1',
            company_name: 'Test Company',
            role_title: 'Tester',
            location: 'Nowhere',
            source: 'Cold Application',
            job_url: 'https://example.com',
            auxiliary_urls: [],
            contacts: [],
            timeline: [],
            raw_notes: [],
          },
        ],
      };

      expect(validateBackup(backup)).toBe(true);
    });

    it('should reject documents missing id field', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [
          {
            company_name: 'Test Company',
            role_title: 'Tester',
          },
        ],
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should reject documents with non-string id', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [
          {
            id: 123,
            company_name: 'Test Company',
          },
        ],
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should reject documents that are not objects', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: ['not-an-object'],
      };
      expect(validateBackup(data)).toBe(false);
    });

    it('should accept empty docs array', () => {
      const data = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [],
      };
      expect(validateBackup(data)).toBe(true);
    });
  });

  describe('round-trip export simulation', () => {
    it('should survive a full export-validate cycle with empty backup', () => {
      const backup: BackupFile = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [],
      };

      expect(validateBackup(backup)).toBe(true);
      expect(backup.docs).toHaveLength(0);
    });

    it('should accept backup with a single document', () => {
      const backup: BackupFile = {
        format: 'job-application-tracker-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        docs: [
          {
            id: 'doc-1',
            company_name: 'Acme Corp',
            role_title: 'Engineer',
            location: 'Remote',
            source: 'Direct Connection',
            job_url: 'https://acme.com/jobs/1',
            auxiliary_urls: [],
            contacts: [],
            timeline: [],
            raw_notes: ['Found on LinkedIn'],
          },
        ],
      };

      expect(validateBackup(backup)).toBe(true);
      expect(backup.docs).toHaveLength(1);
      expect(backup.docs[0]!.id).toBe('doc-1');
      expect(backup.docs[0]!.company_name).toBe('Acme Corp');
    });
  });
});
