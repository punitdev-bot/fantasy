const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const depositSchema = new Schema(
    {
        userId:{
            type:mongoose.Types.ObjectId
        },
        amount: {
            type: Number,
        },
        status: {
            type: String,
            default: 'pending',
            enum: ['pending','approved','rejected']
        },
        image: {
            type: String,
            default:""
        },
        transaction_id: {
            type: String,
        },
        userTransactionId: {
            type: String,
        },

        comment: {
            type: String,
            default:''
        },
        approveDate: {
            type: String,
            default:''
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model('deposit', depositSchema);
