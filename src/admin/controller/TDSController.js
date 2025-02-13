const withdrawModel = require("../../models/withdrawModel")



class TDSController {
    constructor() {
        return {
            viewTDSPage: this.viewTDSPage.bind(this),
            ViewAllTDSTable: this.ViewAllTDSTable.bind(this),
        }
    }
    async viewTDSPage(req, res, next) {
        try {
            res.locals.message = req.flash();
            res.render("tds/viewTDS", {
                sessiondata: req.session.data,
                queryData: {
                    startdate: req.query.startdate,
                    enddate: req.query.enddate
                }
            });
        } catch (error) {
            req.flash("error", "Something went wrong please try again");
            res.redirect("/view-all-players");
        }
    }


    async ViewAllTDSTable(req, res, next) {
        try {
            let limit1 = req.query.length;
            let start = req.query.start;
            let startdate = req.query.startdate;
            let enddate = req.query.enddate;
            startdate = startdate.split(" ")[0].replaceAll("/" , "-");
            enddate = enddate.split(" ")[0].replaceAll("/" , "-");
            let condition = [];
           
            condition.push(
                {
                  $match: {
                    comment: "approved"
                  }
                },
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
                    amount: 1,
                    withdraw_req_id: 1,
                    type: 1,
                    userid: 1,
                    approved_date: 1,
                    email: "$user.email",
                    mobile: "$user.mobile",
                    username: "$user.username"
                  }
                },
                {
                  $addFields: {
                    amountAsNumber: { $toDouble: { $ifNull: ["$amount", 0] } }
                  }
                },
                {
                  $addFields: {
                    totelTDS: { $multiply: [{ $divide: ["$amountAsNumber", 100] }, 30] }
                  }
                },
                {
                  $sort: {
                    approved_date: -1 // Sort by approved_date in descending order
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalTDS: { $sum: "$totelTDS" }, // Calculate total TDS
                    data: { $push: "$$ROOT" } // Preserve all documents in an array
                  }
                },
                {
                  $project: {
                    _id: 0,
                    totalTDS: 1,
                    data: 1
                  }
                },
                {
                  $unwind: "$data" // Flatten the results
                },
                {
                  $replaceRoot: { newRoot: { $mergeObjects: ["$data", { totalTDSAmount: "$totalTDS" }] } } // Merge totalTDS into each document
                }
              )
                if (req.query.startdate != "") {
                    condition.push({
                        $match: {
                            approved_date: {
                                $gte: String(startdate),
                            }
                        }
                    })
                }
                if (req.query.enddate != "") {
                    condition.push({
                        $match: {
                            approved_date: {
                                $lte: String(enddate),
                            }
                        }
                    })
                }

            withdrawModel.aggregate(condition).exec((err, rows) => {
                if (err) {
                    console.log(err, 'error >>>>>>>>>>>>>')
                }
                let totalFiltered = rows;
                let data = [];
                let count = 1;
                let totelAmountofTDs = 0;

                withdrawModel.aggregate(condition).exec(async (err, rows1) => {
                    if (err) console.log(err);
                    for (const index of rows1) {
                        let amount30Percent = (index.amount / 100 * 30).toFixed(2);

                        data.push({
                            "count": count,
                            "username": index.username,
                            "mobile": index.mobile,
                            "email": index.email,
                            "type": index.type,
                            "withdraw_req_id": index.withdraw_req_id,
                            "amount": `<del> ${index.amount} </del> = &nbsp &nbsp  ${index.amount - amount30Percent} `,
                            "amount30%": amount30Percent,
                            "userid": index.userid,
                            "approved_date": index.approved_date,
                            "totelAmountofTDs": index.totalTDSAmount,
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

}
module.exports = new TDSController();