import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import framesRouter from "./routes/frames.js";
import "dotenv/config";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "20mb" })); // frame PNG metadata, not the raw guest photo

app.use("/api/frames", framesRouter);

app.get("/health", (req, res) => res.json({ ok: true }));

mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(process.env.PORT, () =>
    console.log(`Framezy API running on :${process.env.PORT}`)
  );
});

app.get('/', (req, res) => {
    res.send('Server is running fine');
});