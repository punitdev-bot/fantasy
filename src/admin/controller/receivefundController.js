const pointServices = require("../services/pointService");
const mongoose = require("mongoose");
const paymentprocessModel = require("../../models/PaymentProcessModel");
const depositModel = require("../../models/depositModel");
const moment = require("moment");
const constant = require("../../config/const_credential");
class receivefundController {
  constructor() {
    return {
      viewallReceiveFund: this.viewallReceiveFund.bind(this),
      viewAllReceiveFundDatatable: this.viewAllReceiveFundDatatable.bind(this),
    };
  }
  async viewallReceiveFund(req, res, next) {
    try {
      res.locals.message = req.flash();
      const { status, apd_date, req_date, email, mobile } = req.query;
      res.render("receiveFund/viewAllReceiveFund", {
        pending: req.query,
        sessiondata: req.session.data,
        selectQuery: status,
        emailValue: email,
        mobileNo: mobile,
        req_date: req_date,
        apd_date: apd_date,
      });
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/");
    }
  }
  // async viewAllReceiveFundDatatable(req, res, next) {
  //   try {
  //     let pipeline = [];
  //     pipeline.push({
  //       $lookup: {
  //         from: "users",
  //         localField: "userId",
  //         foreignField: "_id",
  //         as: "userdata",
  //       },
  //     });
  //     pipeline.push({
  //       $unwind: {
  //         path: "$userdata",
  //       },
  //     });
  //     pipeline.push({
  //       $project: {
  //         _id: 1,
  //         amount: 1,
  //         image: 1,
  //         comment: 1,
  //         userTransactionId:1,
  //         userId: 1,
  //         approveDate: 1,
  //         status: 1,
  //         status: 1,
  //         paytm_number: 1,
  //         username: "$userdata.username",
  //         email: "$userdata.email",
  //         mobile: "$userdata.mobile",
  //         Requested_Date: {
  //           $dateToString: {
  //             format: "%Y-%m-%d %H-%M",
  //             date: "$createdAt",
  //           },
  //         }
  //       },
  //     });
  //     if (req.query.email) {
  //       pipeline.push({
  //         $match: {
  //           email: { $regex: new RegExp(req.query.email.toLowerCase(), "i") },
  //         },
  //       });
  //     }
  //     if (req.query.mobile) {
  //       pipeline.push({
  //         $match: { mobile: Number(req.query.mobile) },
  //       });
  //     }
  //     if (req.query.apd_date) {
  //       let datestring = moment(req.query.apd_date).format("YYYY-MM-DD");
  //       pipeline.push({
  //         $match: { approveDate: datestring },
  //       });
  //     }
  //     if (req.query.req_date) {
  //       let datestring = moment(req.query.req_date).format("YYYY-MM-DD");
  //       pipeline.push({
  //         $match: { Requested_Date: datestring },
  //       });
  //     }
  //     if (req.query.status) {
  //       pipeline.push({
  //         $match: { status: req.query.status },
  //       });
  //     }
  //     depositModel.countDocuments(pipeline).exec((err, rows) => {
  //       let totalFiltered = rows;
  //       let data = [];
  //       let count = 1;
  //       depositModel.aggregate(pipeline).exec((err, rows1) => {
  //         rows1.forEach((index) => {
  //           let newappenField;
  //           let appendDate;
  //           let appendAmount;
  //           console.log("hhhhhhj", index.approveDate);
  //           if (index.approveDate) {
  //             appendDate = `<span class="text-success">${moment(
  //               index.approveDate
  //             ).format("YYYY-MM-DD")}</span>`;
  //           } else {
  //             appendDate = `<span class="text-danger">Not Approved Yet</span>`;
  //           }
  //           data.push({
  //             S_NO: count,
  //             user_Name: index.username,
  //             amount: index.amount || "",
  //             image: `<img src="${constant.BASE_URL}${index.image}"  class="w-40px view_team_table_images h-40px rounded-pill"/>` || "",
  //             Requested_Date: `<span class="text-warning">${moment(
  //               index.Requested_Date
  //             ).format("YYYY-MM-DD HH:mm")}</span>`,
  //             Email: index.email || "",
  //             app_rej_Date: appendDate,
  //             Mobile: index.mobile || "",
  //             userTransactionId:index.userTransactionId,
  //             Admin_Comment: index.comment || "",
  //             status_description: index.status,
  //           });
  //           count++;
  //           if (count > rows1.length) {
  //             let json_data = JSON.stringify({ data });
  //             res.send(json_data);
  //           }
  //         });
  //       });
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }


  async viewAllReceiveFundDatatable(req, res, next) {
    try {
      let pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userid",
            foreignField: "_id",
            as: "userdata",
          },
        }, {
          $unwind: {
            path: "$userdata",
          },
        },
        {
          $project: {
            _id: 1,
            amount: 1,
            paymentmethod: 1,
            offerid: 1,
            userid: 1,
            txnid: 1,
            status: 1,
            orderid: 1,
            username: "$userdata.username",
            email: "$userdata.email",
            mobile: "$userdata.mobile",
            userBalance: "$userdata.userbalance.balance",
            userBonus: "$userdata.userbalance.bonus",
            userWinning: "$userdata.userbalance.winning",
            createdAt: 1,
          },

        },
        {
          $sort: {
            createdAt: -1
          }
        }


      ];

      paymentprocessModel.countDocuments(pipeline).exec((err, rows) => {
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        paymentprocessModel.aggregate(pipeline).exec((err, rows1) => {
          rows1.forEach((index) => {
            console.log(index)
            let appendDate;
            data.push({
              S_NO: count,
              user_Name: index.username,
              amount: index.amount || "",
              OfferId: index.offerid || "",
              Payment_Method: index.paymentmethod || "",
              Email: index.email || "",
              createdAt: moment(index.createdAt).format('DD-MM-YYYY, h:mm:ss a'),
              Mobile: index.mobile || "",
              userTransactionId: index.orderid,
              Admin_Comment: index.comment || "",
              status_description: index.status,
            });
            count++;
            if (count > rows1.length) {
              let json_data = JSON.stringify({ data });
              res.send(json_data);
            }
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }
}
module.exports = new receivefundController();
