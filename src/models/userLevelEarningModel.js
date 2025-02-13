const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let userLevelEarningSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    levelUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    amount: {
        type: Number
    },
    joinId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'joinleague'
    },
    challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'matchchallenge',
        index:true
    },
    matchkey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'listmatches',
        index:true
    },
    transactionId: {
        type: String
    },
    level: {
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
module.exports = mongoose.model('levelEarning', userLevelEarningSchema);