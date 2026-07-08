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

app.post("/api/login", async (req, res) => {

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

        console.log("Upserting user...");

        await User.findOneAndUpdate(
            { telegramId: data.user.id },
            {
                telegramId: data.user.id,
                firstName: data.user.first_name,
                lastName: data.user.last_name,
                username: data.user.username
            },
            { upsert: true, new: true }
        );

        console.log("✅ User upserted");

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
                firstName: telegram.user.first_name,
                lastName: telegram.user.last_name,
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

// ===== Telegram Bot (admin broadcast) =====

const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// When an admin writes to the bot directly (private chat), broadcast to all users
bot.on("message", async (msg) => {
    try {
        const chat = msg.chat;

        // Only react to private messages from an admin
        if (chat.type !== "private") return;
        if (!isAdmin(msg.from.id)) return;

        // Ignore commands (e.g. /start) so they don't get broadcast
        if (msg.text && msg.text.startsWith("/")) return;

        const text = msg.text || msg.caption || "";
        if (!text && !msg.photo && !msg.document && !msg.video) return;

        console.log(`📢 Admin ${msg.from.id} broadcast received`);

        const users = await User.find({});
        console.log(`Broadcasting to ${users.length} users...`);

        let success = 0;
        let failed = 0;

        for (const user of users) {
            try {
                const opts = { parse_mode: "HTML" };

                if (msg.photo) {
                    const photoId = msg.photo[msg.photo.length - 1].file_id;
                    await bot.sendPhoto(user.telegramId, photoId, {
                        caption: text,
                        ...opts
                    });
                } else if (msg.document) {
                    await bot.sendDocument(user.telegramId, msg.document.file_id, {
                        caption: text,
                        ...opts
                    });
                } else if (msg.video) {
                    await bot.sendVideo(user.telegramId, msg.video.file_id, {
                        caption: text,
                        ...opts
                    });
                } else {
                    await bot.sendMessage(user.telegramId, text, opts);
                }
                success++;
            } catch (err) {
                failed++;
                console.error(`❌ Failed to send to ${user.telegramId}:`, err.message);
            }
        }

        console.log(`✅ Broadcast done. success=${success} failed=${failed}`);

        await bot.sendMessage(
            msg.from.id,
            `✅ Розсилка завершена.\nУспішно: ${success}\nНе вдалося: ${failed}`
        );
    } catch (err) {
        console.error("❌ BROADCAST ERROR:", err);
    }
});

bot.on("polling_error", (err) => {
    console.error("❌ Bot polling error:", err.message);
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