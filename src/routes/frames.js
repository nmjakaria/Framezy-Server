import { Router } from "express";
import Frame from "../models/Frame.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isValidImgbbUrl } from "../utils/validateImageUrl.js";
import { generateUniqueSlug, isValidCustomSlug } from "../utils/slugify.js";

const router = Router();

// Guest: browse/search published frames — no auth
router.get("/", async (req, res) => {
    const { category, q } = req.query;
    const filter = { status: "published" };
    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: "i" };
    const frames = await Frame.find(filter).limit(50);
    res.json(frames);
});

// Admin: every frame, any owner, any status — this is the endpoint the
// admin dashboard was missing
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const frames = await Frame.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(frames);
});

// Framer: list their own frames, any status
router.get("/mine", requireAuth, requireRole("framer", "admin"), async (req, res) => {
    const frames = await Frame.find({ ownerId: req.user.sub }).sort({ createdAt: -1 });
    res.json(frames);
});

// Guest: look up a frame by its public share slug (published only)
router.get("/slug/:slug", async (req, res) => {
    const frame = await Frame.findOne({ slug: req.params.slug, status: "published" });
    if (!frame) return res.status(404).json({ error: "Frame not found" });
    res.json(frame);
});

// Public if published; owner Framer or Admin can view any status
router.get("/:id", async (req, res) => {
    const frame = await Frame.findById(req.params.id).catch(() => null);
    if (!frame) return res.status(404).json({ error: "Frame not found" });

    if (frame.status === "published") {
        return res.json(frame);
    }

    // Non-published frames require auth + ownership/admin
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(404).json({ error: "Frame not found" });

    try {
        const { jwtVerify } = await import("jose");
        const { createRemoteJWKSet } = await import("jose");
        const JWKS = createRemoteJWKSet(new URL(`${process.env.AUTH_ISSUER_URL}/api/auth/jwks`));
        const { payload } = await jwtVerify(token, JWKS, { issuer: process.env.AUTH_ISSUER_URL });
        const isOwner = frame.ownerId.toString() === payload.sub;
        const isAdmin = payload.role === "admin";
        if (!isOwner && !isAdmin) return res.status(404).json({ error: "Frame not found" });
        return res.json(frame);
    } catch {
        return res.status(404).json({ error: "Frame not found" });
    }
});

// Framer: create a frame (draft or pending_review)
router.post("/", requireAuth, requireRole("framer", "admin"), async (req, res) => {
    const { fileUrl, thumbnailUrl, slug: requestedSlug, name } = req.body;

    if (!isValidImgbbUrl(fileUrl)) {
        return res.status(400).json({ error: "fileUrl must be a valid imgbb image URL" });
    }
    if (thumbnailUrl && !isValidImgbbUrl(thumbnailUrl)) {
        return res.status(400).json({ error: "thumbnailUrl must be a valid imgbb image URL" });
    }
    if (requestedSlug && !isValidCustomSlug(requestedSlug)) {
        return res.status(400).json({
            error: "Custom URL must be 3-60 characters, lowercase letters/numbers/hyphens only, and not a reserved word",
        });
    }

    const slug = await generateUniqueSlug(Frame, { requestedSlug, name });
    const frame = await Frame.create({ ...req.body, slug, ownerId: req.user.sub });
    res.status(201).json(frame);
});

// Framer: manage only their own frame; Admin: any frame
router.patch("/:id", requireAuth, async (req, res) => {
    const frame = await Frame.findById(req.params.id);
    if (!frame) return res.status(404).json({ error: "Not found" });
    if (req.user.role !== "admin" && frame.ownerId.toString() !== req.user.sub) {
        return res.status(403).json({ error: "Forbidden" });
    }

    if (req.body.fileUrl && !isValidImgbbUrl(req.body.fileUrl)) {
        return res.status(400).json({ error: "fileUrl must be a valid imgbb image URL" });
    }
    if (req.body.thumbnailUrl && !isValidImgbbUrl(req.body.thumbnailUrl)) {
        return res.status(400).json({ error: "thumbnailUrl must be a valid imgbb image URL" });
    }

    if (req.body.slug && req.body.slug !== frame.slug) {
        if (!isValidCustomSlug(req.body.slug)) {
            return res.status(400).json({
                error: "Custom URL must be 3-60 characters, lowercase letters/numbers/hyphens only, and not a reserved word",
            });
        }
        const taken = await Frame.findOne({ slug: req.body.slug, _id: { $ne: frame._id } }).select("_id");
        if (taken) {
            return res.status(400).json({ error: "That custom URL is already taken" });
        }
    }

    Object.assign(frame, req.body);
    await frame.save();
    res.json(frame);
});

// Admin only: approve/reject
router.post("/:id/moderate", requireAuth, requireRole("admin"), async (req, res) => {
    const { decision } = req.body; // "published" | "rejected"
    const frame = await Frame.findByIdAndUpdate(
        req.params.id,
        { status: decision },
        { new: true }
    );
    res.json(frame);
});

// Framer: delete only their own frame; Admin: any frame
router.delete("/:id", requireAuth, async (req, res) => {
    const frame = await Frame.findById(req.params.id);
    if (!frame) return res.status(404).json({ error: "Not found" });
    if (req.user.role !== "admin" && frame.ownerId.toString() !== req.user.sub) {
        return res.status(403).json({ error: "Forbidden" });
    }

    await Frame.findByIdAndDelete(req.params.id);
    res.status(204).send();
});

export default router;