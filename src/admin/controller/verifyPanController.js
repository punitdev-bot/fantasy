const moment = require("moment");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const verificationServices = require("../services/verificationServices");
const userModel = require("../../models/userModel");
const constant = require("../../config/const_credential");
const withdrawModel = require("../../models/withdrawModel");
const depositModel = require("../../models/depositModel");
const excel = require("exceljs");
const Mail = require("../../utils/mail");

class verifyManagerController {
  constructor() {
    return {
      verifyPan: this.verifyPan.bind(this),
      verifyAadhar: this.verifyAadhar.bind(this),
      verifyBank_Datatable: this.verifyBank_Datatable.bind(this),
      verifyBank: this.verifyBank.bind(this),
      withdrawalAmount: this.withdrawalAmount.bind(this),
      viewBank_Details: this.viewBank_Details.bind(this),
      editBank_Details: this.editBank_Details.bind(this),
      update_Bank_Details: this.update_Bank_Details.bind(this),
      Update_Credentials_Bank: this.Update_Credentials_Bank.bind(this),
      verifyPan_Datatable: this.verifyPan_Datatable.bind(this),
      verifyAadhar_Datatable: this.verifyAadhar_Datatable.bind(this),
      viewPan_Details: this.viewPan_Details.bind(this),
      viewAadhar_Details: this.viewAadhar_Details.bind(this),
      update_Pan_Details: this.update_Pan_Details.bind(this),
      update_Aadhar_Details: this.update_Aadhar_Details.bind(this),
      editPan_Details: this.editPan_Details.bind(this),
      editAadhar_Details: this.editAadhar_Details.bind(this),
      Update_Credentials_Pan: this.Update_Credentials_Pan.bind(this),
      Update_Credentials_Aadhar: this.Update_Credentials_Aadhar.bind(this),
      withdraw_amount_datatable2: this.withdraw_amount_datatable2.bind(this),
      approve_withdraw_request: this.approve_withdraw_request.bind(this),
      mannual_withdraw_request: this.mannual_withdraw_request.bind(this),
      reject_withdraw_request: this.reject_withdraw_request.bind(this),
      viewallkyc: this.viewallkyc.bind(this),
      viewallkyc_Datatable: this.viewallkyc_Datatable.bind(this),
      viewKyc_Details: this.viewKyc_Details.bind(this),
      update_Kyc_Details: this.update_Kyc_Details.bind(this),
      editKyc_Details: this.editKyc_Details.bind(this),
      Update_Credentials_Kyc: this.Update_Credentials_Kyc.bind(this),

      // downloads
      downloadPanVerify: this.downloadPanVerify.bind(this),
      downloadallbankVerify: this.downloadallbankVerify.bind(this),
      downloadallwithdrawalrequest:
        this.downloadallwithdrawalrequest.bind(this),
      widthdrowWebhook: this.widthdrowWebhook.bind(this),
      deposit_amount_datatable: this.deposit_amount_datatable.bind(this),
      approve_deposit_request: this.approve_deposit_request.bind(this),
      reject_deposit_request: this.reject_deposit_request.bind(this),
      depositAmount: this.depositAmount.bind(this),
    };
  }

  async verifyPan(req, res, next) {
    try {
      res.locals.message = req.flash();
      const { name, status, email, mobile } = req.query;
      res.render("verify/verifypan", {
        pending: req.query,
        sessiondata: req.session.data,
        selectQuery: status,
        Name: name,
        emailValue: email,
        mobileNo: mobile,
      });
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/");
    }
  }
  async verifyAadhar(req, res, next) {
    try {
      res.locals.message = req.flash();
      const { name, status, email, mobile } = req.query;
      res.render("verify/verifyaadhar", {
        pending: req.query,
        sessiondata: req.session.data,
        selectQuery: status,
        Name: name,
        emailValue: email,
        mobileNo: mobile,
      });
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/");
    }
  }

  async verifyPan_Datatable(req, res, next) {
    try {
      let limit1 = req.query.length;
      let start = req.query.start;
      let sortObject = {},
        dir,
        join,
        conditions = {};
      let name;
      conditions["user_verify.pan_verify"] = 0;
      if (req.query.email) {
        conditions.email = {
          $regex: new RegExp(req.query.email.toLowerCase(), "i"),
        };
      }
      if (req.query.mobile) {
        conditions.mobile = Number(req.query.mobile);
      }
      if (req.query.name) {
        const data = req.query.name.toUpperCase();
        conditions["pancard.pan_name"] = { $regex: data };
      }
      if (req.query.status) {
        conditions["user_verify.pan_verify"] = req.query.status;
      }

      userModel.countDocuments(conditions).exec((err, rows) => {
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        userModel
          .find(conditions)
          .skip(Number(start) ? Number(start) : "")
          .limit(Number(limit1) ? Number(limit1) : "")
          .sort(sortObject)
          .exec((err, rows1) => {
            if (err) console.log(err);
            rows1.forEach((index) => {
              let PanVerfication = index.user_verify.pan_verify;
              let appendField;
              if (PanVerfication == 0) {
                appendField = `<span class="text-warning">Pending</span>`;
              } else if (PanVerfication == 1) {
                appendField = `<span class="text-success">Verified</span>`;
              } else {
                appendField = `<span class="text-danger">cancelled</span>`;
              }
              data.push({
                S_NO: count,
                UID: `<a href="/getUserDetails/${index._id}">${index._id}</a>`,
                Name: index.pancard?.pan_name || "",
                Email: index.email,
                Mobile_No: index.mobile || "",
                DOB: index.pancard.pan_dob || "",
                PAN_Number: index.pancard?.pan_number || "",
                Image: `<a href="/${index.pancard.image}" target="_blank"><img src="${index.pancard.image}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                status: appendField,
                Comment: index.pancard.comment || "",
                Uploading_Date: `<span class="text-danger">${moment(
                  index.pancard.created_at
                ).format("YYYY-MM-DD HH:mm")}</span>`,
                Action: `<a href= "/viewpandetails/${index._id}"><i class="fas fa-2x fa-eye custom"></i></a>`,
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
    } catch (error) {
      next(error);
    }
  }
  async verifyAadhar_Datatable(req, res, next) {
    try {
      let limit1 = req.query.length;
      let start = req.query.start;
      let sortObject = {},
        dir,
        join,
        conditions = {};
      let name;
      conditions["user_verify.aadhar_verify"] = 0;
      if (req.query.email) {
        conditions.email = {
          $regex: new RegExp(req.query.email.toLowerCase(), "i"),
        };
      }
      if (req.query.mobile) {
        conditions.mobile = Number(req.query.mobile);
      }
      if (req.query.name) {
        const data = req.query.name.toUpperCase();
        conditions["aadharcard.aadhar_name"] = { $regex: data };
      }
      if (req.query.status) {
        conditions["user_verify.aadhar_verify"] = req.query.status;
      }

      userModel.countDocuments(conditions).exec((err, rows) => {
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        userModel
          .find(conditions)
          .skip(Number(start) ? Number(start) : "")
          .limit(Number(limit1) ? Number(limit1) : "")
          .sort(sortObject)
          .exec((err, rows1) => {
            if (err) console.log(err);
            rows1.forEach((index) => {
              let AadharVerfication = index.user_verify.aadhar_verify;
              let appendField;
              if (AadharVerfication == 0) {
                appendField = `<span class="text-warning">Pending</span>`;
              } else if (AadharVerfication == 1) {
                appendField = `<span class="text-success">Verified</span>`;
              } else {
                appendField = `<span class="text-danger">cancelled</span>`;
              }
              data.push({
                S_NO: count,
                Name: index.aadharcard.aadhar_name || "",
                Email: index.email,
                Mobile_No: index.mobile || "",
                AADHAR_Number: index.aadharcard.aadhar_number || "",
                state: index.aadharcard.state || "",
                FrontImage: `<a href="/${index.aadharcard.frontimage}" target="_blank"><img src="${index.aadharcard.frontimage}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                BackImage: `<a href="/${index.aadharcard.backimage}" target="_blank"><img src="${index.aadharcard.backimage}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                status: appendField,
                Comment: index.aadharcard.comment || "No Comment",
                Uploading_Date: `<span class="text-danger">${moment(
                  index.aadharcard.created_at
                ).format("YYYY-MM-DD HH:mm")}</span>`,
                Action: `<a href= "/viewaadhardetails/${index._id}"><i class="fas fa-2x fa-eye custom"></i></a>`,
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
    } catch (error) {
      next(error);
    }
  }

  async viewPan_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      const viewUser = await verificationServices.viewPan_Details(req);
      if (viewUser.status == true) {
        res.render("verify/viewPanDetails", {
          sessiondata: req.session.data,
          viewUser: viewUser.data,
          baseUrl: constant.BASE_URL,
        });
      }
    } catch (error) {
      req.flash("error", "something went wrong");
      res.redirect("/viewallkyc");
    }
  }
  async viewKyc_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      const viewUser = await verificationServices.viewKyc_Details(req);
      if (viewUser.status == true) {
        res.render("verify/viewKycDetails", {
          sessiondata: req.session.data,
          viewUser: viewUser.data,
          baseUrl: constant.BASE_URL,
        });
      }
    } catch (error) {
      req.flash("error", "something went wrong");
      res.redirect("/viewallkyc");
    }
  }
  async viewAadhar_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      console.log("res.locals.message", res.locals.message)
      const viewUser = await verificationServices.viewAadhar_Details(req);
      if (viewUser.status == true) {
        res.render("verify/viewAadharDetails", {
          sessiondata: req.session.data,
          viewUser: viewUser.data,
          baseUrl: constant.BASE_URL,
        });
      }
    } catch (error) {
      console.log("error", error)
      req.flash("error", "something went wrong");
      res.redirect("/viewallkyc");
    }
  }

  async update_Pan_Details(req, res, next) {
    try {
      const updatePan = await verificationServices.update_Pan_Details(req);
      let customMessage = (type, text) => req.flash(type, text);
      if (updatePan.status == true) {
        if (updatePan.data.idProof.status == 2) {
          const mail = new Mail(updatePan.data.email);
          await mail.sendMail(
            mail.email,
            `Dear User,

We appreciate your interest in obtaining a PAN card and thank you for choosing fantasyApp to assist with your application.

After a thorough review, we regret to inform you that your PAN card request has not met certain requirements and has been declined at this time. Below, we have provided details regarding the reason(s) for this decision:

Rejection Reason:

${updatePan.data.idProof.comment}
To proceed with a new application, please ensure that all documents meet the necessary criteria as per the guidelines. You may refer to our documentation guidelines for more information on the required documents and correct formats.

If you have any questions regarding this notification or need further assistance, please feel free to contact our support team at support.fantasyApp.in.

Thank you for your understanding and cooperation.

Best regards,`,
            `🚫  PAN Card Request Rejection Action Needed`
          );
          customMessage(
            "success",
            `Successfully Reject request`

          );
        }
        if (updatePan.data.idProof.status == 1) {
          const mail = new Mail(updatePan.data.email);
          await mail.sendMail(
            mail.email,
            `Dear User,

Congratulations! We are pleased to inform you that your PAN card application has been successfully approved.
Thank you for choosing fantasyApp for your PAN card application needs. We’re glad to have been of service!

Best regards,`,
            `PAN Card Request Approved`
          );
          customMessage(
            "success",
            `Successfully Activated request`
          );
        }
        console.log("req.flash", req.flash())
        res.redirect(`/viewpandetails/${updatePan.data._id}`);
      } else {
        req.flash("warning", "please try again");
        res.redirect("/viewallkyc");
      }
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }
  async update_Kyc_Details(req, res, next) {
    try {
      const updatePan = await verificationServices.update_Kyc_Details(req);
      let customMessage = (type, text) => req.flash(type, text);
      if (updatePan.status == true) {
        if (updatePan.data.idProof.status == 2) {
          customMessage(
            "success",
            `Successfully Reject request`
          );
        }
        if (updatePan.data.idProof.status == 1) {
          customMessage(
            "success",
            `Successfully Activated request`
          );
        }
        console.log("req.flash", req.flash())
        res.redirect(`/viewkycdetails/${updatePan.data._id}`);
      } else {
        req.flash("warning", "please try again");
        res.redirect("/viewallkyc");
      }
    } catch (error) {
      // next(error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }
  async update_Aadhar_Details(req, res, next) {
    try {
      const updateAadhar = await verificationServices.update_Aadhar_Details(req);
      console.log("updateAadhar", updateAadhar)
      let customMessage = (type, text) => req.flash(type, text);
      if (updateAadhar.status == true) {
        if (updateAadhar.data.idProof.status == 2) {
          customMessage(
            "success",
            `Successfully Reject request`
          );
        }
        if (updateAadhar.data.idProof.status == 1) {
          customMessage(
            "success",
            `Successfully Activated request`
          );
        }
        console.log("req.flash", req.flash())
        res.redirect(`/viewaadhardetails/${updateAadhar.data._id}`);
      } else {
        req.flash("warning", "please try again");
        res.redirect("/viewallkyc");
      }
    } catch (error) {
      console.log("error", error)
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }

  async editPan_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      const editUser = await verificationServices.editPan_Details(req);
      if (editUser.status == true) {
        res.render("verify/editPanDetails", {
          sessiondata: req.session.data,
          editUser: editUser.data,
        });
      }
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }
  async editKyc_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      const editUser = await verificationServices.editKyc_Details(req);
      if (editUser.status == true) {
        res.render("verify/editPanDetails", {
          sessiondata: req.session.data,
          editUser: editUser.data,
        });
      }
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }
  async editAadhar_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      const editUser = await verificationServices.editAadhar_Details(req);
      console.log("editUser.data", editUser.data)
      if (editUser.status == true) {
        res.render("verify/editAadharDetails", {
          sessiondata: req.session.data,
          editUser: editUser.data,
        });
      }
    } catch (error) {
      console.log("error", error)
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }


  async Update_Credentials_Pan(req, res, next) {
    try {
      const updatePan = await userModel.findOneAndUpdate(
        { _id: req.body.userid },
        {
          $set: {
            "idProof.status": req.body.status,
            "user_verify.pan_verify": req.body.status,
            "idProof.comment": req.body.comment || "",
          },
        },
        { new: true }
      );
      let customMessage = (type, text) => req.flash(type, text);
      if (updatePan.idProof.status === 2) {
        customMessage(
          "success",
          `Successfully Reject request`
        );
      }
      if (updatePan.idProof.status == 1) {
        customMessage(
          "success",
          `Successfully Activated request`
        );
      }
      console.log("req.flash", req.flash())
      res.redirect(`/viewpandetails/${updatePan._id}`);
    } catch (error) {
      // next(error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }
  async Update_Credentials_Kyc(req, res, next) {
    try {
      const updatePan = await userModel.findOneAndUpdate(
        { _id: req.body.userid },
        {
          $set: {
            "idProof.status": req.body.status,
            "user_verify.voter_verify": req.body.status,
            "idProof.comment": req.body.comment || "",
          },
        },
        { new: true }
      );
      let customMessage = (type, text) => req.flash(type, text);
      if (updatePan.idProof.status === 2) {
        customMessage(
          "success",
          `Successfully Reject request`
        );
      }
      if (updatePan.idProof.status == 1) {
        customMessage(
          "success",
          `Successfully Activated request`
        );
      }
      console.log("req.flash", req.flash())
      res.redirect(`/viewkycdetails/${updatePan._id}`);
    } catch (error) {
      // next(error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/verifykyc");
    }
  }
  async Update_Credentials_Aadhar(req, res, next) {
    try {
      console.log("req.body", req.body)
      console.log("req.body.status", req.body.status ? req.body.status : 0)
      const updateAadhar = await userModel.findOneAndUpdate(
        { _id: req.body.userid },
        {
          $set: {
            "idProof.status": req.body.status ? req.body.status : 0,
            "user_verify.aadhar_verify": req.body.status ? req.body.status : 0,
            "idProof.comment": req.body.comment || ""
          },
        },
        { new: true }
      );
      let customMessage = (type, text) => req.flash(type, text);
      if (updateAadhar.idProof.status === 2) {
        customMessage(
          "success",
          `Successfully Reject request`
        );
      }
      if (updateAadhar.idProof.status == 1) {
        customMessage(
          "success",
          `Successfully Activated request`
        );
      }
      console.log("req.flash", req.flash())
      res.redirect(`/viewaadhardetails/${updateAadhar._id}`);
    } catch (error) {
      console.log("error", error)
      // next(error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/viewallkyc");
    }
  }


  async verifyBank(req, res, next) {
    try {
      res.locals.message = req.flash();
      const { mobile, email, name, status } = req.query;
      res.render("verify/verifybank", {
        pending: req.query,
        sessiondata: req.session.data,
        selectQuery: status,
        Name: name,
        emailValue: email,
        mobileNo: mobile,
      });
    } catch (error) {
      // next(error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/");
    }
  }






  async verifyBank_Datatable(req, res, next) {
    try {
      let limit1 = req.query.length;
      let start = req.query.start;
      let sortObject = {},
        dir,
        join,
        conditions = {};
      let name;
      conditions["user_verify.bank_verify"] = 0;
      if (req.query.email) {
        conditions.email = {
          $regex: new RegExp(req.query.email.toLowerCase(), "i"),
        };
      }
      if (req.query.mobile) {
        conditions.mobile = Number(req.query.mobile);
      }
      if (req.query.name) {
        const data = req.query.name.toUpperCase();
        conditions["bank.accountholder"] = { $regex: data };
      }
      if (req.query.status) {
        conditions["user_verify.bank_verify"] = req.query.status;
      }

      userModel.countDocuments(conditions).exec((err, rows) => {
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        userModel
          .find(conditions)
          .skip(Number(start) ? Number(start) : "")
          .limit(Number(limit1) ? Number(limit1) : "")
          .sort(sortObject)
          .exec((err, rows1) => {
            if (err) console.log(err);
            rows1.forEach((index) => {
              let panVerfication = index.user_verify.bank_verify;
              let appendField;
              if (panVerfication == 0) {
                appendField = `<span class="text-warning">Pending</span>`;
              } else if (panVerfication == 1) {
                appendField = `<span class="text-success">Verified</span>`;
              } else {
                appendField = `<span class="text-danger">canceled</span>`;
              }
              console.log(
                "index.bank.accountholder" + index.bank?.accountholder
              );
              data.push({
                S_NO: count,
                UID: `<a href="/getUserDetails/${index._id}">${index._id}</a>`,
                Name: index.bank?.accountholder || "",
                Email: index.email || "",
                Mobile_No: index.mobile || "",
                Account_No: index.bank?.accno || "",
                IFSC_Code: index.bank?.ifsc || "",
                Bank_Name: index.bank?.bankname || "",
                Branch: index.bank?.bankbranch || "",
                State: index.bank?.state || "",
                Image: `<a href="${index.bank?.image}" target="_blank"><img src="${constant.BASE_URL}${index.bank?.image}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                Status: appendField,
                Uploading_Date: `<span class="text-danger">${moment(
                  index.bank?.created_at
                ).format("YYYY-MM-DD HH:mm")}</span>`,
                action: `<a href= "/viewbankdetails/${index._id}"><i class="fas fa-2x fa-eye custom"></i></a>`,
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
    } catch (error) {
      next(error);
    }
  }



  async viewallkyc(req, res, next) {
    try {
      res.locals.message = req.flash();
      const { name, status, email, mobile, category } = req.query;
      res.render("verify/verifypan", {
        pending: req.query,
        sessiondata: req.session.data,
        selectQuery: status,
        Name: name,
        emailValue: email,
        mobileNo: mobile,
        category: category
      });
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/");
    }
  }


  async viewallkyc_Datatable(req, res, next) {
    try {
      let limit1 = req.query.length;
      let start = req.query.start;
      console.log("req.query.category", req.query.category)
      let sortObject = {},
        dir,
        join,
        conditions = {};
      let name;
      if (req.query.category == "PAN") {
        console.log("1")
        // if (req.query.category) {
        //   conditions["idProof.type"] = req.query.category;
        // }


        conditions["user_verify.pan_verify"] = 0;
        if (req.query.email) {
          conditions.email = {
            $regex: new RegExp(req.query.email.toLowerCase(), "i"),
          };
        }
        if (req.query.mobile) {
          conditions.mobile = Number(req.query.mobile);
        }
        if (req.query.status) {
          conditions["user_verify.pan_verify"] = Number(req.query.status);
        }
        console.log("conditions", conditions)

        userModel.countDocuments(conditions).exec((err, rows) => {

          let totalFiltered = rows;
          let data = [];
          let count = 1;
          userModel
            .find(conditions)
            .skip(Number(start) ? Number(start) : "")
            .limit(Number(limit1) ? Number(limit1) : "")
            .sort(sortObject)
            .exec((err, rows1) => {
              if (err) console.log(err);
              rows1.forEach((index) => {
                let PanVerfication = index.user_verify.pan_verify;
                let appendField;
                if (PanVerfication == 0) {
                  appendField = `<span class="text-warning">Pending</span>`;
                } else if (PanVerfication == 1) {
                  appendField = `<span class="text-success">Verified</span>`;
                } else {
                  appendField = `<span class="text-danger">cancelled</span>`;
                }
                data.push({
                  S_NO: count,
                  UID: `<a href="/getUserDetails/${index._id}">${index._id}</a>`,
                  Email: index.email,
                  Mobile_No: index.mobile || "",
                  FrontImage: `<a href="${constant.BASE_URL}${index.pancard.image}" target="_blank"><img src="${constant.BASE_URL}${index.pancard.image}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                  // BackImage: `<a href="${constant.BASE_URL}/IdProof/${index.idProof.backImage}" target="_blank"><img src="${constant.BASE_URL}/IdProof/${index.idProof.backImage}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                  status: appendField,
                  Comment: index.idProof.comment || "",
                  Uploading_Date: `<span class="text-danger">${moment(
                    index.idProof.created_at
                  ).format("YYYY-MM-DD HH:mm")}</span>`,
                  Action: `<a href= "/viewpandetails/${index._id}"><i class="fas fa-2x fa-eye custom"></i></a>`,
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
      }
      else if (req.query.category == "aadharcard") {
        console.log("2")


        if (req.query.category) {
          conditions["idProof.type"] = req.query.category;
        }

        conditions["user_verify.aadhar_verify"] = 0;
        if (req.query.email) {
          conditions.email = {
            $regex: new RegExp(req.query.email.toLowerCase(), "i"),
          };
        }
        if (req.query.mobile) {
          conditions.mobile = Number(req.query.mobile);
        }
        if (req.query.status) {
          conditions["user_verify.aadhar_verify"] = Number(req.query.status);
        }
        console.log("conditions", conditions)

        userModel.countDocuments(conditions).exec((err, rows) => {
          let totalFiltered = rows;
          let data = [];
          let count = 1;
          userModel
            .find(conditions)
            .skip(Number(start) ? Number(start) : "")
            .limit(Number(limit1) ? Number(limit1) : "")
            .sort(sortObject)
            .exec((err, rows1) => {
              if (err) console.log(err);
              rows1.forEach((index) => {
                let PanVerfication = index.user_verify.voter_verify;
                let appendField;
                if (PanVerfication == 0) {
                  appendField = `<span class="text-warning">Pending</span>`;
                } else if (PanVerfication == 1) {
                  appendField = `<span class="text-success">Verified</span>`;
                } else {
                  appendField = `<span class="text-danger">cancelled</span>`;
                }
                data.push({
                  S_NO: count,
                  UID: `<a href="/getUserDetails/${index._id}">${index._id}</a>`,
                  Email: index.email,
                  Mobile_No: index.mobile || "",
                  FrontImage: `<a href="/${index.idProof.frontImage}" target="_blank"><img src="${index.idProof.image}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                  BackImage: `<a href="/${index.idProof.backImage}" target="_blank"><img src="${index.idProof.image}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                  status: appendField,
                  Comment: index.idProof.comment || "",
                  Uploading_Date: `<span class="text-danger">${moment(
                    index.idProof.created_at
                  ).format("YYYY-MM-DD HH:mm")}</span>`,
                  Action: `<a href= "/viewaadhardetails/${index._id}"><i class="fas fa-2x fa-eye custom"></i></a>`,
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
      }
      else {
        console.log("3")
        console.log("req.query.category--->", req.query.category)
        if (req.query.category) {
          conditions["idProof.type"] = req.query.category;
        }

        conditions["user_verify.voter_verify"] = 0;
        if (req.query.email) {
          conditions.email = {
            $regex: new RegExp(req.query.email.toLowerCase(), "i"),
          };
        }
        if (req.query.mobile) {
          conditions.mobile = Number(req.query.mobile);
        }
        if (req.query.status) {
          conditions["user_verify.voter_verify"] = Number(req.query.status);
        }
        console.log("conditions", conditions)

        userModel.countDocuments(conditions).exec((err, rows) => {
          let totalFiltered = rows;
          let data = [];
          let count = 1;
          userModel
            .find(conditions)
            .skip(Number(start) ? Number(start) : "")
            .limit(Number(limit1) ? Number(limit1) : "")
            .sort(sortObject)
            .exec((err, rows1) => {
              if (err) console.log(err);
              rows1.forEach((index) => {
                let PanVerfication = index.user_verify.voter_verify;
                let appendField;
                if (PanVerfication == 0) {
                  appendField = `<span class="text-warning">Pending</span>`;
                } else if (PanVerfication == 1) {
                  appendField = `<span class="text-success">Verified</span>`;
                } else {
                  appendField = `<span class="text-danger">cancelled</span>`;
                }
                data.push({
                  S_NO: count,
                  UID: `<a href="/getUserDetails/${index._id}">${index._id}</a>`,
                  // Name: index.pancard.pan_name || "",
                  Email: index.email,
                  Mobile_No: index.mobile || "",
                  FrontImage: `<a href="/${index.idProof.frontImage}" target="_blank"><img src="${index.idProof.image}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                  BackImage: `<a href="/${index.idProof.backImage}" target="_blank"><img src="${index.idProof.image}" class="w-40px view_team_table_images h-40px rounded-pill"></img></a>`,
                  status: appendField,
                  Comment: index.idProof.comment || "",
                  Uploading_Date: `<span class="text-danger">${moment(
                    index.idProof.created_at
                  ).format("YYYY-MM-DD HH:mm")}</span>`,
                  Action: `<a href= "/viewkycdetails/${index._id}"><i class="fas fa-2x fa-eye custom"></i></a>`,
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
      }
    } catch (error) {
      next(error);
    }
  }

  async viewBank_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      const findUser = await verificationServices.viewBank_Details(req);
      if (findUser.status == true) {
        res.render("verify/viewBankDetails", {
          sessiondata: req.session.data,
          viewUser: findUser.data,
          baseUrl: constant.BASE_URL,
        });
      }
    } catch (error) {
      // next(error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/verifybankaccount");
    }
  }

  async editBank_Details(req, res, next) {
    try {
      res.locals.message = req.flash();
      const editUser = await verificationServices.editBank_Details(req);
      if (editUser.status == true) {
        res.render("verify/editBankDetails", {
          sessiondata: req.session.data,
          editUser: editUser.data,
        });
      }
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/verifybankaccount");
    }
  }

  async update_Bank_Details(req, res, next) {
    try {
      const updateBank = await verificationServices.update_Bank_Details(req);
      let customMessage = (type, text) => req.flash(type, text);
      if (updateBank.status == true) {
        if (updateBank.data.bank.status === 2) {
          const mail = new Mail(updateBank.data.email);
          await mail.sendMail(
            mail.email,
            `Dear User,
              We regret to inform you that the bank details you provided have not been accepted due to ${updateBank.data.bank.comment}.

To ensure a smooth transaction process, we kindly request that you re-submit accurate bank information as soon as possible. Please verify the following details:

Account Holder's Name : ${updateBank.data.bank.accountholder}
Account Number : ${updateBank.data.bank.accno}
Bank Branch Code / IFSC : ${updateBank.data.bank.ifsc}

If you have any questions or need assistance, please feel free to reach out to our support team at support.fantasyApp.in.

Thank you for your attention to this matter.

Best regards,
`,
            `🚫Bank Details Rejection`
          );
          customMessage(
            "success",
            `Successfully Reject request of ${updateBank.data.bank.accountholder}`
          );
        }
        if (updateBank.data.bank.status == 1) {
          const mail = new Mail(updateBank.data.email);
          await mail.sendMail(
            mail.email,
            `Dear User,
             We are pleased to inform you that the bank details you provided have been successfully verified and approved. You can now expect future payments to be processed directly to your designated bank account.

Account Holder's Name : ${updateBank.data.bank.accountholder}
Account Number : ${updateBank.data.bank.accno}
Bank Branch Code / IFSC : ${updateBank.data.bank.ifsc}

Please keep in mind that any changes to your bank information must be promptly communicated to us to avoid disruptions in processing.

If you have any questions, feel free to reach out to our support team at  support.fantasyApp.in.

Thank you for your cooperation.

Best regards,
`,
            `Bank Details Successfully Approved`
          );
          customMessage(
            "success",
            `Successfully Activated request of ${updateBank.data.bank.accountholder}`
          );
        }
        res.redirect(`/viewbankdetails/${updateBank.data._id}`);
      } else {
        req.flash("warning", "try again later !!!");
        res.redirect(`/viewbankdetails/${updateBank.data._id}`);
      }
    } catch (error) {
      // next(error);
      req.flash("error", "Something went wrong please try again");
      res.redirect("/verifybankaccount");
    }
  }

  async withdrawalAmount(req, res, next) {
    try {
      res.locals.message = req.flash();
      const { status, apd_date, req_date, email, mobile } = req.query;
      res.render("verify/withdrawalAmount", {
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

  async Update_Credentials_Bank(req, res, next) {
    try {
      const updateDetailsBank = await userModel.findOneAndUpdate(
        { _id: req.body.userid },
        {
          $set: {
            "bank.accno": req.body.accno || "",
            "bank.ifsc": req.body.ifsc.toUpperCase() || "",
            "bank.bankname": req.body.bankname || "",
            "bank.bankbranch": req.body.bankbranch || "",
            "bank.state": req.body.state || "",
            "bank.status": req.body.status || 0,
            "user_verify.bank_verify": req.body.status || 0,
            "bank.comment": req.body.comment || "",
          },
        },
        { new: true }
      );
      let customMessage = (type, text) => req.flash(type, text);
      if (updateDetailsBank.bank.status === 2) {
        customMessage("success", `bank request Successfully Reject`);
      }
      if (updateDetailsBank.bank.status === 1) {
        customMessage("success", `bank request Successfully Activated`);
      }

      res.redirect(`/editbankdetails/${updateDetailsBank._id}`);
    } catch (error) {
      req.flash("error", "Something went wrong please try again");
      res.redirect("/verifybankaccount");
    }
  }

  async withdraw_amount_datatable2(req, res, next) {
    try {
      let pipeline = [];
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "userid",
          foreignField: "_id",
          as: "userdata",
        },
      });
      pipeline.push({
        $unwind: {
          path: "$userdata",
        },
      });
      pipeline.push({
        $project: {
          _id: 1,
          amount: 1,
          comment: 1,
          tranfer_id: 1,
          userid: 1,
          approved_date: 1,
          status: 1,
          withdraw_req_id: 1,
          status_description: 1,
          paytm_number: 1,
          bank: "$userdata.bank.accno",
          username: "$userdata.username",
          email: "$userdata.email",
          mobile: "$userdata.mobile",
          Requested_Date: {
            $dateToString: {
              format: "%Y-%m-%d %H-%M",
              date: "$userdata.bank.created_at",
            },
          },
          IFSC_Code: "$userdata.bank.ifsc",
          bankname: "$userdata.bank.bankname",
          bankbranch: "$userdata.bank.bankbranch",
        },
      });
      if (req.query.email) {
        pipeline.push({
          $match: {
            email: { $regex: new RegExp(req.query.email.toLowerCase(), "i") },
          },
        });
      }
      if (req.query.mobile) {
        pipeline.push({
          $match: { mobile: Number(req.query.mobile) },
        });
      }
      if (req.query.apd_date) {
        let datestring = moment(req.query.apd_date).format("YYYY-MM-DD");
        pipeline.push({
          $match: { approved_date: datestring },
        });
      }
      if (req.query.req_date) {
        let datestring = moment(req.query.req_date).format("YYYY-MM-DD");
        pipeline.push({
          $match: { Requested_Date: datestring },
        });
      }
      if (req.query.status) {
        pipeline.push({
          $match: { status: Number(req.query.status) },
        });
      }
      withdrawModel.countDocuments(pipeline).exec((err, rows) => {
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        withdrawModel.aggregate(pipeline).exec((err, rows1) => {
          rows1.forEach((index) => {
            let newappenField;
            let appendDate;
            let appendAmount;
            if (index.status == 1) {
              newappenField = `<span class="text-success"><i class="far fa-check-circle"></i>${constant.RAZORPAY_PAYOUT_STATUS_TO_SHOW_IN_UI[1]}</span>`;
              appendAmount = `<span class="text-success" Style="font-size:120% !important">${index.amount || 0
                }</span>`;
            } else if (index.status == 2) {
              newappenField = `<span class="text-danger"><i class="far fa-times-circle"></i>${constant.RAZORPAY_PAYOUT_STATUS_TO_SHOW_IN_UI[2]}</span>`;
              appendAmount = `<span class="text-danger" Style="font-size:130% !important">${index.amount || 0
                }</span>`;
            } else if (index.status == 3) {
              newappenField = `<span class="text-success"><i class="far fa-check-circle"></i>${constant.RAZORPAY_PAYOUT_STATUS_TO_SHOW_IN_UI[3]}</span>`;
              appendAmount = `<span class="text-success" Style="font-size:120% !important">${index.amount || 0
                }</span>`;
            } else if (index.status == 4) {
              newappenField = `<span class="text-info"><i class="far fa-check-circle"></i>${constant.RAZORPAY_PAYOUT_STATUS_TO_SHOW_IN_UI[4]}</span>`;
              appendAmount = `<span class="text-info" Style="font-size:120% !important">${index.amount || 0
                }</span>`;
            } else if (index.status == 5) {
              newappenField = `<span class="text-dark"><i class="far fa-check-circle"></i>${constant.RAZORPAY_PAYOUT_STATUS_TO_SHOW_IN_UI[5]}</span>`;
              appendAmount = `<span class="text-dark" Style="font-size:120% !important">${index.amount || 0
                }</span>`;
            } else if (index.status == 6) {
              newappenField = `<span class="text-danger"><i class="far fa-check-circle"></i>${constant.RAZORPAY_PAYOUT_STATUS_TO_SHOW_IN_UI[6]}</span>`;
              appendAmount = `<span class="text-danger" Style="font-size:120% !important">${index.amount || 0
                }</span>`;
            } else if (index.status == 7) {
              newappenField = `<span class="text-warning"><i class="far fa-check-circle"></i>${constant.RAZORPAY_PAYOUT_STATUS_TO_SHOW_IN_UI[7]}</span>`;
              appendAmount = `<span class="text-warning" Style="font-size:120% !important">${index.amount || 0
                }</span>`;
            } else {
              newappenField = `<a style="cursor: pointer;" data-toggle="tooltip dropdown-item" title="approve" onclick="confirmation('/mannual-withdraw-request/${index.userid}?withdrawalId=${index._id}&amount=${index.amount}', 'Are you sure?')"><span class="text-success"><i class="far fa-check-circle"></i>Mannual</span></a>&nbsp&nbsp&nbsp
                                <a data-toggle="modal" data-target="#deductmoneymodal" class="editbtn" style="cursor:pointer;" style="cursor: pointer; text-decoration:none;"><span class="text-danger"><i class="far fa-times-circle"></i>Reject</span></a>`;
              appendAmount = `<span class="text-warning"; font-size:150% !important">${index.amount || 0
                }</span>
                            <div id="deductmoneymodal" class="modal fade abc  px-0" role="dialog" style="z-index: 0.2%;">
                            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable  h-100">
                            <form action="/reject-withdraw-request/${index.userid
                }?withdrawalId=${index._id}&amount=${index.amount
                }" method="GET">
                            <!-- Modal content-->
                            <div class="modal-content">
                              <div class="modal-header">
                              <h4 class="modal-title _head_ing">Cancel Request</h4>
                              <button type="button" class="close" data-dismiss="modal">&times;</button>
                              </div>
                              <div class="modal-body">
                              
                                <input type="hidden" value="${index.userid
                }" name="userid" id="userid">
                                <input type="hidden" value="${index.amount
                }" name="amount" id="amount">
                                <input type="hidden" value="${index._id
                }" name="withdrawalId" id="withdrawalId">
                                <div class="col-md-12 col-sm-12 form-group ">
                                  <label> Comment </label>
                                  <input type="text" class="form-control" id="description" name="description" autocomplete="off" required></input>
                                </div>
                                </div>
                                <div class="modal-footer">
                                <div class="col-auto text-right ml-auto mt-4 mb-2">
                                   <input type="submit" class="btn btn-sm btn-success text-uppercase" value="Submit">
                                   <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Close</button>
                                   </div>
                                   </div>
                                  
                              </div>
                              </form>
                            </div>
                          </div>`;
            }
            console.log("hhhhhhj", index.approved_date);
            if (index.approved_date) {
              appendDate = `<span class="text-success">${moment(
                index.approved_date
              ).format("YYYY-MM-DD")}</span>`;
            } else {
              appendDate = `<span class="text-danger">Not Approved Yet</span>`;
            }
            data.push({
              S_NO: count,
              UID: `<a href="/getUserDetails/${index.userid}">${index.userid}</a>`,
              Account_Number: index.bank || "",
              W_ammount: appendAmount,
              user_Name: index.username,
              transfer_Id: index.tranfer_id || "",
              IFSC_Code: index.IFSC_Code || "",
              Bank_Name: index.bankname || "",
              Bank_Branch: index.bankbranch || "",
              Requested_Date: `<span class="text-warning">${moment(
                index.Requested_Date
              ).format("YYYY-MM-DD HH:mm")}</span>`,
              Email: index.email || "",
              app_rej_Date: appendDate,
              Mobile: index.mobile || "",
              Admin_Comment: index.comment || "",
              status_description: index.status_description,
              actions: newappenField,
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
      req.flash("error", "Something went wrong please try again");
      res.redirect("/withdraw_amount");
    }
  }

  async approve_withdraw_request(req, res, next) {
    try {
      const approvalReq = await verificationServices.approve_withdraw_request(
        req
      );
      console.log("approvalReq", approvalReq);

      if (approvalReq.status == true) {
        req.flash("success", approvalReq.messaage);
        res.redirect("/withdraw_amount");
      } else {
        req.flash("error", approvalReq.messaage);
        res.redirect("/withdraw_amount");
      }
    } catch (error) {
      console.log("error1234", error);
      req.flash("error", "something went wrong");
      res.redirect("/withdraw_amount");
    }
  }
  //approve
  async mannual_withdraw_request(req, res, next) {
    try {
      const approvalReq = await verificationServices.mannual_withdraw_request(
        req
      );
      if (approvalReq.status == true) {
        req.flash("success", approvalReq.messaage);
        res.redirect("/withdraw_amount");
      } else {
        req.flash("error", approvalReq.messaage);
        res.redirect("/withdraw_amount");
      }
    } catch (error) {
      req.flash("error", "something went wrong");
      res.redirect("/withdraw_amount");
    }
  }
  //approveend

  async reject_withdraw_request(req, res, next) {
    try {
      const approvalReq = await verificationServices.reject_withdraw_request(
        req
      );
      if (approvalReq.status == true) {
        req.flash("success", "withdrawal request rejected");
        res.redirect("/withdraw_amount");
      }
    } catch (error) {
      req.flash("error", "something went wrong");
      res.redirect("/withdraw_amount");
    }
  }
  async downloadPanVerify(req, res, next) {
    try {
      let conditions = {};
      let name;
      conditions["pancard.status"] = 0;
      if (req.query.email) {
        conditions.email = {
          $regex: new RegExp(req.query.email.toLowerCase(), "i"),
        };
      }
      if (req.query.mobile) {
        conditions.mobile = Number(req.query.mobile);
      }
      if (req.query.name) {
        const data = req.query.name.toUpperCase();
        conditions["pancard.pan_name"] = { $regex: data };
      }
      if (req.query.status) {
        conditions["pancard.status"] = req.query.status;
      }

      let data = [];
      let count = 1;
      userModel.find(conditions).exec((err, rows1) => {
        if (err) console.log(err);
        rows1.forEach((index) => {
          let PanVerfication = index.pancard.status;
          let appendField;
          if (PanVerfication == 0) {
            appendField = `Pending`;
          } else if (PanVerfication == 1) {
            appendField = `Verified`;
          } else {
            appendField = `cancelled`;
          }
          data.push({
            S_NO: count,
            UID: index._id,
            Name: index.pancard.pan_name || "",
            Email: index.email,
            Mobile_No: index.mobile || "",
            DOB: index.pancard.pan_dob || "",
            PAN_Number: index.pancard.pan_number || "",
            status: appendField,
            Comment: index.pancard.comment || "",
            Uploading_Date: moment(index.pancard.created_at).format(
              "YYYY-MM-DD HH:mm"
            ),
          });
          count++;
        });

        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("panVerify");
        worksheet.columns = [
          { header: "s.no", key: "S_NO", width: 5 },
          { header: "Name", key: "Name", width: 20 },
          { header: "Email", key: "Email", width: 30 },
          { header: "Mobile No.", key: "Mobile_No", width: 12 },
          { header: "DOB", key: "DOB", width: 15 },
          { header: "PAN Number", key: "PAN_Number", width: 15 },
          { header: "Status", key: "status", width: 12 },
          { header: "Comment", key: "Comment", width: 18 },
          { header: "Uploading Date", key: "Uploading_Date", width: 22 },
        ];
        // Add Array Rows
        worksheet.addRows(data);
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=" + "panVerify.xlsx"
        );
        return workbook.xlsx.write(res).then(function () {
          res.status(200).end();
        });
      });
    } catch (error) {
      console.log(error);
    }
  }
  async downloadallbankVerify(req, res, next) {
    try {
      let conditions = {};
      let name;
      conditions["bank.status"] = 0;
      if (req.query.email) {
        conditions.email = {
          $regex: new RegExp(req.query.email.toLowerCase(), "i"),
        };
      }
      if (req.query.mobile) {
        conditions.mobile = Number(req.query.mobile);
      }
      if (req.query.name) {
        const data = req.query.name.toUpperCase();
        conditions["bank.accountholder"] = { $regex: data };
      }
      if (req.query.status) {
        conditions["bank.status"] = req.query.status;
      }

      let data = [];
      let count = 1;
      userModel.find(conditions).exec((err, rows1) => {
        if (err) console.log(err);
        rows1.forEach((index) => {
          let panVerfication = index.bank.status;
          let appendField;
          if (panVerfication == 0) {
            appendField = "Pending";
          } else if (panVerfication == 1) {
            appendField = `Verified`;
          } else {
            appendField = `canceled`;
          }
          data.push({
            S_NO: count,
            Name: index.bank.accountholder || "",
            Email: index.email || "",
            Mobile_No: index.mobile || "",
            Account_No: index.bank.accno || "",
            IFSC_Code: index.bank.ifsc || "",
            Bank_Name: index.bank.bankname || "",
            Branch: index.bank.bankbranch || "",
            State: index.bank.state || "",
            Status: appendField,
            Uploading_Date: moment(index.bank.created_at).format(
              "YYYY-MM-DD HH:mm"
            ),
          });
          count++;
        });
        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("bankVerify");
        worksheet.columns = [
          { header: "s.no", key: "S_NO", width: 5 },
          { header: "Name", key: "Name", width: 20 },
          { header: "Email", key: "Email", width: 30 },
          { header: "Account No.", key: "Account_No", width: 12 },
          { header: "IFSC Code", key: "IFSC_Code", width: 15 },
          { header: "Bank Name", key: "Bank_Name", width: 15 },
          { header: "Branch", key: "Branch", width: 12 },
          { header: "State", key: "State", width: 18 },
          { header: "Status", key: "Status", width: 18 },
          { header: "Uploading Date", key: "Uploading_Date", width: 22 },
        ];
        // Add Array Rows
        worksheet.addRows(data);
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=" + "bankVerify.xlsx"
        );
        return workbook.xlsx.write(res).then(function () {
          res.status(200).end();
        });
      });
    } catch (error) {
      console.log(error);
    }
  }
  async downloadallwithdrawalrequest(req, res, next) {
    try {
      let pipeline = [];
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "userid",
          foreignField: "_id",
          as: "userdata",
        },
      });
      pipeline.push({
        $unwind: {
          path: "$userdata",
        },
      });
      pipeline.push({
        $project: {
          _id: 1,
          amount: 1,
          comment: 1,
          tranfer_id: 1,
          userid: 1,
          approved_date: 1,
          status: 1,
          withdraw_req_id: 1,
          paytm_number: 1,
          bank: "$userdata.bank.accno",
          username: "$userdata.username",
          email: "$userdata.email",
          mobile: "$userdata.mobile",
          Requested_Date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$userdata.bank.created_at",
            },
          },
          IFSC_Code: "$userdata.bank.ifsc",
          bankname: "$userdata.bank.bankname",
          bankbranch: "$userdata.bank.bankbranch",
        },
      });
      if (req.query.email != "") {
        pipeline.push({
          $match: { email: { $regex: req.query.email } },
        });
      }
      if (req.query.mobile != "") {
        pipeline.push({
          $match: { mobile: Number(req.query.mobile) },
        });
      }
      if (req.query.apd_date != "") {
        let datestring = moment(req.query.apd_date).format("YYYY-MM-DD");
        pipeline.push({
          $match: { approved_date: datestring },
        });
      }
      if (req.query.req_date != "") {
        let datestring = moment(req.query.req_date).format("YYYY-MM-DD");
        pipeline.push({
          $match: { Requested_Date: datestring },
        });
      }
      if (req.query.status != "") {
        pipeline.push({
          $match: { status: Number(req.query.status) },
        });
      }
      pipeline.push({
        $skip: Number(req.query.start) ? Number(req.query.start) : 0,
      });

      let data = [];
      let count = 1;
      withdrawModel.aggregate(pipeline).exec((err, rows1) => {
        if (err) console.log(err);
        rows1.forEach((index) => {
          let newappenField;
          let appendDate;
          let appendAmount;
          if (index.status == 1) {
            newappenField = `approved`;
            appendAmount = `${index.amount || 0}`;
          } else if (index.status == 2) {
            newappenField = `rejected`;
            appendAmount = `${index.amount || 0}`;
          } else {
            newappenField = ` `;
            appendAmount = ` `;
          }
          if (index.approved_date) {
            appendDate = moment(index.approved_date).format("YYYY-MM-DD");
          } else {
            appendDate = `Not Approved Yet`;
          }
          data.push({
            S_NO: count,
            Account_Number: index.bank || "",
            W_ammount: appendAmount,
            user_Name: index.username,
            w_Req_Id: index.withdraw_req_id || "",
            transfer_Id: index.tranfer_id || "",
            IFSC_Code: index.IFSC_Code || "",
            Bank_Name: index.bankname || "",
            Bank_Branch: index.bankbranch || "",
            Requested_Date: moment(index.Requested_Date).format(
              "YYYY-MM-DD HH:mm"
            ),
            Email: index.email || "",
            app_rej_Date: appendDate,
            Mobile: index.mobile || "",
            Admin_Comment: index.comment || "",
            actions: newappenField,
          });
          count++;
        });
        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet("withdrawal");
        worksheet.columns = [
          { header: "s.no", key: "S_NO", width: 5 },
          { header: "Account Number", key: "Account_Number", width: 20 },
          { header: "W ammount", key: "W_ammount", width: 30 },
          { header: "User Name", key: "user_Name", width: 12 },
          { header: "W. Req Id", key: "w_Req_Id", width: 15 },
          { header: "transfer Id", key: "transfer_Id", width: 15 },
          { header: "IFSC Code", key: "IFSC_Code", width: 12 },
          { header: "Bank Name", key: "Bank_Name", width: 18 },
          { header: "Bank Branch", key: "Bank_Branch", width: 18 },
          { header: "Requested Date", key: "Requested_Date", width: 18 },
          { header: "Email", key: "Email", width: 18 },
          { header: "app_rej_Date", key: "app_rej_Date", width: 18 },
          { header: "Mobile", key: "Mobile", width: 18 },
          { header: "Admin_Comment", key: "Admin Comment", width: 18 },
          { header: "actions", key: "actions", width: 18 },
        ];
        // Add Array Rows
        worksheet.addRows(data);
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=" + "withdrawal.xlsx"
        );
        return workbook.xlsx.write(res).then(function () {
          res.status(200).end();
        });
      });
    } catch (error) {
      console.log(error);
    }
  }
  async widthdrowWebhook(req, res, next) {
    try {
      const approvalReq = await verificationServices.widthdrowWebhook(req);
      if (approvalReq.status == true) {
        req.flash("success", approvalReq.messaage);
        res.redirect("/withdraw_amount");
      } else {
        req.flash("error", approvalReq.messaage);
        res.redirect("/withdraw_amount");
      }
    } catch (error) {
      console.log(error);
    }
  }


  async depositAmount(req, res, next) {
    try {
      res.locals.message = req.flash();
      const { status, apd_date, req_date, email, mobile } = req.query;
      res.render("verify/depositList", {
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
  async deposit_amount_datatable(req, res, next) {
    try {
      let pipeline = [];
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userdata",
        },
      });
      pipeline.push({
        $unwind: {
          path: "$userdata",
        },
      });
      pipeline.push({
        $project: {
          _id: 1,
          amount: 1,
          image: 1,
          comment: 1,
          userTransactionId: 1,
          userId: 1,
          approveDate: 1,
          status: 1,
          status: 1,
          paytm_number: 1,
          username: "$userdata.username",
          email: "$userdata.email",
          mobile: "$userdata.mobile",
          Requested_Date: {
            $dateToString: {
              format: "%Y-%m-%d %H-%M",
              date: "$createdAt",
            },
          }
        },
      });
      if (req.query.email) {
        pipeline.push({
          $match: {
            email: { $regex: new RegExp(req.query.email.toLowerCase(), "i") },
          },
        });
      }
      if (req.query.mobile) {
        pipeline.push({
          $match: { mobile: Number(req.query.mobile) },
        });
      }
      if (req.query.apd_date) {
        let datestring = moment(req.query.apd_date).format("YYYY-MM-DD");
        pipeline.push({
          $match: { approveDate: datestring },
        });
      }
      if (req.query.req_date) {
        let datestring = moment(req.query.req_date).format("YYYY-MM-DD");
        pipeline.push({
          $match: { Requested_Date: datestring },
        });
      }
      if (req.query.status) {
        pipeline.push({
          $match: { status: req.query.status },
        });
      }
      depositModel.countDocuments(pipeline).exec((err, rows) => {
        let totalFiltered = rows;
        let data = [];
        let count = 1;
        depositModel.aggregate(pipeline).exec((err, rows1) => {
          rows1.forEach((index) => {
            let newappenField;
            let appendDate;
            let appendAmount;
            if (index.status != 'approved') {
              newappenField = `<a style="cursor: pointer;" data-toggle="tooltip dropdown-item" title="approve" onclick="confirmation('/approve-deposit-request/${index.userId}?depositId=${index._id}&amount=${index.amount}', 'Are you sure?')"><span class="text-success"><i class="far fa-check-circle"></i>Approve</span></a>&nbsp&nbsp&nbsp
                                <a data-toggle="modal" data-target="#deductmoneymodal${index._id}" class="editbtn" style="cursor:pointer;" style="cursor: pointer; text-decoration:none;"><span class="text-danger"><i class="far fa-times-circle"></i>Reject</span></a>
                <span class="text-warning"; font-size:150% !important">${index.amount || 0
                }</span>
                            <div id="deductmoneymodal${index._id}" class="modal fade abc  px-0" role="dialog" style="z-index: 0.2%;">
                            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable  h-100">
                            <form action="/reject-deposit-request/${index.userId
                }?depositId=${index._id}&amount=${index.amount
                }" method="GET">
                            <!-- Modal content-->
                            <div class="modal-content">
                              <div class="modal-header">
                              <h4 class="modal-title _head_ing">Cancel Request</h4>
                              <button type="button" class="close" data-dismiss="modal">&times;</button>
                              </div>
                              <div class="modal-body">
                              
                                <input type="hidden" value="${index.userId
                }" name="userid" id="userid">
                                <input type="hidden" value="${index.amount
                }" name="amount" id="amount">
                                <input type="hidden" value="${index._id
                }" name="depositId" id="depositId">
                                <div class="col-md-12 col-sm-12 form-group ">
                                  <label> Comment </label>
                                  <input type="text" class="form-control" id="description" name="description" autocomplete="off" required></input>
                                </div>
                                </div>
                                <div class="modal-footer">
                                <div class="col-auto text-right ml-auto mt-4 mb-2">
                                   <input type="submit" class="btn btn-sm btn-success text-uppercase" value="Submit">
                                   <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Close</button>
                                   </div>
                                   </div>
                                  
                              </div>
                              </form>
                            </div>
                          </div>`;
            }
            console.log("hhhhhhj", index.approveDate);
            if (index.approveDate) {
              appendDate = `<span class="text-success">${moment(
                index.approveDate
              ).format("YYYY-MM-DD")}</span>`;
            } else {
              appendDate = `<span class="text-danger">Not Approved Yet</span>`;
            }
            data.push({
              S_NO: count,
              user_Name: index.username,
              amount: index.amount || "",
              image: `<img src="${constant.BASE_URL}${index.image}"  class="w-40px view_team_table_images h-40px rounded-pill"/>` || "",
              Requested_Date: `<span class="text-warning">${moment(
                index.Requested_Date
              ).format("YYYY-MM-DD HH:mm")}</span>`,
              Email: index.email || "",
              app_rej_Date: appendDate,
              Mobile: index.mobile || "",
              userTransactionId: index.userTransactionId,
              Admin_Comment: index.comment || "",
              status_description: index.status,
              actions: newappenField,
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
      req.flash("error", "Something went wrong please try again");
      res.redirect("/deposit_amount");
    }
  }

  async approve_deposit_request(req, res, next) {
    try {
      console.log(req.query);
      const approvalReq = await verificationServices.approve_deposit_request(
        req
      );
      console.log("approvalReq", approvalReq);

      if (approvalReq.status == true) {
        req.flash("success", approvalReq.messaage);
        res.redirect("/deposit_amount");
      } else {
        req.flash("error", approvalReq.messaage);
        res.redirect("/deposit_amount");
      }
    } catch (error) {
      console.log("error1234", error);
      req.flash("error", "something went wrong");
      res.redirect("/deposit_amount");
    }
  }
  //approveend

  async reject_deposit_request(req, res, next) {
    try {
      const approvalReq = await verificationServices.reject_deposit_request(
        req
      );
      if (approvalReq.status == true) {
        req.flash("success", "deposit request rejected");
        res.redirect("/deposit_amount");
      }
    } catch (error) {
      req.flash("error", "something went wrong");
      res.redirect("/deposit_amount");
    }
  }
}
module.exports = new verifyManagerController();
