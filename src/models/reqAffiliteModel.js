const mongoose = require('mongoose');

const reqAffiliateSchema = new mongoose.Schema({
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    },
    status: {
        type: String,
        default: 'Pending'
    },
}, {
    timestamps: true
}
);

const ReqAffiliate = mongoose.model('ReqAffiliate', reqAffiliateSchema);

module.exports = ReqAffiliate;