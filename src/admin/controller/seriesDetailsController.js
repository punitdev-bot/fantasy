const seriesDetailsServices = require("../services/seriesDetailsService");
const mongoose = require("mongoose");
const moment = require("moment");
const listMatchesModel = require("../../models/listMatchesModel");
const addSeriesModel = require("../../models/addSeriesModel");

class seriesDetailsController {
  constructor() {
    return {
      seriesDetails_Page: this.seriesDetails_Page.bind(this),
      getFullSeriesDataTable_Page: this.getFullSeriesDataTable_Page.bind(this),
      getSeries: this.getSeries.bind(this),
    };
  }
  async seriesDetails_Page(req, res, next) {
    try {
      res.locals.message = req.flash();
      let fantasy_type
      req.query.fantasy_type?fantasy_type =  req.query.fantasy_type: fantasy_type = "Cricket"
    

      const getseries = await seriesDetailsServices.seriesList(req,fantasy_type);
      let matchId = req.query.matchid;
      res.render("seriesDetails/fullSeriesdetail", {
        sessiondata: req.session.data,
        seriesData: getseries,
        matchId,
        fantasy_type,
      });
    } catch (error) {
      console.log("error", error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/");
    }
  }
  async getFullSeriesDataTable_Page(req, res, next) {
    // optimzed code
    try {
      const limit1 = req.query.length;
      const start = req.query.start;
      const fantasy_type = req.query.fantasy_type;
      const conditions = {
        series: mongoose.Types.ObjectId(req.query.seriesId),
        fantasy_type: fantasy_type,
      };

      const totalFiltered = await listMatchesModel.countDocuments(conditions).exec();
      const rows1 = await listMatchesModel
        .find(conditions)
        .populate("team1Id")
        .populate("team2Id")
        .populate("series")
        .skip(Number(start) ? Number(start) : undefined)
        .limit(Number(limit1) ? Number(limit1) : undefined)
        .sort({})
        .exec();

      const data = rows1.map((index, count) => {
        let actions = "";
        if (index.launch_status === "launched") {
          actions = `<span class="dtr-data"><a href="/allcontests/${index._id}?fantasy_type=${fantasy_type}" class="btn btn-sm text-uppercase btn-info"><i class="fas fa-eye"></i>&nbsp; View Contests</a></span>`;
        }

        return {
          count: count + 1,
          name: index.name,
          team1Id: index.team1Id.teamName,
          team2Id: index.team2Id.teamName,
          real_matchkey: index.real_matchkey,
          series: index.series.name,
          format: index.format,
          start_date: `<span class="font-weight-bold text-success">${moment(index.start_date).format("Do MMMM YYYY, HH:mm")}</span>`,
          status: index.status,
          launch_status: index.launch_status,
          final_status: index.final_status,
          squadstatus: index.squadstatus,
          action: actions,
        };
      });

      const json_data = JSON.stringify({
        recordsTotal: totalFiltered,
        recordsFiltered: totalFiltered,
        data: data,
      });
      res.send(json_data);
    } catch (error) {
      console.log("error", error);
    }

    // optimized code end
  }

  async getSeries(req, res, next) {
    // optimzed code
    console.log(req.query.fantasy_type)
    try {
      const fantasy_type = "Cricket";
      const conditions = {
        fantasy_type: fantasy_type,
      }

 const data = await addSeriesModel.find(conditions)

    
     await res.json({data});
    } catch (error) {
      console.log("error", error);
    }

   
  }
}
module.exports = new seriesDetailsController();
