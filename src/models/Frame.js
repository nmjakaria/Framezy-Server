import mongoose from "mongoose";

const frameSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    category: String,
    tags: [String],
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    fileUrl: String,
    thumbnailUrl: String,
    canvasWidth: Number,
    canvasHeight: Number,
    photoWindow: { x: Number, y: Number, width: Number, height: Number, rotation: Number },
    textSlots: [{ x: Number, y: Number, font: String, maxLength: Number }],
    status: {
      type: String,
      enum: ["draft", "pending_review", "published", "rejected", "archived"],
      default: "draft",
    },
    stats: {
      views: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Frame", frameSchema);