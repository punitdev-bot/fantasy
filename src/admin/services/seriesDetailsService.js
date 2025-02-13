const res = require('express/lib/response');
const mongoose = require('mongoose');
const randomstring = require("randomstring");
const listMatchesModel=require("../../models/listMatchesModel");
const seriesModel=require("../../models/addSeriesModel");

class seriesDetails {
constructor() {
    return {
        seriesList:this.seriesList.bind(this),
    }
}
// --------------------
async seriesList(req,fantasy_type=null){
    try{
        let obj = {}
        fantasy_type?obj.fantasy_type = fantasy_type:null

        const seriesListData=await seriesModel.find(obj,{name:1});
        return seriesListData;

    }catch(error){
       
    }
}



}
module.exports = new seriesDetails();


