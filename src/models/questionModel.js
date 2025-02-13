const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let questionSchema = new Schema({
    question: {
        type: String,  
    },
    options:{
        type:Array,
        default:[]
    },
    status:{
        type:Boolean
    }
}, {
    timestamps: true,
    versionKey: false
})
module.exports = mongoose.model('question', questionSchema);