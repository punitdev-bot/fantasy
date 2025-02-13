const PaymentProcessModel = require("../../models/PaymentProcessModel")



class GSTController {
    constructor() {
        return {
            viewGSTPage: this.viewGSTPage.bind(this),
            ViewAllGSTTable: this.ViewAllGSTTable.bind(this),
        }
    }
    async viewGSTPage(req, res, next) {
        try {
            res.locals.message = req.flash();
            res.render("GST/viewGST", {
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


    async ViewAllGSTTable(req, res, next) {
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
                        status: "payment.captured"
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
            }, {
                $project: {
                    amount: 1,
                    orderid: 1,
                    type: 1,
                    userid: 1,
                    txnid: 1,
                    status: 1,
                    email: "$user.email",
                    mobile: "$user.mobile",
                    username: "$user.username",
                    createdAt : 1
                }
            },
                {
                    $addFields: {
                        amountAsNumber: { $toDouble: { $ifNull: ["$amount", 0] } }
                    }
                },
                {
                    $addFields: {
                        totelGST: { $multiply: [{ $divide: ["$amountAsNumber", 100] }, 30] }
                    }
                }, {
                $sort: {
                    approved_date: -1 
                }
            },
                {
                    $group: {
                        _id: null,
                        totalGST: { $sum: "$totelGST" },
                        data: { $push: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalGST: 1,
                        data: 1
                    }
                },
                {
                    $unwind: "$data" // Flatten the results
                },
                {
                    $replaceRoot: { newRoot: { $mergeObjects: ["$data", { totalGSTAmount: "$totalGST" }] } } // Merge totalTDS into each document
                }

            )

            if(startdate !== ""){
                condition.push({
                    $match: {
                        createdAt: {
                            $gte: new Date(startdate + "T00:00:00.000Z"),
                        }
                    }
                })
            }
            if(enddate !== ""){
                condition.push({
                    $match: {
                        createdAt: {
                            $lte: new Date(enddate + "T23:59:59.000Z"),
                        }
                    }
                })
            }
            PaymentProcessModel.aggregate(condition).exec((err, rows) => {
                if (err) {
                    console.log(err, 'error >>>>>>>>>>>>>')
                }
                let totalFiltered = rows;
                let data = [];
                let count = 1;
                let totelAmountofTDs = 0;

                PaymentProcessModel.aggregate(condition).exec(async (err, rows1) => {
                    if (err) console.log(err);9
                    for (const index of rows1) {
                        const baseAmount = index.amount / (1 + 28 / 100);
                        const gstAmount = (index.amount - baseAmount).toFixed(2);
                        data.push({
                            "count": count,
                            "username": index.username,
                            "mobile": index.mobile,
                            "email": index.email,
                            "txnid": index.txnid,
                            "orderid": index.orderid,
                            "amount": `<del> ${index.amount} </del>&nbsp &nbsp = &nbsp &nbsp ${(index.amount - gstAmount).toFixed(2)} `,
                            "getAmount": gstAmount,
                            "userid": index.userid,
                            "status": index.status,
                            "totelAmountofGST": index.totalGSTAmount,
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

}
module.exports = new GSTController();