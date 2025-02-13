const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let matchOverSchema = new Schema({
    
    overNo: {
        type: Number,
        required:true
        
    },
    inning: {
        type: Number,
      
    },
    teamId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'team'
    }
    ,
    matchId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'listMatches'
    },
    status:{
        type:String,
        default:"notstarted"
    },
    contestStatus:{
        type:Boolean,
        default:true
    },
    overPlayedStatus:{
        type:String,
        default:"notupdated"
    },
    questions:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: 'question'
        }
    ]

}, {
    timestamps: true,
    versionKey: false
})
module.exports = mongoose.model('matchOver', matchOverSchema);