import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import driveInfo from "./src/lib/drive-info.json";
import {
  getConnection,
  saveConnection,
  driveCall,
  validatePayload,
  validEndpoint,
  getLocalRecords,
  saveLocalRecords,
  upsertLocalRecord,
} from "./src/lib/drive-server";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Dlbeen Influencers System" });
  });

  // Connection status & info
  app.get("/api/connection", (_req, res) => {
    try {
      const c = getConnection();
      res.json({
        configured: !!c,
        updatedAt: c?.updated_at || null,
        endpoint: c?.endpoint ? c.endpoint.replace(/(macros\/s\/)[^/]+(\/exec)/, "$1***$2") : null,
        spreadsheetUrl: driveInfo.spreadsheetUrl,
        folderUrl: driveInfo.folderUrl,
        spreadsheetId: driveInfo.spreadsheetId,
        folderId: driveInfo.folderId,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to retrieve connection state" });
    }
  });

  // Save and test connection
  app.post("/api/connection", async (req, res) => {
    try {
      const { endpoint, secret } = req.body || {};
      if (!validEndpoint(endpoint) || typeof secret !== "string" || secret.length < 16) {
        return res.status(400).json({
          error: "Enter the deployed Google Web app URL ending in /exec and the secret connection key from Google Sheets (Extensions → Dlbeen → Show connection key).",
        });
      }

      // Step 1: Ping Google Script
      const tested: any = await driveCall({ action: "ping" }, { endpoint, secret });
      if (tested.system !== "Dlbeen Influencers System") {
        return res.status(400).json({
          error: "The endpoint responded, but it is not the Dlbeen Influencers System. Ensure the Code.gs file was replaced with the prepared Dlbeen script.",
        });
      }

      // Step 2: Validate database tabs
      const listed: any = await driveCall({ action: "list" }, { endpoint, secret });
      if (!listed.data || !["influencers", "agreements", "content"].every((k) => Array.isArray(listed.data[k]))) {
        return res.status(400).json({
          error: "The connection could not read the Dlbeen database tabs (Profiles, Agreements, Content). Check the deployed script.",
        });
      }

      // Step 3: Save connection
      saveConnection(endpoint, secret);

      // Cache fetched data locally
      saveLocalRecords(listed.data);

      res.json({ configured: true, count: listed.data.influencers?.length || 0 });
    } catch (e: any) {
      console.error("Connection error:", e);
      res.status(400).json({ error: e.message || "Connection test failed." });
    }
  });

  // Disconnect / reset connection
  app.delete("/api/connection", (_req, res) => {
    try {
      const c = getConnection();
      if (c) {
        saveConnection("", "");
      }
      res.json({ configured: false });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bulk update local records cache (e.g. from Google Sheets sync)
  app.post("/api/sync-cache", (req, res) => {
    try {
      const { data } = req.body || {};
      if (data && typeof data === "object") {
        saveLocalRecords(data);
        return res.json({ ok: true });
      }
      res.status(400).json({ error: "Invalid data payload" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Read data
  app.get("/api/data", async (_req, res) => {
    try {
      const c = getConnection();
      if (c) {
        try {
          const result: any = await driveCall({ action: "list" });
          if (result && result.data) {
            saveLocalRecords(result.data);
            return res.json({ ok: true, data: result.data, source: "drive" });
          }
        } catch (driveErr) {
          console.warn("Drive sync failed, falling back to local storage:", driveErr);
          const local = getLocalRecords();
          return res.json({ ok: true, data: local, source: "local_cache", driveError: (driveErr as any).message });
        }
      }
      // If not connected to Drive, return local storage records
      const local = getLocalRecords();
      res.json({ ok: true, data: local, source: "local" });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Unable to read records." });
    }
  });

  // Upsert record
  app.post("/api/data", async (req, res) => {
    try {
      const payload = validatePayload(req.body);
      const c = getConnection();

      // Upsert locally first so work is never lost
      const localRow = upsertLocalRecord(payload.entity, payload.row);

      if (c) {
        try {
          const driveRes: any = await driveCall({ action: "upsert", ...payload });
          return res.json({ ok: true, row: driveRes.row || localRow, savedToDrive: true });
        } catch (driveErr: any) {
          console.error("Failed saving to Drive:", driveErr);
          return res.json({
            ok: true,
            row: localRow,
            savedToDrive: false,
            warning: "Saved locally. Google Drive sync failed: " + driveErr.message,
          });
        }
      }

      res.json({ ok: true, row: localRow, savedToDrive: false, notice: "Saved locally. Connect Google Drive in Settings to sync to Sheets." });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Unable to save record." });
    }
  });

  // Generate & save report directly to Google Drive Reports folder
  app.post("/api/report", async (req, res) => {
    try {
      const { filters, format, notes } = req.body || {};
      if (!["pdf", "xlsx"].includes(format)) {
        return res.status(400).json({ error: "Select PDF or Excel format." });
      }
      const c = getConnection();
      if (!c) {
        return res.status(400).json({ error: "Google Drive is not connected yet. Connect in Settings to save reports to Drive." });
      }
      const result: any = await driveCall({
        action: "report",
        filters,
        format,
        notes: String(notes || "").slice(0, 5000),
      });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Report generation failed." });
    }
  });

  // Upload photo to Google Drive Photos folder
  app.post("/api/upload", async (req, res) => {
    try {
      const { name, mime, base64 } = req.body || {};
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime) || typeof base64 !== "string") {
        return res.status(400).json({ error: "Choose a JPG, PNG or WebP photo smaller than 2 MB." });
      }
      const c = getConnection();
      if (!c) {
        // Return base64 as data URI if not connected to drive yet
        return res.json({ ok: true, id: "data:" + mime + ";base64," + base64 });
      }
      const result: any = await driveCall({
        action: "upload",
        name: String(name || "profile").slice(0, 120),
        mime,
        base64,
      });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Upload failed." });
    }
  });

  // Fetch photo from Drive Photos folder
  app.get("/api/image", async (req, res) => {
    try {
      const id = String(req.query.id || "");
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({ error: "Invalid photo ID." });
      }
      const image: any = await driveCall({ action: "image", id });
      const buffer = Buffer.from(image.base64, "base64");
      res.setHeader("Content-Type", image.mime);
      res.setHeader("Cache-Control", "private, max-age=1800");
      res.send(buffer);
    } catch (e: any) {
      res.status(404).json({ error: e.message || "Photo not found." });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dlbeen Influencers System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
