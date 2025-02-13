const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let referLevelSchema = new Schema({
    level: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    is_deleted: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true,
    versionKey: false
})
module.exports = mongoose.model('referLevel', referLevelSchema);