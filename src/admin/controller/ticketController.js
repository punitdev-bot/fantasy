const ticketModel = require("../../models/TicketsModel")
const moment = require("moment");
class TicketController {
  constructor() {
    return {
      viewTickets: this.viewTickets.bind(this),
      viewTicketsTable: this.viewTicketsTable.bind(this),
      editTicket: this.editTicket.bind(this),
      editTicketData: this.editTicketData.bind(this),
    }
  }
  async viewTickets(req, res, next) {
    try {
      res.locals.message = req.flash();
      res.render("tickets/viewAllTickets", {
        sessiondata: req.session.data,
        queryData: {
          startdate: req.query.startdate,
          enddate: req.query.enddate,
          status: req.query.status,
          email: req.query.email,
          mobile: req.query.mobile,
          ticketid: req.query.ticketid,

        }
      });
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/view-all-players");
    }
  }
  async editTicket(req, res, next) {
    try {
      let ticket = await ticketModel.findById(req.query.id)
      console.log(ticket, 'ticket')
      res.locals.message = req.flash();
      res.render("tickets/editTicket", {
        sessiondata: req.session.data,
        data: ticket,
      });
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/view-all-players");
    }
  }


  async viewTicketsTable(req, res, next) {
    try {
      let limit1 = req.query.length;
      let start = req.query.start;
      let startdate = req.query.startdate;
      let enddate = req.query.enddate;
      let status = req.query.status;
      let email = req.query.email;
      let mobile = req.query.mobile;
      let ticketid = req.query.ticketid;
      
      if (startdate !== '') {
        startdate = startdate.split(" ")[0].replaceAll("/", "-");
      }
      if (enddate !== '') {
        enddate = enddate.split(" ")[0].replaceAll("/", "-");
      }
      let condition = [];

      if (status !== '') {
        condition.push({
          $match: {
            status: status
          }
        });
      }

      if (ticketid !== '') {
        condition.push({
          $match: {
            ticketid: ticketid
          }
        });
      }

      condition.push(
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            as: "user"
          }
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $project: {
            userid: 1,
            status: 1,
            subject: 1,
            message: 1,
            requestDate: 1,
            lastUpdate: 1,
            closeDate: 1,
            ticketid: 1,
            reply: 1,
            mobile: "$user.mobile",
            email: "$user.email",
            username: "$user.username"
          }
        }
      )


      if (email !== '') {
        condition.push({
          $match: {
            email: email
          }
        });
      }
      if (mobile !== '') {
        condition.push({
          $match: {
            mobile: mobile
          }
        });
      }
      if (startdate !== '') {
        condition.push({
          $match: {
            created: {
              $gte: new Date(startdate),
            }
          }
        });
      }
      if (enddate !== '') {
        condition.push({
          $match: {
            created: {
              $lte: new Date(enddate),
            }
          }
        });
      }
      ticketModel.aggregate(condition).exec((err, rows) => {
        if (err) {
          console.log(err, 'error >>>>>>>>>>>>>')
        }
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        let totelAmountofTDs = 0;

        ticketModel.aggregate(condition).exec(async (err, rows1) => {
          if (err) console.log(err);
          for (const index of rows1) {
            data.push({
              "count": count,
              "ticketid": index.ticketid,
              "userid": index.userid,
              "username": index.username,
              "mobile": index.mobile,
              "email": index.email,
              "status": index.status,
              "subject": index.subject,
              "message": index.message,
              "requestDate": index.requestDate,
              "lastUpdate": index.lastUpdate,
              "closeDate": index.closeDate,
              "reply": index.reply,
              "action": "<a href='/edit-ticket-page?id=" + index._id + "' class='btn btn-primary btn-sm'>View</a>"
            });
            count++;
          }

          let json_data = JSON.stringify({
            "recordsTotal": rows,
            "recordsFiltered": totalFiltered,
            "data": data,
            "totelAmountofTDs": totelAmountofTDs
          });

          res.send(json_data);
        });
      });
    } catch (error) {
      console.log(error)
    }
  }



  async editTicketData(req, res, next) {
    try {
      console.log(req.body);
      if (!req.body) {
        req.flash("error", "Something went wrong please try again");
        return res.redirect("/");
      }
      let obj = {};
      if (req.body.status) {
        obj.status = req.body.status;
        if (req.body.status == "complete") {
          obj.closeDate = moment().format("YYYY-MM-DD HH:mm:ss");
        }
      }
      if (req.body.reply) {
        obj.reply = req.body.reply;
      }
      obj.lastUpdate = moment().format("YYYY-MM-DD HH:mm:ss");

      try {
        const check = await ticketModel.findByIdAndUpdate(req.query.id, obj, { new: true });
        console.log(check, 'check');
        if (check) {
          req.flash("success", "Ticket updated successfully");
          return res.redirect("/tickets_page");
        } else {
          req.flash("error", "Something went wrong please try again");
          return res.redirect("/");
        }
      } catch (error) {
        console.log(error);
        req.flash("error", "Something went wrong please try again");
        return res.redirect("/");
      }
    } catch (error) {
      console.log(error);
      req.flash("error", "Something went wrong please try again");
      return res.redirect("/");
    }
  }
}
module.exports = new TicketController();