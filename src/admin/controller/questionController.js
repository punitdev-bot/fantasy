const mongoose = require('mongoose');
const questionModel = require('../../models/questionModel');


class questionController{
    constructor() {
        return {
            createQuestion: this.createQuestion.bind(this),

        }
    }

    async createQuestion(req,res,next){
       
let obj = {
    question:`How many Dots will be there in an over`,
    options:[]
}

for(let i=0;i<=6;i++) {
    obj.options.push(i.toString())
}
// obj.options.push("more than 36")


          const question = await questionModel.create(obj)
          res.json(question)  

        // res.json(obj)
    }
}

module.exports = new questionController