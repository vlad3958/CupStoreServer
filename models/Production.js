const mongoose = require("mongoose");

const productionSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true
    },
    cupsCount: {
        type: Number,
        required: true
    },
    cupSize: {
        type: String,
        required: true
    },
    cupType: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model("Production", productionSchema, "produced");