// server.js (Railway FINAL FIXED)
// Run with: node server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import multer from "multer";
import fetch from "node-fetch";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// ---------------- ENV CONFIG ----------------
const {
  BOT_TOKEN,
  GUILD_ID,
  APPLY_ROLE_ID,
  ADMIN_ROLE_ID,
  WEBHOOK_URL,
  PORT = 8080,
  RAILWAY_PUBLIC_DOMAIN, // optional
} = process.env;

// ---------------- DISCORD CLIENT ----------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(BOT_TOKEN);

// ---------------- UPLOADS FOLDER ----------------
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ---------------- MULTER SETUP ----------------
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ---------------- HELPERS ----------------
const toArray = (v) => (!v ? [] : Array.isArray(v) ? v : [v]);

const isValidDiscordId = (id) =>
  typeof id === "string" && /^\d{17,20}$/.test(id);

// ---------------- APPLY ENDPOINT ----------------
app.post("/apply", upload.single("discord_pic"), async (req, res) => {
  const { discordId, name, age, experience } = req.body;
  const roles = toArray(req.body.roles);
  const devices = toArray(req.body.devices);

  if (!discordId || !isValidDiscordId(discordId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Discord ID" });
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();

    const applyRole = guild.roles.cache.get(APPLY_ROLE_ID);
    if (!applyRole) {
      return res
        .status(500)
        .json({ success: false, message: "Apply role not found" });
    }

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "User not in server" });
    }

    const botMember = await guild.members.fetch(client.user.id);
    if (botMember.roles.highest.position <= applyRole.position) {
      return res.status(403).json({
        success: false,
        message: "Bot role must be above Apply role",
      });
    }

    await member.roles.add(applyRole);

    // DM user
    try {
      await member.send(
        `👋 Hi ${name || "Gamer"}! Your application to **GODX ESPORTS** was received 🎮`
      );
    } catch {}

    // Image URL (PUBLIC)
    let imageUrl = member.user.displayAvatarURL({ size: 512 });
    if (req.file) {
      const baseUrl = RAILWAY_PUBLIC_DOMAIN
        ? `https://${RAILWAY_PUBLIC_DOMAIN}`
        : "https://YOUR-RAILWAY-DOMAIN.up.railway.app";

      imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    // Webhook payload
    const payload = {
      content: `<@&${ADMIN_ROLE_ID}> | New Applicant <@${discordId}>`,
      allowed_mentions: {
        roles: [ADMIN_ROLE_ID],
        users: [discordId],
      },
      embeds: [
        {
          title: "🛡️ NEW GUILD APPLICATION – GODX ESPORTS",
          color: 0xff0000,
          fields: [
            { name: "Name", value: name || "N/A", inline: true },
            { name: "Age", value: age || "N/A", inline: true },
            { name: "Discord ID", value: discordId, inline: true },
            { name: "Experience", value: experience || "N/A" },
            { name: "Roles", value: roles.join(", ") || "N/A" },
            { name: "Devices", value: devices.join(", ") || "N/A" },
          ],
          image: { url: imageUrl },
          timestamp: new Date(),
        },
      ],
    };

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    res.json({ success: true, message: "Application submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- STATIC ----------------
app.use("/uploads", express.static(UPLOAD_DIR));

// ---------------- START SERVER (RAILWAY SAFE) ----------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

