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

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- ENV ---------- */
const {
  BOT_TOKEN,
  GUILD_ID,
  APPLY_ROLE_ID,
  ADMIN_ROLE_ID,
  WEBHOOK_URL,
} = process.env;

const PORT = process.env.PORT || 5000;

/* ---------- DISCORD BOT ---------- */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(BOT_TOKEN).catch(err => {
  console.error("❌ Bot login failed:", err.message);
  process.exit(1);
});

/* ---------- UPLOADS ---------- */
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

/* ---------- HELPERS ---------- */
const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const validDiscordId = (id) => /^\d{17,20}$/.test(id);

/* ---------- APPLY API ---------- */
app.post("/apply", upload.single("discord_pic"), async (req, res) => {
  try {
    const { name, discordId, age, experience } = req.body;
    const roles = toArray(req.body.roles);
    const devices = toArray(req.body.devices);

    if (!discordId || !validDiscordId(discordId)) {
      return res.status(400).json({ success: false, message: "Invalid Discord ID" });
    }

    let guild;
    try {
      guild = await client.guilds.fetch(GUILD_ID);
      await guild.roles.fetch();
    } catch (err) {
      console.error("Guild fetch error:", err.message);
      return res.status(500).json({ success: false, message: "Guild not found" });
    }

    const applyRole = guild.roles.cache.get(APPLY_ROLE_ID);
    if (!applyRole) {
      return res.status(500).json({ success: false, message: "Apply role not found" });
    }

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      return res.status(404).json({ success: false, message: "User not found in server" });
    }

    const botMember = await guild.members.fetch(client.user.id);
    if (botMember.roles.highest.position <= applyRole.position) {
      return res.status(403).json({ success: false, message: "Bot role must be above Apply role" });
    }

    await member.roles.add(applyRole).catch(err => {
      console.error("Role add error:", err.message);
    });

    try {
      await member.send("✅ Your GODX ESPORTS application was received!");
    } catch {
      console.warn("Could not DM user.");
    }

    let imageUrl = member.user.displayAvatarURL({ dynamic: true, size: 512 });
    if (req.file) {
      imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    const payload = {
      content: `<@&${ADMIN_ROLE_ID}> New Applicant: <@${discordId}>`,
      allowed_mentions: { roles: [ADMIN_ROLE_ID] },
      embeds: [
        {
          title: "🛡️ NEW GUILD APPLICATION",
          color: 0xff0000,
          fields: [
            { name: "Name", value: name || "N/A", inline: true },
            { name: "Age", value: age?.toString() || "N/A", inline: true },
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

    if (!WEBHOOK_URL.startsWith("https://")) {
      console.error("Invalid webhook URL");
      return res.status(500).json({ success: false, message: "Invalid webhook URL" });
    }

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Apply error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------- STATIC ---------- */
app.use("/uploads", express.static(UPLOAD_DIR));

/* ---------- START ---------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
