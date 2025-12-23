const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors'); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080; 

// Middleware
app.use(cors()); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Your Webhook URL
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1452417855147610112/9f-vL_xt3OoNGY2Fjx4b5Wlb8F5ggxaUOWNhpKOmSowcxlrGlKxI63Rx-HQM7r564xqa";

app.post('/submit', async (req, res) => {
    try {
        const { name, discordId, age, experience, role, device } = req.body;

        const embed = {
            title: "New Guild Application",
            color: 0x00ff00,
            fields: [
                { name: "Name", value: name || "N/A", inline: true },
                { name: "Discord ID", value: discordId ? `<@${discordId}>` : "N/A", inline: true },
                { name: "Age", value: age || "N/A", inline: true },
                { name: "Experience", value: experience || "N/A" },
                { name: "Role", value: Array.isArray(role) ? role.join(', ') : (role || "N/A"), inline: true },
                { name: "Device", value: Array.isArray(device) ? device.join(', ') : (device || "N/A"), inline: true }
            ],
            timestamp: new Date()
        };

        await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
        res.status(200).json({ message: "Success" });
    } catch (error) {
        console.error('Submission Error:', error.message);
        res.status(500).json({ error: "Failed to send to Discord" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
