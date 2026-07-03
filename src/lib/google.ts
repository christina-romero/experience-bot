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

function driveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not set. Add the service-account JSON key as an environment variable to enable Publish to Drive."
    );
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the full contents of the downloaded key file.");
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
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
  const byPath = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (byPath) return byPath[1];
  const byQuery = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (byQuery) return byQuery[1];
  // Bare ID pasted directly.
  const bare = url.trim().match(/^[a-zA-Z0-9_-]{20,}$/);
  if (bare) return bare[0];
  return null;
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
export async function readDriveFile(fileId: string): Promise<{ text?: string; buffer?: Buffer; name: string }> {
  const drive = driveClient();
  let name = "file";
  let mimeType = "";
  try {
    const meta = await drive.files.get({ fileId, fields: "name, mimeType", supportsAllDrives: true });
    name = meta.data.name || "file";
    mimeType = meta.data.mimeType || "";
  } catch {
    throw new Error(
      "Could not open that Google Drive file. Make sure the link is correct and the file is shared with the service account (at least Viewer)."
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