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