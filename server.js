// server.js (final)
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
app.use(express.urlencoded({ extended: true })); // parse form fields

// ---------------- ENV CONFIG ----------------
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const APPLY_ROLE_ID = process.env.APPLY_ROLE_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = Number(process.env.PORT || 5000);

// ---------------- DISCORD CLIENT ----------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("clientReady", () => {
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
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ---------------- HELPERS ----------------
function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isValidDiscordId(id) {
  // Snowflakes are numeric strings; basic check
  return typeof id === "string" && /^\d{17,20}$/.test(id);
}

// ---------------- APPLY ENDPOINT ----------------
app.post("/apply", upload.single("discord_pic"), async (req, res) => {
  const { discordId, name, age, experience } = req.body;
  const roles = toArray(req.body.roles);
  const devices = toArray(req.body.devices);

  console.log("Incoming form data:", {
    discordId,
    name,
    age,
    experience,
    roles,
    devices,
    file: req.file?.filename,
  });

  if (!discordId) {
    return res
      .status(400)
      .json({ success: false, message: "Discord ID is required" });
  }

  if (!isValidDiscordId(discordId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Discord ID format" });
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
        .json({ success: false, message: "User not found in server" });
    }

    const botMember = await guild.members.fetch(client.user.id);
    const botRolePosition = botMember.roles.highest.position;
    if (botRolePosition <= applyRole.position) {
      return res.status(403).json({
        success: false,
        message:
          "Bot role is not high enough to assign the Apply Role. Move bot role above the Apply Role.",
      });
    }

    // Assign role
    await member.roles.add(applyRole);

    // DM confirmation
    try {
      await member.send(
        `👋 Hi ${name || "Gamer"}! Your application to **GODX ESPORTS** was received. Welcome! 🎮`
      );
    } catch (dmError) {
      console.warn("⚠️ Could not send DM to user:", dmError.message);
    }

    // Avatar or uploaded image
    let imageUrl = member.user.displayAvatarURL({ dynamic: true, size: 512 });
    if (req.file) {
      imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    }

    // Webhook embed
    const payload = {
      content: `<@&${ADMIN_ROLE_ID}>\n👤 New Applicant: <@${discordId}>`,
      allowed_mentions: { roles: [ADMIN_ROLE_ID], users: [discordId] },
      embeds: [
        {
          title: "🛡️ NEW GUILD APPLICATION – GODX ESPORTS",
          color: 0xff0000,
          fields: [
            { name: "Name", value: name || "N/A", inline: true },
            { name: "Age", value: (age ?? "").toString() || "N/A", inline: true },
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

    return res.json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (err) {
    console.error("Error handling application:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- STATIC ----------------
app.use("/uploads", express.static(UPLOAD_DIR));

// ---------------- START SERVER ----------------
function startServer(port) {
  app
    .listen(port)
    .on("listening", () => {
      console.log(`🌐 Server running on http://localhost:${port}`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${port} in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error("Server error:", err);
      }
    });
}

startServer(PORT);
