const mappingServices = require("../services/mappingService");

const adminModel = require("../../models/adminModel");
const mongoose = require("mongoose");
const constent = require("../../config/const_credential");
request = require("request");
class mappingservice {
  constructor() {
    return {
      mappingPlayers: this.mappingPlayers.bind(this),
      matchPointUpdate: this.matchPointUpdate.bind(this),
      rankUpdateInMatch: this.rankUpdateInMatch.bind(this),


    }
  }

  async matchPointUpdate(req, res) {
    try {
      const data = await mappingServices.matchPointUpdate(req);
      if (data.status === false) {
        return res.status(200).json(Object.assign({ success: true }, data));
      } else {
        return res.status(200).json(Object.assign({ success: data.status }, data));
      }
    } catch (error) {
      console.log(error);
    }
  }
  async mappingPlayers(req, res) {
    try {
      const data = await mappingServices.mappingPlayers(req);
      if (data.status === false) {
        return res.status(200).json(Object.assign({ success: true }, data));
      } else {
        return res.status(200).json(Object.assign({ success: data.status }, data));
      }
    }
    catch (error) {
      console.log(error);
    }
  }



  async rankUpdateInMatch(req, res) {
    try {
      const data = await mappingServices.rankUpdateInMatch(req);
      if (data.status === false) {
        return res.status(200).json(Object.assign({ success: true }, data));
      } else {
        return res.status(200).json(Object.assign({ success: data.status }, data));
      }
    }
    catch (error) {
      console.log(error);
    }
  }


}
module.exports = new mappingservice();
