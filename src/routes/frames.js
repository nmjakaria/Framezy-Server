import { Router } from "express";
import Frame from "../models/Frame.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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

// Framer: create a frame (draft or pending_review)
router.post("/", requireAuth, requireRole("framer", "admin"), async (req, res) => {
  const frame = await Frame.create({ ...req.body, ownerId: req.user.sub });
  res.status(201).json(frame);
});

// Framer: manage only their own frame; Admin: any frame
router.patch("/:id", requireAuth, async (req, res) => {
  const frame = await Frame.findById(req.params.id);
  if (!frame) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin" && frame.ownerId.toString() !== req.user.sub) {
    return res.status(403).json({ error: "Forbidden" });
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

export default router;