// server.js — GODX Guild Application (Railway Production Safe)
// Node 18+ | Discord.js v14 | Express

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { Client, GatewayIntentBits } from "discord.js";

// ---------------- LOAD ENV (LOCAL ONLY) ----------------
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// ---------------- EXPRESS SETUP ----------------
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------- ENV ----------------
const {
  BOT_TOKEN,
  GUILD_ID,
  APPLY_ROLE_ID,
  ADMIN_ROLE_ID,
  WEBHOOK_URL,
} = process.env;

const PORT = process.env.PORT || 3000;

// ---------------- DISCORD CLIENT ----------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(BOT_TOKEN);

// ---------------- MULTER (MEMORY — NO FILESYSTEM) ----------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ---------------- HELPERS ----------------
const toArray = (v) => (!v ? [] : Array.isArray(v) ? v : [v]);
const isValidDiscordId = (id) =>
  typeof id === "string" && /^\d{17,20}$/.test(id);

// ---------------- APPLY ENDPOINT ----------------
app.post("/apply", upload.single("discord_pic"), async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).json({
        success: false,
        message: "Bot is starting, please try again in a few seconds",
      });
    }

    const { discordId, name, age, experience } = req.body;
    const roles = toArray(req.body.roles);
    const devices = toArray(req.body.devices);

    if (!discordId || !isValidDiscordId(discordId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Discord ID" });
    }

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

    // Give role
    await member.roles.add(applyRole);

    // DM user (optional)
    try {
      await member.send(
        `👋 Hi ${name || "Gamer"}!\nYour application to **GODX ESPORTS** has been received 🎮`
      );
    } catch {}

    // ---------------- WEBHOOK ----------------
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
          timestamp: new Date(),
        },
      ],
    };

    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));

    if (req.file) {
      form.append("files[0]", req.file.buffer, {
        filename: "application.png",
        contentType: req.file.mimetype,
      });
    }

    await fetch(WEBHOOK_URL, {
      method: "POST",
      body: form,
    });

    return res.json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (err) {
    console.error("❌ APPLY ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// ---------------- HEALTH CHECK ----------------
app.get("/", (_, res) => {
  res.send("✅ GODX Guild Application API is running");
});

// ---------------- START SERVER ----------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});
