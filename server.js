import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fetch from "node-fetch";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Webhook provided by you
const WEBHOOK_URL = "https://discord.com/api/webhooks/1452417855147610112/9f-vL_xt3OoNGY2Fjx4b5Wlb8F5ggxaUOWNhpKOmSowcxlrGlKxI63Rx-HQM7r564xqa";
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || "1449718757881806980";

/* ---------- MIDDLEWARE ---------- */
app.use(cors()); // Fixes the connection block
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

/* ---------- DISCORD BOT ---------- */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN).catch(err => {
  console.error("❌ Bot login failed. Check your token in Railway Variables.");
});

/* ---------- FORM SUBMISSION ENDPOINT ---------- */
app.post("/apply", upload.single("discord_pic"), async (req, res) => {
  try {
    const { name, discordId, age, experience, roles, devices } = req.body;
    
    // Format roles and devices as strings
    const rolesStr = Array.isArray(roles) ? roles.join(", ") : (roles || "N/A");
    const devicesStr = Array.isArray(devices) ? devices.join(", ") : (devices || "N/A");

    const payload = {
      content: `<@&${ADMIN_ROLE_ID}> New Applicant: <@${discordId}>`,
      embeds: [
        {
          title: "🛡️ NEW GUILD APPLICATION",
          color: 0xff0000,
          fields: [
            { name: "Name", value: name || "N/A", inline: true },
            { name: "Age", value: age || "N/A", inline: true },
            { name: "Discord ID", value: discordId || "N/A", inline: true },
            { name: "Experience", value: experience || "N/A" },
            { name: "Roles", value: rolesStr },
            { name: "Devices", value: devicesStr },
          ],
          timestamp: new Date(),
        },
      ],
    };

    // Send to Discord
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      throw new Error("Discord Webhook failed");
    }
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
