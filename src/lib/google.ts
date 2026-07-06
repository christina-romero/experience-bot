import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Server-side Google Drive publishing via a service account.
 *
 * Reads GOOGLE_SERVICE_ACCOUNT_KEY (the full JSON key, as a string) and
 * DRIVE_OUTPUT_FOLDER_ID (a folder shared with the service account as Editor).
 * Uploads an app-generated .docx/.pptx and lets Drive convert it to a native
 * Google Doc / Google Slides in that folder.
 */

export const GOOGLE_ENABLED = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

const SRC_MIME = {
  doc: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  slides: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

const TARGET_MIME = {
  doc: "application/vnd.google-apps.document",
  slides: "application/vnd.google-apps.presentation",
} as const;

export type PublishKind = keyof typeof SRC_MIME;

function serviceAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "Google template copying is not configured. Add GOOGLE_SERVICE_ACCOUNT_KEY to enable native template output."
    );
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the full contents of the downloaded key file.");
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not a service-account key (it has no client_email / private_key). " +
        "You may have pasted the OAuth client secret by mistake. Use the JSON from Google Cloud Console -> " +
        "IAM & Admin -> Service Accounts -> your account -> Keys -> Add key -> Create new key -> JSON."
    );
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/presentations",
      "https://www.googleapis.com/auth/documents",
    ],
  });
}

function driveClient() {
  return google.drive({ version: "v3", auth: serviceAuth() });
}

/**
 * Drive client for reads. If a signed-in user's OAuth access token is provided,
 * read as that user (their own Drive, no sharing needed); otherwise fall back to
 * the service account (files shared with it).
 */
function userOAuth(userAccessToken: string) {
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: userAccessToken });
  return oauth;
}

function driveReadClient(userAccessToken?: string) {
  if (userAccessToken) return google.drive({ version: "v3", auth: userOAuth(userAccessToken) });
  return driveClient();
}

/**
 * Read EVERY worksheet of a Google Sheets workbook. Returns one entry per sheet,
 * preserving the sheet name and its rows (header row first). Reads as the signed-in
 * user when a token is provided, otherwise via the service account.
 */
export async function readSpreadsheetWorkbook(
  spreadsheetId: string,
  userAccessToken?: string
): Promise<{ sheetName: string; rows: string[][] }[]> {
  const auth = userAccessToken ? userOAuth(userAccessToken) : serviceAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const titles = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => !!t);
  if (titles.length === 0) return [];
  const batch = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: titles });
  const valueRanges = batch.data.valueRanges ?? [];
  return titles.map((title, i) => ({
    sheetName: title,
    rows: (valueRanges[i]?.values ?? []).map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
  }));
}

export async function publishToDrive(opts: {
  name: string;
  base64: string;
  kind: PublishKind;
}): Promise<{ id: string; webViewLink: string }> {
  const folderId = process.env.DRIVE_OUTPUT_FOLDER_ID;
  if (!folderId) {
    throw new Error("DRIVE_OUTPUT_FOLDER_ID is not set. Set it to the ID of the Drive folder shared with the service account.");
  }
  const drive = driveClient();
  const buffer = Buffer.from(opts.base64, "base64");

  const res = await drive.files.create({
    requestBody: {
      name: opts.name,
      parents: [folderId],
      mimeType: TARGET_MIME[opts.kind], // converts the upload to a native Google file
    },
    media: {
      mimeType: SRC_MIME[opts.kind],
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const { id, webViewLink } = res.data;
  if (!id) throw new Error("Drive did not return a file id.");
  return { id, webViewLink: webViewLink || `https://drive.google.com/file/d/${id}/view` };
}

/** Pull the file ID out of a Google Drive / Docs / Slides / Sheets URL. */
export function driveFileIdFromUrl(url: string): string | null {
  return parseDriveUrl(url)?.id ?? null;
}

export type DriveTarget = { id: string; kind: "file" | "folder" };

/**
 * Parse any supported Google URL into an id + kind. Accepts Docs, Slides,
 * Sheets, Drive file links, folder links, open?id= links, and bare ids. Returns
 * null only for malformed or non-Google URLs.
 */
export function parseDriveUrl(url: string): DriveTarget | null {
  const u = (url || "").trim();
  const folder = u.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (folder) return { id: folder[1], kind: "folder" };
  const byPath = u.match(/\/d\/([a-zA-Z0-9_-]{15,})/); // document/presentation/spreadsheets/file /d/<id>
  if (byPath) return { id: byPath[1], kind: "file" };
  const byQuery = u.match(/[?&]id=([a-zA-Z0-9_-]{15,})/); // open?id=<id>
  if (byQuery) return { id: byQuery[1], kind: "file" };
  const bare = u.match(/^[a-zA-Z0-9_-]{20,}$/); // bare id
  if (bare) return { id: bare[0], kind: "file" };
  return null;
}

// File types we can turn into text; anything else in a folder is ignored.
const READABLE_MIME = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/markdown",
]);

/** List the readable files directly inside a Drive folder (unsupported files ignored). */
export async function listFolderFiles(
  folderId: string,
  userAccessToken?: string
): Promise<{ id: string; name: string; mimeType: string }[]> {
  const drive = driveReadClient(userAccessToken);
  const out: { id: string; name: string; mimeType: string }[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (f.id && f.mimeType && READABLE_MIME.has(f.mimeType)) {
        out.push({ id: f.id, name: f.name || "file", mimeType: f.mimeType });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

const EXPORT_AS: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.presentation": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
};

/**
 * Read a Drive file via the service account. Google-native files (Docs, Slides,
 * Sheets) are exported to text; anything else is returned as a raw buffer for
 * the caller to decode (e.g. .docx via mammoth).
 */
export async function readDriveFile(
  fileId: string,
  userAccessToken?: string
): Promise<{ text?: string; buffer?: Buffer; name: string }> {
  const drive = driveReadClient(userAccessToken);
  let name = "file";
  let mimeType = "";
  try {
    const meta = await drive.files.get({ fileId, fields: "name, mimeType", supportsAllDrives: true });
    name = meta.data.name || "file";
    mimeType = meta.data.mimeType || "";
  } catch {
    throw new Error(
      userAccessToken
        ? "Could not open that Google Drive file. Check the link and that your account has access to it."
        : "Could not open that Google Drive file. Make sure the link is correct and the file is shared with the service account (at least Viewer)."
    );
  }

  if (EXPORT_AS[mimeType]) {
    const res = await drive.files.export({ fileId, mimeType: EXPORT_AS[mimeType] }, { responseType: "text" });
    return { text: String(res.data), name };
  }
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return { buffer: Buffer.from(res.data as ArrayBuffer), name };
}

/**
 * Copy a template file and return the copy's id. Copies into DRIVE_OUTPUT_FOLDER_ID
 * when set, otherwise the service account's own Drive. When shareWithEmail is
 * provided, the signed-in user is granted edit access so the returned link works
 * for them regardless of folders (the copy is owned by the service account).
 */
export type ShareStatus = "ok" | "failed" | "skipped";

async function copyTemplate(
  templateId: string,
  name: string,
  shareWithEmail?: string
): Promise<{ id: string; webViewLink: string; shared: ShareStatus }> {
  const folderId = process.env.DRIVE_OUTPUT_FOLDER_ID;
  const drive = driveClient();
  const res = await drive.files.copy({
    fileId: templateId,
    requestBody: { name, ...(folderId ? { parents: [folderId] } : {}) },
    supportsAllDrives: true,
    fields: "id, webViewLink",
  });
  const id = res.data.id;
  if (!id) throw new Error("Drive did not return an id for the copied template.");

  let shared: ShareStatus = "skipped";
  if (shareWithEmail) {
    try {
      await drive.permissions.create({
        fileId: id,
        requestBody: { role: "writer", type: "user", emailAddress: shareWithEmail },
        sendNotificationEmail: false,
        supportsAllDrives: true,
      });
      shared = "ok";
    } catch {
      shared = "failed"; // reported to the user; never silently swallowed
    }
  }
  return { id, webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${id}/view`, shared };
}

function replaceRequests(replacements: Record<string, string>) {
  // Each key is a token name (no braces); we match the literal {{TOKEN}}.
  return Object.entries(replacements).map(([token, value]) => ({
    replaceAllText: {
      containsText: { text: `{{${token}}}`, matchCase: true },
      replaceText: value ?? "",
    },
  }));
}

/**
 * Fill a Google Slides template: copy it, then replace every {{TOKEN}} (in
 * slide bodies AND speaker-notes pages) with the provided value. Returns the
 * new native Google Slides file.
 */
export async function fillPresentationFromTemplate(
  templateId: string,
  replacements: Record<string, string>,
  name: string,
  shareWithEmail?: string
): Promise<{ id: string; webViewLink: string; shared: ShareStatus }> {
  const auth = serviceAuth();
  const copy = await copyTemplate(templateId, name, shareWithEmail);
  const slides = google.slides({ version: "v1", auth });
  await slides.presentations.batchUpdate({
    presentationId: copy.id,
    requestBody: { requests: replaceRequests(replacements) },
  });
  return { id: copy.id, webViewLink: `https://docs.google.com/presentation/d/${copy.id}/edit`, shared: copy.shared };
}

/**
 * Fill a Google Docs template: copy it, then replace every {{TOKEN}} with the
 * provided value. Returns the new native Google Doc file.
 */
export async function fillDocumentFromTemplate(
  templateId: string,
  replacements: Record<string, string>,
  name: string,
  shareWithEmail?: string
): Promise<{ id: string; webViewLink: string; shared: ShareStatus }> {
  const auth = serviceAuth();
  const copy = await copyTemplate(templateId, name, shareWithEmail);
  const docs = google.docs({ version: "v1", auth });
  await docs.documents.batchUpdate({
    documentId: copy.id,
    requestBody: { requests: replaceRequests(replacements) },
  });
  return { id: copy.id, webViewLink: `https://docs.google.com/document/d/${copy.id}/edit`, shared: copy.shared };
}