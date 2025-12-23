const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors'); // Required for cross-origin requests
require('dotenv').config();

const app = express();
// Railway provides the PORT environment variable automatically
const PORT = process.env.PORT || 8080; 

// Middleware
app.use(cors()); // This fixes the "Server connection failed" browser block
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

app.post('/submit', async (req, res) => {
    try {
        const { name, discordId, age, experience, role, device } = req.body;

        const embed = {
            title: "New Guild Application",
            color: 0x00ff00,
            fields: [
                { name: "Name", value: name || "N/A", inline: true },
                { name: "Discord ID", value: discordId || "N/A", inline: true },
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
        console.error('Error:', error.message);
        res.status(500).json({ error: "Failed to send to Discord" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});