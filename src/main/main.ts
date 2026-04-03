// src/main/index.ts (or main.js) - Cleaned up version

/* eslint-disable global-require, no-console, promise/always-return */
import path from 'path';
import fs from 'fs/promises'; // Use promises for async consistency
import dotenv from 'dotenv';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { JobApplicationInput, TimelineEvent } from '../types';

const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnvPath });
if (!process.env.GEMINI_API_KEY) {
  dotenv.config();
}

const GEMINI_MODEL = 'gemini-3.1-pro-preview';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const SOURCE_OPTIONS = [
  'Cold Application',
  'Direct Connection',
  'In-Person Event',
  'Inbound Outreach',
];

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const sanitizeTimeline = (value: unknown): TimelineEvent[] => {
  if (!Array.isArray(value)) return [];
  const timeline: TimelineEvent[] = [];
  value.forEach((entry) => {
    if (!isObject(entry)) return;
    const stage = asStringOrNull(entry.stage);
    const date = asStringOrNull(entry.date);
    if (!stage || !date) return;

    if (stage === 'Assessment') {
      const dueDate = asStringOrNull(entry.due_date);
      timeline.push({
        stage,
        date,
        due_date: dueDate || date,
        completed_at: asStringOrNull(entry.completed_at),
        notes: asStringOrNull(entry.notes),
      });
      return;
    }

    timeline.push({
      stage,
      date,
      due_date: asStringOrNull(entry.due_date) || date,
      notes: asStringOrNull(entry.notes),
    });
  });
  return timeline;
};

const sanitizeApplicationInput = (value: unknown): JobApplicationInput | null => {
  if (!isObject(value)) return null;
  const source = asStringOrNull(value.source);
  const normalizedSource = source && SOURCE_OPTIONS.includes(source) ? source : null;
  const contacts = Array.isArray(value.contacts)
    ? value.contacts
        .map((contact) => {
          if (!isObject(contact)) return null;
          return {
            name: asStringOrNull(contact.name),
            email: asStringOrNull(contact.email),
            phone: asStringOrNull(contact.phone),
            linkedin_url: asStringOrNull(contact.linkedin_url),
            connection_type: asStringOrNull(contact.connection_type),
          };
        })
        .filter(Boolean)
    : [];

  return {
    company_name: asStringOrNull(value.company_name),
    role_title: asStringOrNull(value.role_title),
    location: asStringOrNull(value.location),
    source: normalizedSource as JobApplicationInput['source'],
    job_url: asStringOrNull(value.job_url),
    auxiliary_urls: asStringArray(value.auxiliary_urls),
    contacts: contacts as JobApplicationInput['contacts'],
    timeline: sanitizeTimeline(value.timeline),
    raw_notes: asStringArray(value.raw_notes),
  };
};

const extractJsonArray = (responseText: string): unknown[] => {
  const fencedMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : responseText;

  const firstBracket = candidate.indexOf('[');
  const lastBracket = candidate.lastIndexOf(']');
  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    throw new Error('Gemini response did not include a JSON array.');
  }

  const jsonString = candidate.slice(firstBracket, lastBracket + 1);
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response JSON was not an array.');
  }
  return parsed;
};

const buildGeminiPrompt = (notes: string) => {
  return [
    'You are a strict JSON transformer for a job application tracker.',
    'Convert the unstructured networking notes into a JSON array only. No markdown, no explanations.',
    'Each array item must represent one job application record. If one company has multiple openings, create one object per opening and duplicate relevant company/contact details in each object.',
    'Output schema for each object:',
    '{',
    '  "company_name": string | null,',
    '  "role_title": string | null,',
    '  "location": string | null,',
    '  "source": "Cold Application" | "Direct Connection" | "In-Person Event" | "Inbound Outreach" | null,',
    '  "job_url": string | null,',
    '  "auxiliary_urls": string[],',
    '  "contacts": [',
    '    {',
    '      "name": string | null,',
    '      "email": string | null,',
    '      "phone": string | null,',
    '      "linkedin_url": string | null,',
    '      "connection_type": string | null',
    '    }',
    '  ],',
    '  "timeline": [],',
    '  "raw_notes": string[]',
    '}',
    'Rules:',
    '- Keep timeline as an empty array unless an explicit dated stage is provided.',
    '- raw_notes must include concise evidence snippets from the source text for traceability.',
    '- Put any additional company, contact, or role context that does not fit other fields into raw_notes.',
    '- Use null for unknown scalar values, not empty strings.',
    '- auxiliary_urls should include useful non-primary links only.',
    '',
    'Networking notes:',
    notes,
  ].join('\n');
};

ipcMain.handle('parse-networking-notes', async (_event, notes: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const rawNotes = typeof notes === 'string' ? notes.trim() : '';
  if (!rawNotes) {
    return [];
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildGeminiPrompt(rawNotes) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errText.slice(0, 240)}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text)
    .filter(Boolean)
    .join('\n');

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  const parsed = extractJsonArray(text)
    .map((item) => sanitizeApplicationInput(item))
    .filter(Boolean) as JobApplicationInput[];

  return parsed;
});

// In src/main/index.ts
ipcMain.handle('read-initial-data', async () => {
  try {
    const dataPath = path.join(
      process.cwd(),
      'data/processed_applications.json',
    );
    console.log('[main] Loading from:', dataPath); // Debug log
    const raw = await fs.readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    console.log(
      '[main] Loaded',
      Array.isArray(parsed) ? parsed.length : 0,
      'records',
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    console.error('[main] Data load failed:', error.code || error.message);
    log.error(error);
    return [];
  }
});

// Rest of your main process code remains unchanged...
class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      devTools: false,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
