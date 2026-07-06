require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { validate, parse } = require("@telegram-apps/init-data-node");

const User = require("./models/User");
const Production = require("./models/Production");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connected");
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error");
        console.error(err);
    });

// ===== Logger =====

app.use((req, res, next) => {
    console.log("======================================");
    console.log(`${new Date().toISOString()}`);
    console.log(`${req.method} ${req.url}`);
    console.log("Body:");
    console.log(req.body);
    console.log("======================================");

    next();
});

app.post("/api/login", (req, res) => {

    console.log("➡ LOGIN REQUEST");

    const { initData } = req.body;

    if (!initData) {
        console.log("❌ initData is missing");

        return res.status(400).json({
            success: false,
            message: "initData is missing"
        });
    }

    try {

        console.log("Checking Telegram signature...");

        validate(initData, process.env.BOT_TOKEN);

        console.log("✅ Telegram signature is valid");

        const data = parse(initData);

        console.log("User:");

        console.log(data.user);

        res.json({
            success: true,
            user: data.user
        });

    }
    catch (error) {

        console.error("❌ LOGIN ERROR");

        console.error(error);

        res.status(401).json({
            success: false,
            message: error.message
        });

    }

});

app.post("/api/production", async (req, res) => {

    console.log("➡ PRODUCTION REQUEST");

    console.log(req.body);

    try {

        const {
            initData,
            cupsCount,
            cupSize,
            cupType,
            date
        } = req.body;

        console.log("Checking Telegram signature...");

        validate(initData, process.env.BOT_TOKEN);

        console.log("✅ Telegram signature is valid");

        const telegram = parse(initData);

        console.log("Telegram user:");

        console.log(telegram.user);

        console.log("Searching user...");

        let user = await User.findOne({
            telegramId: telegram.user.id
        });

        if (!user) {

            console.log("User not found. Creating...");

            user = await User.create({

                telegramId: telegram.user.id,
                firstName: telegram.user.firstName,
                lastName: telegram.user.lastName,
                username: telegram.user.username

            });

            console.log("✅ User created");

        } else {

            console.log("✅ User already exists");

        }

        console.log("Saving production...");

        const production = await Production.create({

            telegramId: user.telegramId,
            cupsCount,
            cupSize,
            cupType,
            date

        });

        console.log("✅ Production saved");

        console.log(production);

        res.json({
            success: true,
            message: "Production saved"
        });

    }
    catch (error) {

        console.error("❌ PRODUCTION ERROR");

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

// ===== Health =====

app.get("/", (req, res) => {

    console.log("Health check");

    res.send("Server is running");

});

// ===== Start =====

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("======================================");
    console.log("🚀 Server started");
    console.log(`PORT: ${PORT}`);
    console.log(`Mongo URI exists: ${!!process.env.MONGO_URI}`);
    console.log(`Bot token exists: ${!!process.env.BOT_TOKEN}`);
    console.log("======================================");

});