const { default: mongoose } = require('mongoose');
const listMatchesModel = require('../../models/listMatchesModel');
const matchChallengersModel = require('../../models/matchChallengersModel');
const joinLeague = require('../../models/JoinLeaugeModel');
const userModel = require('../../models/userModel');
const referLevelModel = require('../../models/referLevelModel');
const userLevelEarningModel = require('../../models/userLevelEarningModel');
const randomstring = require('randomstring');
const TransactionModel = require("../../models/transactionModel");
const constant = require("../../config/const_credential");
exports.contestCompression = async (req, res) => {
    try {
        // Fetch all relevant matches
        const matches = await listMatchesModel.find(
            {
                'fantasy_type': 'Cricket',
                'status': 'started',
                'launch_status': 'launched',
                'final_status': 'pending'
            },
            { _id: 1 } // Only fetch _id field
        );

        // Extract match IDs
        const matchIds = matches.map(match => match._id);
        console.log("Match IDs:", matchIds);
        if (matchIds.length === 0) {
            return res.status(404).json({ message: "No matches found", status: false });
        }

        // Aggregate all contests for the fetched match IDs
        const data = await listMatchesModel.aggregate([
            {
                '$match': {
                    '_id': { '$in': matchIds } // Match multiple match IDs
                }
            },
            {
                '$project': {
                    '_id': 0,
                    'matchkey': '$_id'
                }
            },
            {
                '$lookup': {
                    'from': 'matchchallenges',
                    'localField': 'matchkey',
                    'foreignField': 'matchkey',
                    'pipeline': [
                        { '$match': { 'compress': false, "confirmed_flexible": 1 } }
                    ],
                    'as': 'data'
                }
            },
            { '$unwind': '$data' },
            { '$replaceRoot': { 'newRoot': '$data' } },
            {
                '$lookup': {
                    'from': 'joinedleauges',
                    'localField': '_id',
                    'foreignField': 'challengeid',
                    'as': 'result'
                }
            },
            {
                '$addFields': {
                    'joinedusers': { '$size': '$result' }
                }
            },
            {
                '$project': {
                    'joinedusers': 1,
                    'matchkey': 1,
                    'entryfee': 1,
                    'win_amount': 1,
                    'maximum_user': 1,
                    'matchpricecards': 1
                }
            }
        ]);

        if (data.length > 0) {
            for (const contest of data) {
                if (contest.joinedusers > 1) {
                    let joinedUserPercentage = ((contest.joinedusers / contest.maximum_user) * 100);
                    let newWinningAmount = ((joinedUserPercentage / 100) * contest.win_amount);
                    let new_win_amount = Math.round(newWinningAmount);
                    let totalamount = 0;
                    let matchpricecard = [];

                    for (const priceCard of contest.matchpricecards) {
                        let totalPercentOfWinningAmount = (priceCard.total / contest.win_amount) * 100;
                        let getNewTotalAmountOfPriceCard = Math.round((totalPercentOfWinningAmount / 100) * newWinningAmount);

                        totalamount += getNewTotalAmountOfPriceCard;
                        if (new_win_amount < totalamount) break;

                        priceCard.total = getNewTotalAmountOfPriceCard;
                        priceCard.price = getNewTotalAmountOfPriceCard / priceCard.winners;
                        matchpricecard.push(priceCard);
                    }

                    console.log(`Updating Contest ID: ${contest._id} - Joined Users: ${contest.joinedusers}`);
                    await matchChallengersModel.findOneAndUpdate(
                        { matchkey: contest.matchkey, _id: contest._id },
                        { $set: { matchpricecards: matchpricecard, win_amount: newWinningAmount, compress: true } }
                    );

                } else {
                    await matchChallengersModel.findOneAndUpdate(
                        { matchkey: contest.matchkey, _id: contest._id },
                        { $set: { confirmed_challenge: 0 } }
                    );
                }
            }

            return res.json({ message: "Contest Compression Complete", status: true, data });
        }

        return res.json({ message: "No contests to process", status: true });

    } catch (error) {
        console.error("Error in contestCompression:", error);
        return res.status(500).json({ message: "Internal Server Error", status: false, error });
    }
};


exports.givingLevelUser = async () => {
    try {
        let pipeline = [];
        pipeline.push({
            $match: {
                // _id: mongoose.Types.ObjectId("66038c47b1a4d97198c2cd01"),
                status: 'completed',
                final_status: { $in: ["winnerdeclared"] },
                levelPercentage: false
            }
        });
        pipeline.push({
            $lookup: {
                from: 'matchchallenges',
                let: { matckey: "$_id" },
                pipeline: [{
                    $match: {
                        status: { $ne: "canceled" },
                        win_amount: { $ne: 0 },
                        // _id:mongoose.Types.ObjectId("628b08fd250227be46ae4374"),
                        $expr: {
                            $and: [
                                { $eq: ["$matchkey", "$$matckey"] },
                            ],
                        },
                    },
                },],
                as: 'matchChallengesData'
            }
        })
        let listmatches = await listMatchesModel.aggregate(pipeline);
        let levelPercentage = await referLevelModel.find({ is_deleted: false });
        console.log('listmatches-->', listmatches);

        if (listmatches.length > 0) {
            for (let match of listmatches) {
                for (let challenge of match.matchChallengesData) {
                    let pipeline1 = [];
                    pipeline1.push({
                        $match: {
                            matchkey: mongoose.Types.ObjectId(match._id),
                            challengeid: mongoose.Types.ObjectId(challenge._id)
                        }
                    });
                    pipeline1.push({
                        $project: {
                            _id: 1,
                            "leaugestransaction": 1,
                            userid: 1,
                            challengeid: 1,
                            matchkey: 1
                        }
                    });
                    let joinedusers = await joinLeague.aggregate(pipeline1);
                    console.log("-------joinedusers-------->--", joinedusers.length)
                    if (joinedusers.length > 0) {
                        for await (let join of joinedusers) {
                            let totalAmount = join.leaugestransaction.bonus + join.leaugestransaction.balance + join.leaugestransaction.winning;
                            let getLevelAllUsers = await getLevelUsers(join.userid);
                            // console.log("-------getLevelAllUsers-------->--", JSON.stringfy(getLevelAllUsers))
                            if (getLevelAllUsers?.children.length > 0) {
                                for (let levelUser of getLevelAllUsers.children) {
                                    let checkUser = await userLevelEarningModel.findOne({ userId: levelUser._id, joinId: join._id });
                                    if (!checkUser) {
                                        let getPer = levelPercentage.find(item => item.level == levelUser.level);
                                        let amount = (totalAmount * getPer.percentage) / 100;
                                        let randomStr = randomstring.generate({ length: 4, charset: 'alphabetic', capitalization: 'uppercase' });
                                        const txnid = `${constant.APP_SHORT_NAME}-level-winning-${Date.now()}${randomStr}`;
                                        let levelObj = {
                                            userId: levelUser._id,
                                            amount: amount,
                                            levelUserId: join.userid,
                                            transactionId: txnid,
                                            level: levelUser.level,
                                            joinId: join._id,
                                            challengeId: join.challengeid,
                                            matchkey: join.matchkey
                                        }
                                        let transactionObj = {
                                            userid: levelUser._id,
                                            type: 'level user winning',
                                            transaction_id: txnid,
                                            transaction_by: constant.TRANSACTION_BY.APP_NAME,
                                            amount: amount,
                                            paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED,
                                            challengeid: join.challengeid,
                                            joinid: join._id,
                                            win_amt: amount,
                                            bal_bonus_amt: levelUser.userbalance.bonus,
                                            bal_win_amt: levelUser.userbalance.winning + amount,
                                            bal_fund_amt: levelUser.userbalance.balance,
                                            total_available_amt: levelUser.userbalance.balance + levelUser.userbalance.winning + amount + levelUser.userbalance.bonus
                                        }
                                        const update = {};
                                        update["$inc"] = { "userbalance.winning": +Number(amount) };

                                        await userModel.findOneAndUpdate({ _id: levelUser._id }, update, { new: true });
                                        await userLevelEarningModel.create(levelObj);
                                        await TransactionModel.create(transactionObj);
                                    }
                                }

                            }
                        }
                    }
                }
                await listMatchesModel.updateOne({ _id: match._id }, { levelPercentage: true });
            }
        }
        return true;
    } catch (error) {
        console.log(error);
    }
}
const getLevelUsers = async (userId) => {
    try {
        let levelUsers = await userModel.aggregate([
            {
                '$match': {
                    '_id': mongoose.Types.ObjectId(userId)
                }
            }, {
                '$graphLookup': {
                    from: "users",
                    startWith: "$refer_id",
                    connectFromField: "refer_id",
                    connectToField: "_id",
                    as: "children",
                    maxDepth: 15,
                    depthField: "level",
                }
            }, {
                '$project': {
                    'email': 1,
                    'mobile': 1,
                    'refer_code': 1,
                    'image': 1,
                    'children.email': 1,
                    'children.mobile': 1,
                    'children.level': 1,
                    'children.image': 1,
                    'children._id': 1,
                    'children.refer_id': 1,
                    "children.userbalance": 1
                }
            }
        ]);
        //   console.log('levelUsers--->',levelUsers);
        return levelUsers[0];
    } catch (error) {
        console.log(error);
    }
}