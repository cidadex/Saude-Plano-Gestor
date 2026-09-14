import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// ---------- Local file storage (fallback when Object Storage is not configured) ----------

const UPLOADS_DIR = path.resolve("data/uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const multerDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, "_");
    cb(null, `${randomUUID()}_${safeName}`);
  },
});

const uploadMiddleware = multer({
  storage: multerDiskStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/**
 * POST /storage/upload
 *
 * Recebe arquivo via multipart/form-data e armazena localmente.
 * Retorna { objectPath } compatível com /storage/objects/* para servir.
 */
router.post("/storage/upload", uploadMiddleware.single("file"), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }
  // /objects/local/ prefix → served by the GET below
  const objectPath = `/objects/local/${file.filename}`;
  res.json({ objectPath, name: file.originalname, size: file.size, contentType: file.mimetype });
});

/**
 * GET /storage/objects/local/*filename
 *
 * Serve arquivos armazenados localmente em data/uploads/.
 * Deve ficar ANTES do wildcard GCS para ter precedência.
 */
router.get("/storage/objects/local/*filename", (req: Request, res: Response) => {
  const raw = req.params.filename;
  const filename = Array.isArray(raw) ? raw.join("/") : raw;
  const safeName = path.basename(filename); // prevent path traversal
  const filepath = path.join(UPLOADS_DIR, safeName);
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "Arquivo não encontrado" });
    return;
  }
  res.sendFile(path.resolve(filepath));
});

// ---------- Legacy presigned-URL endpoint (kept for compatibility) ----------

/**
 * POST /storage/uploads/request-url
 *
 * Solicita URL presignada para upload direto ao GCS.
 * Requer Object Storage configurado no Replit (App Storage).
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body ?? {};
  if (!name || typeof name !== "string" || !contentType || typeof contentType !== "string") {
    res.status(400).json({ error: "Missing or invalid required fields: name, contentType" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size: size ?? 0, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve assets públicos de PUBLIC_OBJECT_SEARCH_PATHS (GCS).
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities do GCS (PRIVATE_OBJECT_DIR).
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
