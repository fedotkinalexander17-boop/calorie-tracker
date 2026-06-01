import { ReplitConnectors } from "@replit/connectors-sdk";

// Creates a fresh connectors instance per call — tokens expire, never cache
function getConnectors() {
  return new ReplitConnectors();
}

type SheetRow = (string | number)[];

export async function createSpreadsheet(title: string): Promise<string> {
  const connectors = getConnectors();
  const res = await connectors.proxy("google-sheet", "/v4/spreadsheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!res.ok) throw new Error(`Failed to create spreadsheet: ${res.status}`);
  const data = await res.json() as { spreadsheetId: string };
  return data.spreadsheetId;
}

export async function writeRows(
  spreadsheetId: string,
  range: string,
  rows: SheetRow[],
): Promise<void> {
  const connectors = getConnectors();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    },
  );
  if (!res.ok) throw new Error(`Failed to write rows: ${res.status}`);
}

export async function updateValues(
  spreadsheetId: string,
  range: string,
  rows: SheetRow[],
): Promise<void> {
  const connectors = getConnectors();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    },
  );
  if (!res.ok) throw new Error(`Failed to update values: ${res.status}`);
}

export async function clearRange(spreadsheetId: string, range: string): Promise<void> {
  const connectors = getConnectors();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    { method: "POST", headers: { "Content-Type": "application/json" } },
  );
  if (!res.ok) throw new Error(`Failed to clear range: ${res.status}`);
}

export async function getSheetTabs(spreadsheetId: string): Promise<{ sheetId: number; title: string }[]> {
  const connectors = getConnectors();
  const res = await connectors.proxy("google-sheet", `/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(`Failed to get sheet tabs: ${res.status}`);
  const data = await res.json() as { sheets: { properties: { sheetId: number; title: string } }[] };
  return data.sheets.map((s) => s.properties);
}

export async function addSheetTab(spreadsheetId: string, tabTitle: string): Promise<number> {
  const connectors = getConnectors();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabTitle } } }] }),
    },
  );
  if (!res.ok) throw new Error(`Failed to add sheet tab: ${res.status}`);
  const data = await res.json() as { replies: { addSheet: { properties: { sheetId: number } } }[] };
  return data.replies[0].addSheet.properties.sheetId;
}

export async function ensureSheetTab(spreadsheetId: string, tabTitle: string): Promise<number> {
  const tabs = await getSheetTabs(spreadsheetId);
  const existing = tabs.find((t) => t.title === tabTitle);
  if (existing) return existing.sheetId;
  return addSheetTab(spreadsheetId, tabTitle);
}

export async function readRows(spreadsheetId: string, range: string): Promise<string[][]> {
  const connectors = getConnectors();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(`Failed to read rows: ${res.status}`);
  const data = await res.json() as { values?: string[][] };
  return data.values ?? [];
}

export async function formatHeader(spreadsheetId: string, sheetId: number = 0): Promise<void> {
  const connectors = getConnectors();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.22, green: 0.46, blue: 0.28 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 8 },
            },
          },
        ],
      }),
    },
  );
  if (!res.ok) console.error("Format header error:", res.status);
}

export function spreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export function parseSpreadsheetId(urlOrId: string): string | null {
  const m = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId)) return urlOrId;
  return null;
}
