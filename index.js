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

const ADMIN_IDS = (process.env.ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number);

function isAdmin(telegramId) {
    return ADMIN_IDS.includes(telegramId);
}

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
            user: data.user,
            isAdmin: isAdmin(data.user.id)
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

app.post("/api/production/list", async (req, res) => {

    console.log("➡ PRODUCTION LIST REQUEST");

    try {

        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({
                success: false,
                message: "initData is missing"
            });
        }

        console.log("Checking Telegram signature...");

        validate(initData, process.env.BOT_TOKEN);

        console.log("✅ Telegram signature is valid");

        const telegram = parse(initData);

        console.log("Telegram user:");

        console.log(telegram.user);

        console.log("Loading productions...");

        const productions = await Production
            .find({
                telegramId: telegram.user.id
            })
            .sort({ date: -1 });

        console.log(`Found ${productions.length} records`);

        res.json({
            success: true,
            productions
        });

    }
    catch (error) {

        console.error("❌ PRODUCTION LIST ERROR");

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

app.put("/api/production/:id", async (req, res) => {

    console.log("➡ PRODUCTION UPDATE REQUEST");

    console.log(req.body);

    try {

        const { id } = req.params;

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

        console.log("Searching production...");

        const production = await Production.findOne({
            _id: id,
            telegramId: telegram.user.id
        });

        if (!production) {

            console.log("❌ Production not found or belongs to another user");

            return res.status(404).json({
                success: false,
                message: "Запись не найдена"
            });

        }

        console.log("✅ Production found. Updating...");

        if (cupsCount !== undefined) production.cupsCount = cupsCount;
        if (cupSize !== undefined) production.cupSize = cupSize;
        if (cupType !== undefined) production.cupType = cupType;
        if (date !== undefined) production.date = date;
        await production.save();

        console.log("✅ Production updated");

        console.log(production);

        res.json({
            success: true,
            message: "Запись обновлена",
            production
        });

    }
    catch (error) {

        console.error("❌ PRODUCTION UPDATE ERROR");

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

app.delete("/api/production/:id", async (req, res) => {

    console.log("➡ PRODUCTION DELETE REQUEST");

    try {

        const { id } = req.params;
        const { initData } = req.body;

        console.log("Checking Telegram signature...");

        validate(initData, process.env.BOT_TOKEN);

        console.log("✅ Telegram signature is valid");

        const telegram = parse(initData);

        console.log("Telegram user:");

        console.log(telegram.user);

        console.log("Searching production...");

        const production = await Production.findOneAndDelete({
            _id: id,
            telegramId: telegram.user.id
        });

        if (!production) {

            console.log("❌ Production not found or belongs to another user");

            return res.status(404).json({
                success: false,
                message: "Запис не знайдено"
            });

        }

        console.log("✅ Production deleted");

        res.json({
            success: true,
            message: "Запис видалено"
        });

    }
    catch (error) {

        console.error("❌ PRODUCTION DELETE ERROR");

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

app.post("/api/admin/overview", async (req, res) => {

    console.log("➡ ADMIN OVERVIEW REQUEST");

    try {

        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({
                success: false,
                message: "initData is missing"
            });
        }

        console.log("Checking Telegram signature...");

        validate(initData, process.env.BOT_TOKEN);

        console.log("✅ Telegram signature is valid");

        const telegram = parse(initData);

        console.log("Telegram user:");

        console.log(telegram.user);

        if (!isAdmin(telegram.user.id)) {

            console.log("❌ Not an admin, access denied");

            return res.status(403).json({
                success: false,
                message: "Доступ заборонено"
            });

        }

        console.log("✅ Admin access granted. Loading data...");

        const users = await User.find({});
        const productions = await Production.find({}).sort({ date: -1 });

        console.log(`Found ${users.length} users, ${productions.length} productions`);

        res.json({
            success: true,
            users,
            productions
        });

    }
    catch (error) {

        console.error("❌ ADMIN OVERVIEW ERROR");

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