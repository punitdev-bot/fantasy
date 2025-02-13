const mongoose = require('mongoose');
const moment = require("moment");
const fs = require('fs');
const config = require("../../config/const_credential");

const listMatchesModel = require('../../models/listMatchesModel');
const matchPlayersModel = require('../../models/matchPlayersModel');
const leaderBoardModel = require('../../models/leaderBoardModel');
const Redis = require('../../utils/redis');
const mappingPlayers = async (req) => {
    try {
        let getLiveMatches = await listMatchesModel.find({
            status: "started", final_status: {
                $ne: "IsCanceled"
            }
        });
        if (getLiveMatches.length > 0) {
            for (let match of getLiveMatches) {
                const leaderboarddata = await leaderBoardModel.aggregate([
                    {
                        '$match': {
                            'matchkey': mongoose.Types.ObjectId(match._id),
                            mapping: { $ne: true }
                        }
                    }, {
                        $lookup: {
                            from: 'matchchallenges',
                            localField: 'challengeid',
                            foreignField: '_id',
                            as: 'matchchalleng'
                        }
                    }, {
                        $unwind: {
                            path: "$matchchalleng"
                        }
                    }, {
                        $match: {
                            "matchchalleng.status": { "$nin": ["canceled"] }
                        }
                    },
                    {
                        '$lookup': {
                            'from': 'jointeams',
                            'let': {
                                'match': '$matchkey',
                                'team': '$teamId'
                            },
                            'pipeline': [
                                {
                                    '$match': {
                                        '$expr': {
                                            '$and': [
                                                {
                                                    '$eq': [
                                                        '$matchkey', '$$match'
                                                    ]
                                                }, {
                                                    '$eq': [
                                                        '$_id', '$$team'
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            ],
                            'as': 'result'
                        }
                    }
                ]);
                if (leaderboarddata.length > 0) {
                    for await (const data of leaderboarddata) {
                        if (data?.result[0]?.players) {
                            const joindata = data.result[0];
                            players = joindata.players.join("-");
                            players = "-" + players + "-";
                            await leaderBoardModel.findOneAndUpdate({
                                _id: data._id,
                            },
                                {
                                    captain: joindata.captain,
                                    vicecaptain: joindata.vicecaptain,
                                    players: players,
                                    mapping: true
                                },
                                { new: true })
                        }
                    }
                }
            }
            return { message: 'completed', status: true };

        }
        else {
            return { message: 'invalid matchkey', status: false, data: [] }
        }
    } catch (error) {
        console.log("error", error)
    }
}

const matchPointUpdate = async (req) => {
    try {
        console.log('poinsts udpate');
        let agePipe = [];
        agePipe.push({
            $match: {
                launch_status: 'launched',
                status: {$ne:"notstarted"},
                final_status: { $nin: ['winnerdeclared', 'IsCanceled','IsAbandoned'] }
            }
        });
        agePipe.push({
            $lookup: {
                from: 'matchplayers',
                localField: "_id",
                foreignField: 'matchkey',
                as: 'matchplayers'
            }
        });
        let getLiveMatches = await listMatchesModel.aggregate(agePipe);
        if (getLiveMatches.length > 0) {
            for (let match of getLiveMatches) {
                const matchkey = match._id;
                const bulkUpdateOperations = [];
                await leaderBoardModel.updateMany({ matchkey }, { points: 0 }, { new: true })
                for await (const item of match.matchplayers) {
                    const playerId = item?.playerid?.toString();
                    let points = item.points;
                    bulkUpdateOperations.push({
                        updateMany: {
                            filter: { players: { $regex: playerId }, matchkey },
                            update: { $inc: { points } }
                        }
                    });
                    bulkUpdateOperations.push({
                        updateMany: {
                            filter: { players: { $regex: playerId }, matchkey, captain: playerId },
                            update: { $inc: { points } }
                        }
                    });

                    bulkUpdateOperations.push({
                        updateMany: {
                            filter: { players: { $regex: playerId }, matchkey, vicecaptain: playerId },
                            update: { $inc: { points: points * 0.5 } }
                        }
                    });
                }
                if (bulkUpdateOperations.length > 0) {
                    await leaderBoardModel.bulkWrite(bulkUpdateOperations);
                }
            }
            rankUpdateInMatch();
        }
        return { message: "Done work", status: 200, data: [] };
    }
    catch (error) {
        console.log("error", error)
    }
}
const rankUpdateInMatch = async (req) => {
    try {
        let agePipe = [];
        agePipe.push({
            $match: {
                launch_status: 'launched',
                status: {$ne:"notstarted"},
                final_status: { $nin: ['winnerdeclared', 'IsCanceled','IsAbandoned'] }
            }
        });
        agePipe.push({
            $lookup: {
                from: "matchchallenges",
                let: {
                    matchkey: "$_id",
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: ["$matchkey", "$$matchkey"],
                                    },
                                    {
                                        $ne: ["$status", "canceled"],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            joinedusers: 1,
                        },
                    },
                    {
                        $lookup: {
                            from: "leaderboards",
                            let: {
                                challengeid: "$_id",
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$challengeid",
                                                        "$$challengeid",
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                {
                                    $setWindowFields: {
                                        partitionBy: "",
                                        sortBy: {
                                            points: -1,
                                        },
                                        output: {
                                            rank: {
                                                $rank: {},
                                            },
                                        },
                                    },
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        rank: 1,
                                        points: 1,
                                    },
                                },
                            ],
                            as: "leaderboards",
                        },
                    },
                ],
                as: "matchchallenges",
            }
        });
        agePipe.push({
            $project: {
                _id: 1,
                status: 1,
                matchchallenges: 1,
                start_date: 1
            }
        })
        let getLiveMatches = await listMatchesModel.aggregate(agePipe);

        if (getLiveMatches.length > 0) {
            for (let match of getLiveMatches) {
                if (match.matchchallenges.length > 0) {
                    for (let challange of match.matchchallenges) {
                        if (challange.leaderboards.length > 0) {
                            const bulkUpdateOperations = [];
                            for (let leaderboard of challange.leaderboards) {
                                bulkUpdateOperations.push({
                                    updateMany: {
                                        filter: { _id: leaderboard._id },
                                        update: { $set: { rank: leaderboard.rank } }
                                    }
                                });
                            }
                            if (bulkUpdateOperations.length > 0) {
                                await leaderBoardModel.bulkWrite(bulkUpdateOperations);
                            }
                        }
                    }
                }
            }
        }
        return { message: "Done", status: 200, data: [] };
    }
    catch (error) {
        console.log("error", error)
    }
}
module.exports = {
    mappingPlayers,
    matchPointUpdate,
    rankUpdateInMatch
}