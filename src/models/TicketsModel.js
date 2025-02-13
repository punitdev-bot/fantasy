const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const TicketSchema = new Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    ticketid: {
        type: String,
    },
    subject: {
        type: String,
    },
    message: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'progress', 'complete'],
        default: 'open'
    },
    reply: {
        type: String,
        default: null
    },
    requestDate: {
        type: String,
        default: Date.now
    },
    lastUpdate: {
        type: String,
        default: null
    },
    closeDate: {
        type: String,
        default: null
    }

},
    {
        timestamps: true
    });


module.exports = mongoose.model('Tickets', TicketSchema);