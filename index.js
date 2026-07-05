require("dotenv").config();

const express = require("express");
const { validate, parse } = require("@telegram-apps/init-data-node");

const app = express();

app.use(express.json());

const User = require("./models/User");
const Production = require("./models/Production");

app.post("/api/login", (req, res) => {
    const { initData } = req.body;

    try {
        // Проверяем подпись Telegram
        validate(initData, process.env.BOT_TOKEN);

        // Получаем данные пользователя
        const data = parse(initData);

        console.log(data.user);

        res.json({
            success: true,
            user: data.user,
        });
    } catch (error) {
        console.error(error);

        res.status(401).json({
            success: false,
            message: "Invalid Telegram data",
        });
    }
});

app.post("/api/production", async (req, res) => {
    const {
        initData,
        cupsCount,
        cupSize,
        cupType,
        date
    } = req.body;

    try {
        validate(initData, process.env.BOT_TOKEN);

        const telegram = parse(initData);

        // Ищем пользователя
        let user = await User.findOne({
            telegramId: telegram.user.id
        });

        // Если нет — создаем
        if (!user) {
            user = await User.create({
                telegramId: telegram.user.id,
                firstName: telegram.user.firstName,
                lastName: telegram.user.lastName,
                username: telegram.user.username
            });
        }

        // Сохраняем запись о производстве
        await Production.create({
            telegramId: user.telegramId,
            cupsCount,
            cupSize,
            cupType,
            date
        });

        res.json({
            success: true
        });

    } catch (err) {
        res.status(401).json({
            success: false,
            message: err.message
        });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started");
});