const mongoose = require("mongoose")

const sportCategorySchema = new mongoose.Schema({
    Name: {
        type: String,
    },
    value: {
        type: String,
    }
},
    {
        timestamps: true,
        versionKey: false

    })

module.exports = mongoose.model("sportcategory", sportCategorySchema)