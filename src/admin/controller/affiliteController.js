const affiliateModel = require("../../models/reqAffiliteModel")
const userModel = require("../../models/userModel")
const moment = require("moment");
class AffiliteController {
    constructor() {
        return {
            viewAffilitePage: this.viewAffilitePage.bind(this),
            ViewAllAffiliteTable: this.ViewAllAffiliteTable.bind(this),
            approveAffiliate: this.approveAffiliate.bind(this),
            rejectAffiliate: this.rejectAffiliate.bind(this),
        }
    }
    async viewAffilitePage(req, res, next) {
        try {
            res.locals.message = req.flash();
            res.render("affiliate/viewAffiliate", {
                sessiondata: req.session.data,
                queryData: {
                    startdate: req.query.startdate,
                    enddate: req.query.enddate
                }
            });
        } catch (error) {
            req.flash("error", "Something went wrong please try again");
            res.redirect("/");
        }
    }


    async ViewAllAffiliteTable(req, res, next) {
        try {
            let limit1 = req.query.length;
            let start = req.query.start;
            let startdate = req.query.startdate;
            let enddate = req.query.enddate;
            startdate = startdate.split(" ")[0].replaceAll("/", "-");
            enddate = enddate.split(" ")[0].replaceAll("/", "-");
            let condition = [];

            condition.push(
                {
                    $match: {
                        status: "Pending"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "userid",
                        foreignField: "_id",
                        as: "user"
                    }
                }, {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: false
                }
            },
                {
                    $project: {
                        userid: 1,
                        status: 1,
                        email: "$user.email",
                        mobile: "$user.mobile",
                        username: "$user.username",
                        createdAt: 1
                    }
                },
            )

            if (startdate !== "") {
                condition.push({
                    $match: {
                        createdAt: {
                            $gte: new Date(startdate + "T00:00:00.000Z"),
                        }
                    }
                })
            }
            if (enddate !== "") {
                condition.push({
                    $match: {
                        createdAt: {
                            $lte: new Date(enddate + "T23:59:59.000Z"),
                        }
                    }
                })
            }
            affiliateModel.aggregate(condition).exec((err, rows) => {
                if (err) {
                    console.log(err, 'error >>>>>>>>>>>>>')
                }
                let totalFiltered = rows;
                let data = [];
                let count = 1;
                let totelAmountofTDs = 0;

                affiliateModel.aggregate(condition).exec(async (err, rows1) => {
                    if (err) console.log(err); 9
                    for (const index of rows1) {
                        data.push({
                            "count": count,
                            "userid": index.userid,
                            "mobile": index.mobile,
                            "email": index.email,
                            "status": index.status,
                            "username": index.username,
                            "createdAt": moment(index.createdAt).format("DD-MM-YYYY hh:mm A"),
                            "action": `<a href="/affiliate-approve/${index.userid}" class="btn btn-success btn-sm">Approve</a> <a href="/affiliate-reject/${index.userid}" class="btn btn-danger btn-sm">Reject</a>`
                        });
                        count++;
                    }

                    let json_data = JSON.stringify({
                        "recordsTotal": rows,
                        "recordsFiltered": totalFiltered,
                        "data": data,
                    });

                    res.send(json_data);
                });
            });
        } catch (error) {
            console.log(error)
        }
    }

    async approveAffiliate(req, res, next) {
        try {
            let userid = req.params.userid;
            let updateData = {
                status: "Approved"
            };
            let condition = {
                userid: userid
            };
    
            // Update the affiliate status
          if(userid){
            await affiliateModel.findOneAndUpdate(condition, updateData);
    
            let user = await userModel.findOne({ _id: userid });
            user.type = "youtuber";
            await user.save();
            req.flash("success", "Affiliate Approved Successfully");
            return res.redirect("/affiliate-page");
          }
          else{
            req.flash("error", "Something went wrong please try again");
            return res.redirect("/affiliate-page");
          }
        } catch (error) {
            console.log(error);
            req.flash("error", "Something went wrong please try again");
            return res.redirect("/");
        }
    }

    async rejectAffiliate(req, res, next) {
        try {
            let userid = req.params.userid;
            let updateData = {
                status: "Rejected"
            }
            let condition = {
                userid: userid
            }
            affiliateModel.updateOne(condition, updateData, (err, result) => {
                if (err) {
                    console.log(err)
                }
                req.flash("success", "Affiliate Rejected Successfully");
                return res.redirect("/affiliate-page");
            })
        } catch (error) {
            console.log(error)
            req.flash("error", "Something went wrong please try again");
            return res.redirect("/");
        }
    }
}
module.exports = new AffiliteController();