const moment = require("moment");

const teamsServices = require("../services/teamsServices");
const teamModel = require("../../models/teamModel");

class teamsController {
  constructor() {
    return {
      viewTeams: this.viewTeams.bind(this),
      teamsDataTable: this.teamsDataTable.bind(this),
      editTeam: this.editTeam.bind(this),
      edit_Team_Data: this.edit_Team_Data.bind(this),
      addTeamPage: this.addTeamPage.bind(this),
      addTeamData: this.addTeamData.bind(this),
    };
  }

  async viewTeams(req, res, next) {
    try {
      res.locals.message = req.flash();
      res.render("viewTeam/viewTeams", {
        sessiondata: req.session.data,
        teamName: req.query.teamName,
        fantasy_type: req.query.fantasy_type,
      });
    } catch (error) {
      req.flash("error", "something is wrong please try again later");
      res.redirect("/");
    }
  }

  async teamsDataTable(req, res, next) {
    try {
      let limit1 = req.query.length;
      let start = req.query.start;
      let fantasy_type = req.query.fantasy_type;
      let sortObject = {},
        dir,
        join;
      let conditions = {};
      if (req.query.teamName) {
        conditions.teamName = {
          $regex: new RegExp("^" + req.query.teamName.toLowerCase(), "i"),
        };
      }
      if (req.query.fantasy_type) {
        conditions.fantasy_type = req.query.fantasy_type;
      }
      teamModel.countDocuments(conditions).exec((err, rows) => {
        // console.log("rows....................",rows)
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        teamModel
          .find(conditions)
          .skip(Number(start) ? Number(start) : "")
          .limit(Number(limit1) ? Number(limit1) : "")
          .exec((err, rows1) => {
            if (err) console.log(err);
            rows1.forEach((index) => {
              let logo;
              if (index.logo) {
                logo = `<img src="${index.logo}" class="w-40px view_team_table_images h-40px rounded-pill">`;
              } else {
                logo = `<img src="/team_image.png" class="w-40px view_team_table_images h-40px rounded-pill">`;
              }
              data.push({
                count: count,
                teamName: index.teamName,
                short_name: index.short_name,
                logo: logo,
                Action: `<a href="/edit-Team/${index._id}" class="btn btn-sm btn-orange w-35px h-35px text-uppercase text-nowrap" data-toggle="tooltip" title="Edit"><i class="fad fa-pencil"></i></a>`,
              });
              count++;

              if (count > rows1.length) {
                let json_data = JSON.stringify({
                  recordsTotal: rows,
                  recordsFiltered: totalFiltered,
                  data: data,
                });
                res.send(json_data);
              }
            });
          });
      });
    } catch (error) { }
  }

  async editTeam(req, res, next) {
    try {
      res.locals.message = req.flash();
      const data = await teamsServices.editTeam(req);
      if (data) {
        res.render("viewTeam/editTeam", {
          sessiondata: req.session.data,
          msg: undefined,
          data,
        });
      }
    } catch (error) {
      req.flash("error", "something is wrong please try again later");
      res.redirect("/view-teams");
    }
  }

  async edit_Team_Data(req, res, next) {
    try {
      const data = await teamsServices.edit_Team_Data(req);

      if (data.status == true) {
        req.flash("success", data.message);
        res.redirect("/view-teams");
      }
      if (data.status == false) {
        req.flash("error", data.message);
        return res.redirect(`/edit-Team/${req.params.id}`);
      }
    } catch (error) {
      req.flash("error", "something is wrong please try again later");
      res.redirect("/view-teams");
    }
  }
  async addTeamPage(req, res, next) {
    try {
      res.locals.message = req.flash();
      res.render("viewTeam/addTeam", {
        sessiondata: req.session.data,
        msg: undefined,
      });
    } catch (error) {
      console.log(error);
    }
  }
  async addTeamData(req, res, next) {
    try {
      let data = await teamsServices.addTeamData(req);
      if (data.status) {
        req.flash("success", data.message);
        res.redirect("/add_team_page");
      } else {
        req.flash("error", data.message);
        res.redirect("/add_team_page");
      }
    } catch (error) {
      console.log(error);
      req.flash("error", "soething wrong please try again letter");
    }
  }
}
module.exports = new teamsController();
