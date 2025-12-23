const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors'); // Added
const multer = require('multer'); // Added for image handling
const upload = multer();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080; // Fixed for Railway

// Middleware
app.use(cors()); // Allows your GitHub Pages to connect
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

app.post('/submit', upload.single('profileImage'), async (req, res) => {
    try {
        const { name, discordId, age, experience, role, device } = req.body;
        
        // Prepare Discord embed
        const embed = {
            title: "New Guild Application",
            color: 0x00ff00,
            fields: [
                { name: "Name", value: name, inline: true },
                { name: "Discord ID", value: `<@${discordId}>`, inline: true },
                { name: "Age", value: age, inline: true },
                { name: "Experience", value: experience },
                { name: "Role", value: Array.isArray(role) ? role.join(', ') : role, inline: true },
                { name: "Device", value: Array.isArray(device) ? device.join(', ') : device, inline: true }
            ],
            timestamp: new Date()
        };

        await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
        res.status(200).send("Success");
    } catch (error) {
        console.error('Error sending to Discord:', error);
        res.status(500).send("Failed to send application");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
