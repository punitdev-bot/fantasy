const mongoose = require('mongoose');
const randomstring = require("randomstring");

const matchchallengesModel = require('../../models/matchChallengersModel');
const JoinLeaugeModel = require('../../models/JoinLeaugeModel');
const JoinTeamModel = require('../../models/JoinTeamModel');
const userModel = require('../../models/userModel');
const TransactionModel = require('../../models/transactionModel');
const JoinedReferModel = require('../../models/JoinedReferModel');
const leaderBoardModel = require('../../models/leaderBoardModel');

const constant = require('../../config/const_credential');
const matchServices = require('./matchServices');
const listMatchesModel = require('../../models/listMatchesModel');
const contestCategory = require('../../models/contestcategoryModel');
const Redis = require('../../utils/redis');
class contestServices {
    constructor() {
        return {
            getAllContests: this.getAllContests.bind(this),
            getContest: this.getContest.bind(this),
            joinContest: this.joinContest.bind(this),
            myJoinedContests: this.myJoinedContests.bind(this),
            myLeaderboard: this.myLeaderboard.bind(this),
            updateJoinedusers: this.updateJoinedusers.bind(this),
            switchTeams: this.switchTeams.bind(this),
            getUsableBalance: this.getUsableBalance.bind(this),
            getAllContestsWithoutCategory: this.getAllContestsWithoutCategory.bind(this),
            createPrivateContest: this.createPrivateContest.bind(this),
            joinContestByCode: this.joinContestByCode.bind(this),
            getJoinleague: this.getJoinleague.bind(this),
            getAllNewContests: this.getAllNewContests.bind(this),
        }
    }
    async getAllNewContests(req) {
        try {
            await this.updateJoinedusers(req);
            let finalData = [], contest_arr = [], aggpipe = [];
            aggpipe.push({
                $lookup: {
                    from: "matchchallenges",
                    let: {
                        contestcat: "$_id",
                        matchkey: mongoose.Types.ObjectId(req.query.matchkey),
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ["$$matchkey", "$matchkey"],
                                        },
                                        {
                                            $eq: [
                                                "$$contestcat",
                                                "$contest_cat",
                                            ],
                                        }, {
                                            $eq: ["opened", "$status"],
                                        },
                                        {
                                            $eq: [0, '$is_private'],
                                        }
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "joinedleauges",
                                let: {
                                    challengeId: "$_id",
                                    matchkey: '$matchkey',
                                    userId: mongoose.Types.ObjectId(req.user._id),
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            "$$matchkey",
                                                            "$matchkey",
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            "$$challengeId",
                                                            "$challengeid",
                                                        ],
                                                    },

                                                    {
                                                        $eq: [
                                                            "$$userId",
                                                            "$userid",
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    }, {
                                        $project: {
                                            refercode: 1
                                        }
                                    },
                                ],
                                as: 'joinedleauge'
                            },
                        },
                        {
                            $sort: { win_amount: -1 },
                        },
                    ],
                    as: "contest",
                }
            });
            aggpipe.push({
                $addFields: {
                    challengeSize: {
                        $size: "$contest"
                    }
                }
            })
            aggpipe.push({
                $match: {
                    challengeSize: { $gt: 0 }
                }
            })

            aggpipe.push({
                $sort: {
                    Order: 1
                }
            })
            // aggpipe.push({
            //     $unwind:{
            //         path:"$contest"
            //     }
            // })
            const categoryData = await contestCategory.aggregate(aggpipe);
            if (categoryData.length == 0) {
                return {
                    message: "No Challenge Available For This Match",
                    status: true,
                    data: []
                }
            }
            let [total_teams, total_joinedcontestData] = await Promise.all([
                JoinTeamModel.countDocuments({ userid: req.user._id, matchkey: req.query.matchkey }),
                this.getJoinleague(req.user._id, req.query.matchkey)
            ]);
            let a = [];
            for (let cat of categoryData) {
                cat.type = "category";
                let i = 0;
                cat.catid = cat._id;
                cat.cat_order = cat.Order;
                cat.catname = cat.name;
                cat.image = cat.image ? `${constant.BASE_URL}${cat.image}` : `${constant.BASE_URL}logo.png`;
                for (let matchchallenge of cat.contest) {
                    let totalwinners = 0
                    for await (const priceCard of matchchallenge.matchpricecards) {
                        totalwinners += Number(priceCard.winners);
                    }
                    if (totalwinners == 0) {
                        totalwinners = 1;

                    }
                    matchchallenge.type = "contest";
                    i++;
                    let isselected = false,
                        refercode = '',
                        winners = 0;
                    const price_card = [];
                    if (matchchallenge?.joinedleauge && matchchallenge.joinedleauge.length > 0) {
                        refercode = matchchallenge?.joinedleauge[0].refercode;
                        if (matchchallenge.multi_entry == 1 && matchchallenge.joinedleauge.length < matchchallenge.team_limit) {
                            if (matchchallenge.contest_type == 'Amount') {
                                if (matchchallenge.joinedleauge.length == matchchallenge.team_limit || matchchallenge.joinedusers == matchchallenge.maximum_user)
                                    isselected = true;
                            } else if (matchchallenge.contest_type == 'Percentage') {
                                if (matchchallenge.joinedleauge.length == matchchallenge.team_limit) isselected = true;
                            } else isselected = false;
                        } else isselected = true;
                    }
                    matchchallenge.gift_image = "";
                    matchchallenge.gift_type = "amount";
                    let find_gift = matchchallenge.matchpricecards.find(function (x) { return x.gift_type == "gift" });
                    if (find_gift) {
                        matchchallenge.gift_image = `${constant.BASE_URL}${find_gift.image}`;
                        matchchallenge.gift_type = find_gift.gift_type;
                    }
                    let team_limits;
                    if (matchchallenge.multi_entry == 0) {
                        team_limits = 1
                    } else {
                        team_limits = matchchallenge.team_limit
                    }
                    matchchallenge.isselected = isselected;
                    matchchallenge.team_limit = team_limits;
                    matchchallenge.refercode = refercode;
                    matchchallenge.matchchallengeid = matchchallenge._id;
                    matchchallenge.status = 1;
                    matchchallenge.joinedleauges = matchchallenge.joinedleauge.length;
                    matchchallenge.total_joinedcontest = total_joinedcontestData || 0;
                    matchchallenge.total_teams = total_teams || 0;
                    matchchallenge.totalwinners = totalwinners
                    //cat.contest=Object.assign({}, ...cat.contest);

                }
                //cat.contest=Object.assign({}, ...cat.contest);
                a.push({ ...cat, contest: undefined }, ...cat.contest);
            }

            return {
                message: 'Contest of A Perticular Match',
                status: true,
                data: a
            }
        } catch (error) {
            console.log('error', error);
        }
    }

    /**
     * @function getAllContests
     * @description Gat All Contest Of A Match By there Category
     * @param { matchkey }
     */
    async getAllContests(req) {
        try {
            //await this.updateJoinedusers(req);
            let finalData = [],
                contest_arr = [],
                aggpipe = [];


            aggpipe.push({
                $match: { matchkey: mongoose.Types.ObjectId(req.query.matchkey), status: "opened", is_private: 0 },
            });
            aggpipe.push({
                $lookup: {
                    from: 'contestcategories',
                    localField: 'contest_cat',
                    foreignField: '_id',
                    as: 'contestcategories'
                }
            });

            aggpipe.push({
                $sort: { "contestcategories.Order": 1, 'win_amount': -1 }
            });
            const matchchallengesData = await matchchallengesModel.aggregate(aggpipe);
            let i = 0;
            if (matchchallengesData.length == 0) {
                return {
                    message: "No Challenge Available For This Match",
                    status: true,
                    data: []
                }
            }
            let [total_teams, total_joinedcontestData] = await Promise.all([
                JoinTeamModel.countDocuments({ userid: req.user._id, matchkey: req.query.matchkey }),
                this.getJoinleague(req.user._id, req.query.matchkey)
            ]);
            for await (const matchchallenge of matchchallengesData) {
                i++;
                let isselected = false,
                    refercode = '',
                    winners = 0;
                const price_card = [];
                const joinedleauge = await JoinLeaugeModel.find({
                    matchkey: req.query.matchkey,
                    challengeid: matchchallenge._id,
                    userid: req.user._id,
                }).select('_id refercode');

                if (joinedleauge.length > 0) {
                    refercode = joinedleauge[0].refercode;
                    if (matchchallenge.multi_entry == 1 && joinedleauge.length < 11) {
                        if (matchchallenge.contest_type == 'Amount') {
                            if (joinedleauge.length == 11 || matchchallenge.joinedusers == matchchallenge.maximum_user)
                                isselected = true;
                        } else if (matchchallenge.contest_type == 'Percentage') {
                            if (joinedleauge.length == 11) isselected = true;
                        } else isselected = false;
                    } else isselected = true;
                }
                if (matchchallenge.matchpricecards) {
                    if (matchchallenge.matchpricecards.length > 0) {
                        for await (const priceCard of matchchallenge.matchpricecards) {
                            winners += Number(priceCard.winners);
                            const tmpObj = {
                                id: priceCard._id,
                                winners: priceCard.winners,
                                total: priceCard.total,
                            };
                            if ((priceCard.price && Number(priceCard.price) == 0) || priceCard.type == 'Percentage') {
                                tmpObj['price'] = (Number(priceCard.total) / Number(priceCard.winners)).toFixed(2);
                                tmpObj['price_percent'] = `${priceCard.price_percent}%`;
                            } else {
                                tmpObj['gift_type'] = priceCard.gift_type;
                                if (matchchallenge.amount_type == "prize") {
                                    tmpObj['price'] = priceCard.prize_name;
                                    tmpObj['image'] = `${constant.BASE_URL}${priceCard.image}`;
                                } else {
                                    tmpObj['price'] = Number(priceCard.price).toFixed(2);
                                    tmpObj['image'] = '';
                                }
                            }

                            if (priceCard.min_position + 1 != priceCard.max_position) tmpObj['start_position'] = `${Number(priceCard.min_position) + 1}-${priceCard.max_position}`;
                            else tmpObj['start_position'] = `${priceCard.max_position}`;
                            price_card.push(tmpObj);
                        }
                    } else {
                        price_card.push({
                            id: 0,
                            winners: 1,
                            price: matchchallenge.win_amount,
                            total: matchchallenge.win_amount,
                            start_position: 1,
                            image: '',
                            gift_type: "amount"
                        });
                        winners = 1;
                    }


                } else {
                    price_card.push({
                        id: 0,
                        winners: 1,
                        price: matchchallenge.win_amount,
                        total: matchchallenge.win_amount,
                        start_position: 1,
                    });
                    winners = 1;
                }
                let gift_image = "";
                let gift_type = "amount";
                let find_gift = matchchallenge.matchpricecards.find(function (x) { return x.gift_type == "gift" });
                if (find_gift) {
                    gift_image = `${constant.BASE_URL}${find_gift.image}`;
                    gift_type = find_gift.gift_type;
                }
                let team_limits;
                if (matchchallenge.multi_entry == 0) {
                    team_limits = 1
                } else {
                    team_limits = matchchallenge.team_limit
                }
                finalData.push({
                    matchchallengeid: matchchallenge._id,
                    catid: matchchallenge.contest_cat ? matchchallenge.contestcategories[0]._id : '',
                    cat_order: matchchallenge.contest_cat ? matchchallenge.contestcategories[0].Order : '',
                    catname: matchchallenge.contest_cat ? matchchallenge.contestcategories[0].name : '',
                    contest_type: matchchallenge.contest_type,
                    sub_title: matchchallenge.contest_cat ? matchchallenge.contestcategories[0].sub_title : '',
                    image: matchchallenge.contest_cat ? `${constant.BASE_URL}${matchchallenge.contestcategories[0].image}` : `${constant.BASE_URL}logo.png`,
                    winning_percentage: matchchallenge.winning_percentage,
                    entryfee: matchchallenge.entryfee,
                    win_amount: matchchallenge.win_amount,
                    maximum_user: matchchallenge.contest_type == 'Amount' ? matchchallenge.maximum_user : 0,
                    matchkey: req.query.matchkey,
                    joinedusers: matchchallenge.joinedusers,
                    multi_entry: matchchallenge.multi_entry,
                    confirmed_challenge: matchchallenge.confirmed_challenge,
                    confirmed_flexible: matchchallenge.confirmed_flexible,
                    is_running: matchchallenge.is_running,
                    is_bonus: matchchallenge.is_bonus,
                    team_limit: team_limits,
                    bonus_percentage: matchchallenge.bonus_percentage || 0,
                    pricecard_type: matchchallenge.pricecard_type,
                    isselected: isselected,
                    bonus_date: '',
                    isselectedid: '',
                    refercode: refercode,
                    totalwinners: winners,
                    price_card: price_card,
                    status: 1,
                    joinedleauges: joinedleauge.length,
                    total_joinedcontest: total_joinedcontestData || 0,
                    total_teams: total_teams || 0,
                    gift_image: gift_image,
                    gift_type: gift_type,
                });
                if (i == matchchallengesData.length) {
                    return {
                        message: 'Contest of A Perticular Match',
                        status: true,
                        data: finalData
                    }
                }
            }//asd
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * @function getAllContests
     * @description Gat All Contest Of A Match
     * @param { matchkey }
     */
    async getAllContestsWithoutCategory(req) {
        try {
            let finalData = [],
                contest_arr = [],
                aggpipe = [];
            aggpipe.push({
                $match: { matchkey: mongoose.Types.ObjectId(req.query.matchkey) }
            });
            aggpipe.push({
                $match: {
                    $expr: {
                        $eq: ['$status', 'opened']
                    }
                }
            });
            if (req.query.catid) {
                aggpipe.push({
                    $match: { contest_cat: mongoose.Types.ObjectId(req.query.catid) }
                });
            }
            aggpipe.push({
                $sort: { 'win_amount': -1 }
            });
            const matchchallengesData = await matchchallengesModel.aggregate(aggpipe);
            let i = 0;
            if (matchchallengesData.length == 0) {
                return {
                    message: "No Challenge Available For This Match",
                    status: true,
                    data: []
                }
            }
            for await (const matchchallenge of matchchallengesData) {
                i++;
                let isselected = false,
                    refercode = '',
                    winners = 0;
                const price_card = [];
                const joinedleauge = await JoinLeaugeModel.find({
                    matchkey: req.query.matchkey,
                    challengeid: matchchallenge._id,
                    userid: req.user._id,
                }).select('_id refercode');
                if (joinedleauge.length > 0) {
                    refercode = joinedleauge[0].refercode;
                    if (matchchallenge.multi_entry == 1 && joinedleauge.length < 11) {
                        if (matchchallenge.contest_type == 'Amount') {
                            if (joinedleauge.length == 11 || matchchallenge.joinedusers == matchchallenge.maximum_user)
                                isselected = true;
                        } else if (matchchallenge.contest_type == 'Percentage') {
                            if (joinedleauge.length == 11) isselected = true;
                        } else isselected = false;
                    } else isselected = true;
                }
                if (matchchallenge.matchpricecards) {
                    if (matchchallenge.matchpricecards.length > 0) {
                        for await (const priceCard of matchchallenge.matchpricecards) {
                            winners += Number(priceCard.winners);
                            const tmpObj = {
                                id: priceCard._id,
                                winners: priceCard.winners,
                                total: priceCard.total,
                            };
                            tmpObj.gift_type = priceCard.gift_type;
                            if (matchchallenge.amount_type == 'prize') {
                                if (priceCard.gift_type == "gift") {
                                    tmpObj.image = `${constant.BASE_URL}/${priceCard.image}`;
                                    tmpObj.price = priceCard.prize_name;
                                } else {
                                    tmpObj.price = priceCard.price;
                                    tmpObj.image = '';
                                }
                            } else {
                                tmpObj.price = priceCard.price;
                                tmpObj.image = '';
                            }
                            if ((priceCard.price && Number(priceCard.price) == 0) || priceCard.type == 'Percentage') {
                                tmpObj['price'] = (Number(priceCard.total) / Number(priceCard.winners)).toFixed(2);
                                tmpObj['price_percent'] = `${priceCard.price_percent}%`;
                            } else {
                                tmpObj['price'] = Number(priceCard.price).toFixed(2);
                            }
                            if (priceCard.min_position + 1 != priceCard.max_position) tmpObj['start_position'] = `${Number(priceCard.min_position) + 1}-${priceCard.max_position}`;
                            else tmpObj['start_position'] = `${priceCard.max_position}`;
                            price_card.push(tmpObj);
                        }
                    } else {
                        price_card.push({
                            id: 0,
                            winners: 1,
                            price: matchchallenge.win_amount,
                            total: matchchallenge.win_amount,
                            start_position: 1,
                            image: "",
                            gift_type: "amount"
                        });
                        winners = 1;
                    }
                } else {
                    price_card.push({
                        id: 0,
                        winners: 1,
                        price: matchchallenge.win_amount,
                        total: matchchallenge.win_amount,
                        start_position: 1,
                        image: "",
                        gift_type: "amount"

                    });
                    winners = 1;
                }
                let gift_image = "";
                let gift_type = "amount";
                let find_gift = matchchallenge.matchpricecards.find(function (x) { return x.gift_type == "gift" });
                if (find_gift) {
                    gift_image = `${constant.BASE_URL}${find_gift.image}`;
                    gift_type = find_gift.gift_type;
                }
                let team_limits;
                if (matchchallenge.multi_entry == 0) {
                    team_limits = 1
                } else {
                    team_limits = matchchallenge.team_limit
                }
                finalData.push({
                    matchchallengeid: matchchallenge._id,
                    catid: matchchallenge.contest_cat,
                    contest_type: matchchallenge.contest_type,
                    winning_percentage: matchchallenge.winning_percentage,
                    entryfee: matchchallenge.entryfee,
                    win_amount: matchchallenge.win_amount,
                    maximum_user: matchchallenge.contest_type == 'Amount' ? matchchallenge.maximum_user : 0,
                    matchkey: req.query.matchkey,
                    joinedusers: matchchallenge.joinedusers,
                    multi_entry: matchchallenge.multi_entry,
                    confirmed_challenge: matchchallenge.confirmed_challenge,
                    confirmed_flexible: matchchallenge.confirmed_flexible,
                    is_running: matchchallenge.is_running,
                    is_bonus: matchchallenge.is_bonus,
                    team_limit: team_limits,
                    bonus_percentage: matchchallenge.bonus_percentage || 0,
                    pricecard_type: matchchallenge.pricecard_type,
                    isselected: isselected,
                    bonus_date: '',
                    isselectedid: '',
                    refercode: refercode,
                    totalwinners: winners,
                    price_card: price_card,
                    status: 1,
                    joinedleauges: team_limits,
                    total_joinedcontest: 0,
                    total_teams: 0,
                    gift_image: gift_image,
                    gift_type: gift_type
                });
                //     }
                // }
                if (i == matchchallengesData.length) {
                    finalData.sort(function (a, b) {
                        return b['win_amount'] - a['win_amount'];
                    });
                    return {
                        message: 'Contest of A Perticular Match Without Category',
                        status: true,
                        data: finalData
                    }
                }
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * @function getContests
     * @description Gat A Perticular Contest 
     * @param { matchchallengeid }
     */
    async getContest(req) {
        try {
            let finalData = {},
                aggpipe = [];
            aggpipe.push({
                $match: { _id: mongoose.Types.ObjectId(req.query.matchchallengeid) }
            });
            aggpipe.push({
                $lookup: {
                    from: 'contestcategories',
                    localField: 'contest_cat',
                    foreignField: '_id',
                    as: 'contestcategories'
                }
            });
            aggpipe.push({
                $sort: { 'win_amount': -1 }
            });
            const matchchallengesData = await matchchallengesModel.aggregate(aggpipe);
            console.log("matchchallengedata" + JSON.stringify(matchchallengesData[0].joinedusers))
            let i = 0;
            if (matchchallengesData.length == 0) {
                return {
                    message: "No Challenge Available ..!",
                    status: true,
                    data: {}
                }
            }
            let isselected = false,
                refercode = '',
                winners = 0;
            const price_card = [];
            const joinedleauge = await JoinLeaugeModel.find({
                challengeid: req.query.matchchallengeid,
                userid: req.user._id,
            }).select('_id refercode');

            if (joinedleauge.length > 0) {
                refercode = joinedleauge[0].refercode;
                if (matchchallengesData[0].multi_entry == 1 && joinedleauge.length < 11) {
                    if (matchchallengesData[0].contest_type == 'Amount') {
                        if (joinedleauge.length == 11 || matchchallengesData[0].joinedusers == matchchallengesData[0].maximum_user)
                            isselected = true;
                    } else if (matchchallengesData[0].contest_type == 'Percentage') {
                        if (joinedleauge.length == 11) isselected = true;
                    } else isselected = false;
                } else isselected = true;
            }
            if (matchchallengesData[0].matchpricecards && matchchallengesData[0].matchpricecards.length > 0) {
                for await (const priceCard of matchchallengesData[0].matchpricecards) {
                    winners += Number(priceCard.winners);
                    const tmpObj = {
                        id: priceCard._id,
                        winners: priceCard.winners,
                        total: priceCard.total,
                    };
                    if ((priceCard.price && Number(priceCard.price) == 0) || priceCard.type == 'Percentage') {
                        tmpObj['price'] = (Number(priceCard.total) / Number(priceCard.winners)).toFixed(2);
                        tmpObj['price_percent'] = `${priceCard.price_percent}%`;
                    } else {
                        if (matchchallengesData[0].amount_type == "prize") {
                            tmpObj['price'] = priceCard.prize_name;
                            if (priceCard.image != "") {
                                tmpObj['image'] = `${constant.BASE_URL}${priceCard.image}`,
                                    tmpObj['gift_type'] = "gift"
                            } else {
                                tmpObj['price'] = Number(priceCard.price);
                                tmpObj['gift_type'] = "amount"
                                tmpObj['image'] = ""
                            }
                        } else {
                            tmpObj['price'] = Number(priceCard.price);
                            tmpObj['gift_type'] = "amount"
                            tmpObj['image'] = ""
                        }
                    }
                    if (priceCard.min_position + 1 != priceCard.max_position) tmpObj['start_position'] = `${Number(priceCard.min_position) + 1}-${priceCard.max_position}`;
                    else tmpObj['start_position'] = `${priceCard.max_position}`;

                    tmpObj.amount_type = matchchallengesData[0].amount_type
                    price_card.push(tmpObj);
                }
            } else {
                price_card.push({
                    id: 0,
                    winners: 1,
                    price: matchchallengesData[0].win_amount,
                    total: matchchallengesData[0].win_amount,
                    start_position: 1,
                    amount_type: matchchallengesData[0].amount_type,

                });
                winners = 1;
            }
            let gift_image = "";
            let gift_type = "amount";
            let find_gift = matchchallengesData[0].matchpricecards.find(function (x) { return x.gift_type == "gift" });
            if (find_gift) {
                gift_image = `${constant.BASE_URL}${find_gift.image}`;
                gift_type = find_gift.gift_type;
            }

            console.log("----reqdata---getcontest..",)
            const total_teams = await JoinTeamModel.countDocuments({ matchkey: req.query.matchkey, userid: req.user._id, });
            const total_joinedcontestData = await JoinLeaugeModel.aggregate([
                {
                    $match: {
                        userid: mongoose.Types.ObjectId(req.user._id),
                        matchkey: mongoose.Types.ObjectId(req.query.matchkey)
                    }
                },
                {
                    $group: {
                        _id: "$challengeid",
                    }
                }, {
                    $count: "total_count"
                }
            ])
            let count_JoinTeam = total_joinedcontestData[0]?.total_count
            finalData = {
                matchchallengeid: matchchallengesData[0]._id,
                winning_percentage: matchchallengesData[0].winning_percentage,
                entryfee: matchchallengesData[0].entryfee,
                win_amount: matchchallengesData[0].win_amount,
                contest_type: matchchallengesData[0].contest_type,
                maximum_user: matchchallengesData[0].contest_type == 'Amount' ? matchchallengesData[0].maximum_user : 0,
                joinedusers: matchchallengesData[0].joinedusers,
                multi_entry: matchchallengesData[0].multi_entry,
                confirmed_challenge: matchchallengesData[0].confirmed_challenge,
                confirmed_flexible: matchchallengesData[0].confirmed_flexible,
                is_running: matchchallengesData[0].is_running,
                amount_type: matchchallengesData[0].amount_type,
                is_bonus: matchchallengesData[0].is_bonus,
                team_limit: matchchallengesData[0].team_limit,
                joinedleauge: joinedleauge,  //matchchallengesData[0].joinedusers,     //matchchallengesData[0].team_limit,
                joinedleauges: joinedleauge.length,
                total_joinedcontest: 0,
                total_teams: total_teams, //0,
                bonus_percentage: matchchallengesData[0].bonus_percentage || 0,
                pricecard_type: matchchallengesData[0].pricecard_type,
                isselected: isselected,
                bonus_date: '',
                isselectedid: '',
                refercode: refercode,
                totalwinners: winners,
                price_card: price_card,
                status: 1,
                gift_type: gift_type,
                gift_image: gift_image
            }
            //     }
            // }
            return {
                message: "Match Challenge Data ..!",
                status: true,
                data: finalData
            }
        } catch (error) {
            throw error;
        }
    }
    async getJoinleague(userId, matchkey) {
        const total_joinedcontestData = await JoinLeaugeModel.aggregate([
            {
                $match: {
                    userid: mongoose.Types.ObjectId(userId),
                    matchkey: mongoose.Types.ObjectId(matchkey)
                }
            },
            {
                $group: {
                    _id: "$challengeid",
                }
            }, {
                $count: "total_count"
            }
        ])
        return total_joinedcontestData[0]?.total_count;
    }
    /**
     * @function joinContest
     * @description Contest Joining
     * @param { matchkey,challengeid,teamid }
     */
    async joinContest(req) {
        try {
            const { matchchallengeid, jointeamid } = req.body;
            let totalchallenges = 0,
                totalmatches = 0,
                totalseries = 0,
                joinedMatch = 0,
                joinedSeries = 0,
                aggpipe = [];


            aggpipe.push({
                $match: { _id: mongoose.Types.ObjectId(matchchallengeid) }
            });
            aggpipe.push({
                $lookup: {
                    from: 'listmatches',
                    localField: 'matchkey',
                    foreignField: '_id',
                    as: 'listmatch'
                }
            });
            const matchchallengesData = await matchchallengesModel.aggregate(aggpipe);
            let listmatchId = matchchallengesData[0].listmatch[0]._id;
            let matchchallengesDataId = matchchallengesData[0]._id;
            let matchchallenge = matchchallengesData[0];
            let seriesId = matchchallengesData[0].listmatch[0].series;
            let matchStartDate = matchchallengesData[0].listmatch[0].start_date;
            if (matchchallengesData.length == 0) {
                return { message: 'Match Not Found', status: false, data: {} };
            }
            const matchTime = await matchServices.getMatchTime(matchStartDate);
            if (matchTime === false) {
                return {
                    message: 'Match has been closed, You cannot join leauge now.',
                    status: false,
                    data: {}
                }
            }
            const jointeamids = jointeamid.split(',');

            const jointeamsCount = await JoinTeamModel.find({ _id: { $in: jointeamids } });
            if (jointeamids.length != jointeamsCount.length) return { message: 'Invalid Team', status: false, data: {} }

            const user = await userModel.findOne({ _id: req.user._id }, { userbalance: 1, user_verify: 1 });
            
            if (!user || !user.userbalance) return { message: 'Insufficient balance', status: false, data: {} };
            const bonus = parseFloat(user.userbalance.bonus.toFixed(2));
            const balance = parseFloat(user.userbalance.balance.toFixed(2));
            const winning = parseFloat(user.userbalance.winning.toFixed(2));
            const totalBalance = bonus + balance + winning;
            let i = 0,
                count = 0,
                mainbal = 0,
                mainbonus = 0,
                mainwin = 0,
                tranid = '';
            for (const jointeam of jointeamsCount) {
                i++;
                const result = await this.findJoinLeaugeExist(listmatchId, req.user._id, jointeam._id, matchchallenge);

                if (result != 1 && result != 2 && i > 1) {

                    const userObj = {
                        'userbalance.balance': balance - mainbal,
                        'userbalance.bonus': bonus - mainbonus,
                        'userbalance.winning': winning - mainwin,
                        $inc: {
                            totalchallenges: totalchallenges,
                            totalmatches: totalmatches,
                            totalseries: totalseries,
                        },
                    };
                    let randomStr = randomstring.generate({
                        length: 4,
                        charset: 'alphabetic',
                        capitalization: 'uppercase'
                    });

                    const transactiondata = {
                        type: 'Contest Joining Fee',
                        contestdetail: `${matchchallenge.entryfee}-${count}`,
                        amount: matchchallenge.entryfee * count,
                        total_available_amt: totalBalance - matchchallenge.entryfee * count,
                        transaction_by: constant.TRANSACTION_BY.WALLET,
                        challengeid: matchchallengeid,
                        userid: req.user._id,
                        paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED,
                        bal_bonus_amt: bonus - mainbonus,
                        bal_win_amt: winning - mainwin,
                        bal_fund_amt: balance - mainbal,
                        cons_amount: mainbal,
                        cons_bonus: mainbonus,
                        cons_win: mainwin,
                        transaction_id: tranid != '' ? tranid : `${constant.APP_SHORT_NAME}-${Date.now()}-${randomStr}`,
                    };

                    await Promise.all([
                        userModel.findOneAndUpdate({ _id: req.user._id }, userObj, { new: true }),
                        TransactionModel.create(transactiondata)
                    ]);
                    return result;
                } else if (result != 1 && result != 2) {

                    return result;
                }
                const resultForBonus = await this.findUsableBonusMoney(
                    matchchallenge,
                    bonus - mainbonus,
                    winning - mainwin,
                    balance - mainbal
                );
                if (resultForBonus == false) {

                    if (i > 1) {
                        const userObj = {
                            'userbalance.balance': balance - mainbal,
                            'userbalance.bonus': bonus - mainbonus,
                            'userbalance.winning': winning - mainwin,
                            $inc: {
                                totalchallenges: totalchallenges,
                                totalmatches: totalmatches,
                                totalseries: totalseries,
                            },
                        };
                        let randomStr = randomstring.generate({
                            length: 4,
                            charset: 'alphabetic',
                            capitalization: 'uppercase'
                        });
                        const transactiondata = {
                            type: 'Contest Joining Fee',
                            contestdetail: `${matchchallenge.entryfee}-${count}`,
                            amount: matchchallenge.entryfee * count,
                            total_available_amt: totalBalance - matchchallenge.entryfee * count,
                            transaction_by: constant.TRANSACTION_BY.WALLET,
                            challengeid: matchchallengeid,
                            userid: req.user._id,
                            paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED,
                            bal_bonus_amt: bonus - mainbonus,
                            bal_win_amt: winning - mainwin,
                            bal_fund_amt: balance - mainbal,
                            cons_amount: mainbal,
                            cons_bonus: mainbonus,
                            cons_win: mainwin,
                            transaction_id: tranid != '' ? tranid : `${constant.APP_SHORT_NAME}-${Date.now()}-${randomStr}`,
                        };
                        await Promise.all([
                            userModel.findOneAndUpdate({ _id: req.user._id }, userObj, { new: true }),
                            TransactionModel.create(transactiondata)
                        ]);
                    }
                    return { message: 'Insufficient balance', status: false, data: {} };
                }
                const resultForBalance = await this.findUsableBalanceMoney(resultForBonus, balance - mainbal);
                const resultForWinning = await this.findUsableWinningMoney(resultForBalance, winning - mainwin);
                if (resultForWinning.reminingfee > 0) {
                    if (i > 1) {
                        const userObj = {
                            'userbalance.balance': balance - mainbal,
                            'userbalance.bonus': bonus - mainbonus,
                            'userbalance.winning': winning - mainwin,
                            $inc: {
                                totalchallenges: totalchallenges,
                                totalmatches: totalmatches,
                                totalseries: totalseries,
                            },
                        };
                        let randomStr = randomstring.generate({
                            length: 4,
                            charset: 'alphabetic',
                            capitalization: 'uppercase'
                        });

                        const transactiondata = {
                            type: 'Contest Joining Fee',
                            contestdetail: `${matchchallenge.entryfee}-${count}`,
                            amount: matchchallenge.entryfee * count,
                            total_available_amt: totalBalance - matchchallenge.entryfee * count,
                            transaction_by: constant.TRANSACTION_BY.WALLET,
                            challengeid: matchchallengeid,
                            userid: req.user._id,
                            paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED,
                            bal_bonus_amt: bonus - mainbonus,
                            bal_win_amt: winning - mainwin,
                            bal_fund_amt: balance - mainbal,
                            cons_amount: mainbal,
                            cons_bonus: mainbonus,
                            cons_win: mainwin,
                            transaction_id: tranid != '' ? tranid : `${constant.APP_SHORT_NAME}-${Date.now()}-${randomStr}`,
                        };
                        await Promise.all([
                            userModel.findOneAndUpdate({ _id: req.user._id }, userObj, { new: true }),
                            TransactionModel.create(transactiondata)
                        ]);
                    }
                    return { message: 'Insufficient balance', status: false, data: {} };
                }
                let randomStr = randomstring.generate({
                    length: 4,
                    charset: 'alphabetic',
                    capitalization: 'uppercase'
                });

                const coupon = randomstring.generate({ charset: 'alphanumeric', length: 4, });
                tranid = `${constant.APP_SHORT_NAME}-${Date.now()}-${randomStr}`;
                let referCode = `${constant.APP_SHORT_NAME}-${Date.now()}${coupon}`;
                if (result == 1) {

                    joinedMatch = await JoinLeaugeModel.find({ matchkey: listmatchId, userid: req.user._id }).limit(1).count();
                    if (joinedMatch == 0) {
                        joinedSeries = await JoinLeaugeModel.find({ seriesid: seriesId, userid: req.user._id }).limit(1).count();
                    }
                }
                const joinedLeauges = await JoinLeaugeModel.find({ challengeid: matchchallengesDataId }).count();
                const joinUserCount = joinedLeauges + 1;
                if (matchchallenge.contest_type == 'Amount' && joinUserCount > matchchallenge.maximum_user) {
                    if (i > 1) {
                        const userObj = {
                            'userbalance.balance': balance - mainbal,
                            'userbalance.bonus': bonus - mainbonus,
                            'userbalance.winning': winning - mainwin,
                            $inc: {
                                totalchallenges: totalchallenges,
                                totalmatches: totalmatches,
                                totalseries: totalseries,
                            },
                        };
                        let randomStr = randomstring.generate({
                            length: 4,
                            charset: 'alphabetic',
                            capitalization: 'uppercase'
                        });
                        const transactiondata = {
                            type: 'Contest Joining Fee',
                            contestdetail: `${matchchallenge.entryfee}-${count}`,
                            amount: matchchallenge.entryfee * count,
                            total_available_amt: totalBalance - matchchallenge.entryfee * count,
                            transaction_by: constant.TRANSACTION_BY.WALLET,
                            challengeid: matchchallengeid,
                            userid: req.user._id,
                            paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED,
                            bal_bonus_amt: bonus - mainbonus,
                            bal_win_amt: winning - mainwin,
                            bal_fund_amt: balance - mainbal,
                            cons_amount: mainbal,
                            cons_bonus: mainbonus,
                            cons_win: mainwin,
                            transaction_id: tranid != '' ? tranid : `${constant.APP_SHORT_NAME}-${Date.now()}-${randomStr}`,
                        };
                        await Promise.all([
                            userModel.findOneAndUpdate({ _id: req.user._id }, userObj, { new: true }),
                            TransactionModel.create(transactiondata)
                        ]);
                    }
                    return { message: 'League is Closed', status: false, data: {} };
                }

                const joinLeaugeResult = await JoinLeaugeModel.create({
                    userid: req.user._id,
                    challengeid: matchchallengesDataId,
                    teamid: jointeam._id,
                    matchkey: listmatchId,
                    seriesid: seriesId,
                    transaction_id: tranid,
                    refercode: referCode,
                    teamnumber: jointeam.teamnumber,
                    leaugestransaction: {
                        user_id: req.user._id,
                        bonus: resultForBonus.cons_bonus,
                        balance: resultForBalance.cons_amount,
                        winning: resultForWinning.cons_win,
                    },
                });
                await leaderBoardModel.create({
                    userId: req.user._id,
                    challengeid: matchchallengesDataId,
                    teamId: jointeam._id,
                    matchkey: listmatchId,
                    user_team: user.team,
                    teamnumber: jointeam.teamnumber,
                    joinId: joinLeaugeResult._id
                });
                const joinedLeaugesCount = await JoinLeaugeModel.find({ challengeid: matchchallengesDataId }).count();
                if (result == 1) {
                    totalchallenges = 1;
                    if (joinedMatch == 0) {
                        totalmatches = 1;
                        if (joinedMatch == 0 && joinedSeries == 0) {
                            totalseries = 1;
                        }
                    }
                }
                count++;

                if (joinLeaugeResult._id) {
                    mainbal = mainbal + resultForBalance.cons_amount;
                    mainbonus = mainbonus + resultForBonus.cons_bonus;
                    mainwin = mainwin + resultForWinning.cons_win;
                    if (matchchallenge.contest_type == 'Amount' && joinedLeaugesCount == matchchallenge.maximum_user && matchchallenge.is_running != 1) {
                        await matchchallengesModel.findOneAndUpdate({ matchkey: listmatchId, _id: mongoose.Types.ObjectId(matchchallengeid) }, {
                            status: 'closed',
                            joinedusers: joinedLeaugesCount,
                        }, { new: true });
                    } else {
                        const gg = await matchchallengesModel.findOneAndUpdate({ matchkey: listmatchId, _id: mongoose.Types.ObjectId(matchchallengeid) }, {
                            status: 'opened',
                            joinedusers: joinedLeaugesCount,
                        }, { new: true });
                    }
                } else
                    await matchchallengesModel.findOneAndUpdate({ matchkey: listmatchId, _id: mongoose.Types.ObjectId(matchchallengeid) }, {
                        status: 'opened',
                        joinedusers: joinedLeaugesCount,
                    }, { new: true });
                if (i == jointeamsCount.length) {
                    const userObj = {
                        'userbalance.balance': balance - mainbal,
                        'userbalance.bonus': bonus - mainbonus,
                        'userbalance.winning': winning - mainwin,
                        $inc: {
                            totalchallenges: totalchallenges,
                            totalmatches: totalmatches,
                            totalseries: totalseries,
                        },
                    };
                    let randomStr = randomstring.generate({
                        length: 4,
                        charset: 'alphabetic',
                        capitalization: 'uppercase'
                    });
                    const transactiondata = {
                        type: 'Contest Joining Fee',
                        contestdetail: `${matchchallenge.entryfee}-${count}`,
                        amount: matchchallenge.entryfee * count,
                        total_available_amt: totalBalance - matchchallenge.entryfee * count,
                        transaction_by: constant.TRANSACTION_BY.WALLET,
                        challengeid: matchchallengeid,
                        userid: req.user._id,
                        paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED,
                        bal_bonus_amt: bonus - mainbonus,
                        bal_win_amt: winning - mainwin,
                        bal_fund_amt: balance - mainbal,
                        cons_amount: mainbal,
                        cons_bonus: mainbonus,
                        cons_win: mainwin,
                        transaction_id: tranid != '' ? tranid : `${constant.APP_SHORT_NAME}-${Date.now()}-${randomStr}`,
                    };
                    Promise.all([
                        userModel.findOneAndUpdate({ _id: req.user._id }, userObj, { new: true }),
                        TransactionModel.create(transactiondata)
                    ]);

                    return {
                        message: 'Contest Joined',
                        status: true,
                        data: {
                            joinedusers: joinedLeaugesCount,
                            referCode: referCode
                        }
                    };
                }

            }

        } catch (error) {
            throw error;
        }
    }

    /**
     * @function findJoinLeaugeExist
     * @description Find Join League Exist
     * @param { matchkey, userId, teamId, challengeDetails }
     */
    async findJoinLeaugeExist(matchkey, userId, teamId, challengeDetails) {
        if (!challengeDetails || challengeDetails == null || challengeDetails == undefined) return 4;

        const joinedLeauges = await JoinLeaugeModel.find({
            matchkey: matchkey,
            challengeid: challengeDetails._id,
            userid: userId,
        });
        if (joinedLeauges.length == 0) return 1;
        if (joinedLeauges.length > 0) {
            if (challengeDetails.multi_entry == 0) {
                return { message: 'Contest Already joined', status: false, data: {} };
            } else {
                if (joinedLeauges.length >= challengeDetails.team_limit) {
                    return { message: 'You cannot join with more teams now.', status: false, data: {} };
                } else {
                    const joinedLeaugesCount = joinedLeauges.filter(item => {
                        return item.teamid.toString() === teamId;
                    });
                    if (joinedLeaugesCount.length) return { message: 'Team already joined', status: false, data: {} };
                    else return 2;
                }
            }
        }
    }

    /**
     * @function findUsableBonusMoney
     * @description Join League bouns amount use
     * @param { challengeDetails, bonus, winning, balance }
     */
    async findUsableBonusMoney(challengeDetails, bonus, winning, balance) {
        if (challengeDetails.is_private == 1 && challengeDetails.is_bonus != 1)
            return { bonus: bonus, cons_bonus: 0, reminingfee: challengeDetails.entryfee };
        let totalChallengeBonus = 0;
        totalChallengeBonus = (challengeDetails.bonus_percentage / 100) * challengeDetails.entryfee;

        const finduserbonus = bonus;
        let findUsableBalance = winning + balance;
        let bonusUseAmount = 0;
        if (finduserbonus >= totalChallengeBonus)
            (findUsableBalance += totalChallengeBonus), (bonusUseAmount = totalChallengeBonus);
        else findUsableBalance += bonusUseAmount = finduserbonus;
        if (findUsableBalance < challengeDetails.entryfee) return false;
        if (bonusUseAmount >= challengeDetails.entryfee) {
            return {
                bonus: finduserbonus - challengeDetails.entryfee,
                cons_bonus: challengeDetails.entryfee || 0,
                reminingfee: 0,
            };
        } else {
            return {
                bonus: finduserbonus - bonusUseAmount,
                cons_bonus: bonusUseAmount,
                reminingfee: challengeDetails.entryfee - bonusUseAmount,
            };
        }
    }

    /**
     * @function findUsableBalanceMoney
     * @description Join League balance amount use
     * @param { resultForBonus,balance }
     */
    async findUsableBalanceMoney(resultForBonus, balance) {
        if (balance >= resultForBonus.reminingfee)
            return {
                balance: balance - resultForBonus.reminingfee,
                cons_amount: resultForBonus.reminingfee,
                reminingfee: 0,
            };
        else
            return { balance: 0, cons_amount: balance, reminingfee: resultForBonus.reminingfee - balance };
    }

    /**
     * @function findUsableWinningMoney
     * @description Join League winning amount use
     * @param { resultforbalance,winning }
     */
    async findUsableWinningMoney(resultForBalance, winning) {
        if (winning >= resultForBalance.reminingfee) {
            return {
                winning: winning - resultForBalance.reminingfee,
                cons_win: resultForBalance.reminingfee,
                reminingfee: 0,
            };
        } else { return { winning: 0, cons_win: winning, reminingfee: resultForBalance.reminingfee - winning }; }
    }

    /**
     * @function myJoinedContests
     * @description Contest Joining
     * @param { matchkey }
     */
    async myJoinedContests(req) {
        try {
            const { matchkey } = req.query;
            let skip = (req.query?.skip) ? Number(req.query.skip) : 0;
            let limit = (req.query?.limit) ? Number(req.query.limit) : 10;
            const aggPipe = [];
            aggPipe.push({
                $match: {
                    userid: mongoose.Types.ObjectId(req.user._id),
                    matchkey: mongoose.Types.ObjectId(matchkey),
                }
            });
            aggPipe.push({
                $group: {
                    _id: '$challengeid',
                    joinedleaugeId: { $first: '$_id' },
                    matchkey: { $first: '$matchkey' },
                    jointeamid: { $first: '$teamid' },
                    userid: { $first: '$userid' },
                },
            });
            aggPipe.push({
                $lookup: {
                    from: 'matchchallenges',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'matchchallenge'
                }
            });
            aggPipe.push({
                $unwind: {
                    path: "$matchchallenge"
                }
            })
            aggPipe.push({
                $match: { "matchchallenge.status": { $ne: "canceled" } }
            });
            aggPipe.push({
                $lookup: {
                    from: "joinedleauges",
                    let: { matchchallengeid: "$matchchallenge._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$$matchchallengeid",
                                                "$challengeid",
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "leaderboards",
                                let: { joinid: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    {
                                                        $eq: ["$$joinid", "$joinId"],
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            points: 1,
                                            userId: 1,
                                            teamnumber: 1,
                                            rank: 1,
                                            teamId: 1
                                        },
                                    },
                                ],
                                as: "jointeam",
                            },
                        },
                        {
                            $unwind: {
                                path: "$jointeam",
                            },
                        },
                        {
                            $sort: {
                                'jointeam.rank': 1
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                jointeam: 1,
                                refercode: { $ifNull: ["$refercode", 0] },
                            },
                        },
                    ],

                    as: "jointeamids",
                }
            });

            aggPipe.push({
                $lookup: {
                    from: "finalresults",
                    let: { matchchallengeid: "$matchchallenge._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$$matchchallengeid",
                                                "$challengeid",
                                            ],
                                        },
                                        {
                                            $eq: [
                                                "$userid",
                                                mongoose.Types.ObjectId(req.user._id),
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                            },
                        },
                    ],
                    as: "finalresults",
                }
            });

            aggPipe.push({
                $sort: {
                    'win_amount': -1,
                }
            });

            aggPipe.push({
                $lookup: {
                    from: "listmatches",
                    localField: "matchkey",
                    foreignField: "_id",
                    as: "listmatch",
                }
            });

            aggPipe.push({
                $project: {
                    jointeamid: 1,
                    matchchallengeid: "$matchchallenge._id",
                    userid: 1,
                    joinedleaugeId: 1,
                    win_amount: "$matchchallenge.win_amount",
                    contest_cat: "$matchchallenge.contest_cat",
                    is_bonus: {
                        $ifNull: ["$matchchallenge.is_bonus", 0],
                    },
                    bonus_percentage: {
                        $ifNull: [
                            "$matchchallenge.bonus_percentage",
                            0,
                        ],
                    },
                    is_private: {
                        $ifNull: ["$matchchallenge.is_private", 0],
                    },
                    winning_percentage:
                        "$matchchallenge.winning_percentage",
                    contest_type: {
                        $ifNull: ["$matchchallenge.contest_type", ""],
                    },
                    multi_entry: {
                        $ifNull: ["$matchchallenge.multi_entry", ""],
                    },
                    contest_name: {
                        $ifNull: ["$matchchallenge.contest_name", ""],
                    },
                    confirmed: {
                        $ifNull: [
                            "$matchchallenge.confirmed_challenge",
                            0,
                        ],
                    },
                    flexible: {
                        $ifNull: [
                            "$matchchallenge.confirmed_flexible",
                            0,
                        ],
                    },
                    matchkey: {
                        $ifNull: ["$matchchallenge.matchkey", 0],
                    },
                    joinedusers: {
                        $ifNull: ["$matchchallenge.joinedusers", 0],
                    },
                    entryfee: {
                        $ifNull: ["$matchchallenge.entryfee", 0],
                    },
                    pricecard_type: {
                        $ifNull: [
                            "$matchchallenge.pricecard_type",
                            0,
                        ],
                    },
                    maximum_user: {
                        $ifNull: ["$matchchallenge.maximum_user", 0],
                    },
                    team_limit: {
                        $ifNull: ["$matchchallenge.team_limit", 11],
                    },
                    matchFinalstatus: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    "$listmatch.final_status",
                                    0,
                                ],
                            },
                            "",
                        ],
                    },
                    matchpricecards:
                        "$matchchallenge.matchpricecards",
                    matchChallengeStatus: "$matchchallenge.status",
                    jointeams: {
                        $filter: {
                            input: "$jointeamids.jointeam",
                            as: "team",
                            cond: {
                                $eq: [
                                    "$$team.userId",
                                    mongoose.Types.ObjectId(req.user._id),
                                ],
                            },
                        },
                    },
                    bonus_date: "",
                    totaljointeams: "$jointeamids.jointeam",
                    jointeamids: "$jointeamids",
                    refercode: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    "$jointeamids.refercode",
                                    0,
                                ],
                            },
                            0,
                        ],
                    },
                    finalresultsAmount: {
                        $ifNull: [
                            {
                                $arrayElemAt: ["$finalresults.amount", 0],
                            },
                            0,
                        ],
                    },
                    amount_type: { $ifNull: ["$matchchallenge.amount_type", ""] },
                }
            });
            aggPipe.push({
                $lookup: {
                    from: "jointeams",
                    let: { joinIds: "$jointeams.teamId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ["$_id", "$$joinIds"] },
                            },
                        },
                        {
                            $lookup: {
                                from: "players",
                                localField: "captain",
                                foreignField: "_id",
                                as: "cap",
                            },
                        },
                        {
                            $lookup: {
                                from: "players",
                                localField: "vicecaptain",
                                foreignField: "_id",
                                as: "vice",
                            },
                        }, {
                            $unwind: {
                                path: "$cap"
                            }
                        }, {
                            $unwind: {
                                path: "$vice"
                            }
                        },
                        {
                            $project: {
                                captain: "$cap.player_name",
                                vicecaptain: "$vice.player_name",

                            }
                        }
                    ],
                    as: "userTeams",
                }
            });
            aggPipe.push({
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            });
            const JoinContestData = await JoinLeaugeModel.aggregate(aggPipe);
            let i = 0;
            const finalData = [];
            if (JoinContestData[0].data.length == 0) return { message: 'Data Not Found', status: true, data: [] };
            for await (const challanges of JoinContestData[0].data) {
                const tmpObj = {
                    userrank: challanges.jointeams[0].rank,
                    userpoints: challanges.jointeams[0].points,
                    userteamnumber: challanges.jointeams[0].teamnumber,
                    win_amount_str: challanges.win_amount != 0 ? `Win ₹${challanges.win_amount}` : '',
                    jointeamid: challanges.jointeamid,
                    joinedleaugeId: challanges.joinedleaugeId,
                    matchchallengeid: challanges.matchchallengeid,
                    matchkey: challanges.matchkey,
                    challenge_id: challanges.challangeid,
                    refercode: challanges.refercode,
                    contest_name: challanges.contest_name,
                    win_amount: challanges.win_amount != 0 ? challanges.win_amount : 0,
                    is_private: challanges.is_private != 0 ? challanges.is_private : 0,
                    is_bonus: challanges.is_bonus != 0 ? challanges.is_bonus : 0,
                    bonus_percentage: challanges.bonus_percentage != 0 ? challanges.bonus_percentage : 0,
                    winning_percentage: challanges.winning_percentage != 0 ? challanges.winning_percentage : 0,
                    contest_type: challanges.contest_type != '' ? challanges.contest_type : '',
                    confirmed_challenge: challanges.confirmed != 0 ? challanges.confirmed : 0,
                    confirmed_flexible: challanges.flexible != 0 ? challanges.flexible : 0,
                    multi_entry: challanges.multi_entry != 0 ? challanges.multi_entry : 0,
                    joinedusers: challanges.joinedusers != 0 ? challanges.joinedusers : 0,
                    entryfee: challanges.entryfee != 0 ? challanges.entryfee : 0,
                    pricecard_type: challanges.pricecard_type != 0 ? challanges.pricecard_type : 0,
                    maximum_user: challanges.maximum_user != 0 ? challanges.maximum_user : 0,
                    matchFinalstatus: challanges.matchFinalstatus,
                    matchChallengeStatus: challanges.matchChallengeStatus,
                    totalwinning: Number(challanges.finalresultsAmount).toFixed(2),
                    isselected: true,
                    totalwinners: 1,
                    matchpricecards: [],
                    pricecardstatus: 0,
                    userTeams: challanges.userTeams,
                };
                if (challanges.multi_entry != 0) {
                    tmpObj['team_limit'] = challanges.team_limit;
                    tmpObj['plus'] = '+';
                }
                let k = 0,
                    winners = 0;
                const price_card = [];
                tmpObj['amount_type'] = `${challanges.amount_type}`;
                let gift_image = "";
                let gift_type = "amount";
                let prize_name = "";
                let find_gift = challanges.matchpricecards.find(function (x) { return x.gift_type == "gift" });
                if (find_gift) {
                    gift_image = `${constant.BASE_URL}${find_gift.image}`;
                    gift_type = find_gift.gift_type;
                    prize_name = find_gift.prize_name;
                }
                tmpObj.gift_image = gift_image;
                tmpObj.gift_type = gift_type;
                tmpObj.prize_name = prize_name;
                tmpObj.matchpricecards = challanges.matchpricecards;
                if (challanges.contest_type == 'Percentage') {
                    tmpObj['isselected'] = challanges.jointeams ?
                        challanges.multi_entry == 1 && challanges.jointeams.length < challanges.team_limit ?
                            false :
                            true :
                        false;
                } else {
                    tmpObj['isselected'] = challanges.jointeams ?
                        challanges.multi_entry == 1 &&
                            challanges.jointeams.length < challanges.team_limit &&
                            challanges.totaljointeams.length < challanges.maximum_user ?
                            false :
                            true :
                        false;
                }
                // ------------count of contest and team------------
                const total_teams = await JoinTeamModel.countDocuments({ matchkey: req.query.matchkey, userid: req.user._id, });
                let dataa = [
                    {
                        $match: {
                            userid: mongoose.Types.ObjectId(req.user._id),
                            matchkey: mongoose.Types.ObjectId(req.query.matchkey),
                            challengeid: mongoose.Types.ObjectId(challanges.matchchallengeid)
                        }
                    }, {
                        $count: "total_count"
                    }
                ];
                const total_joinedcontestData = await JoinLeaugeModel.aggregate(dataa);
                tmpObj['total_teams'] = total_teams || 0;
                tmpObj['total_joinedcontest'] = total_joinedcontestData[0]?.total_count || 0;
                finalData.push(tmpObj);
                i++;
                if (i == JoinContestData[0].data.length) return {
                    message: 'Join Contest Data...!',
                    status: true,
                    data: finalData
                };
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * @function getUserRank
     * @description Find rank for user
     * @param { rankArray }
     */
    async getUserRank(rankArray) {
        if (rankArray.length == 0) return [];
        let lrsno = 0,
            uplus = 0,
            sno = 0;
        const getUserRank = [];
        for await (const rankData of rankArray) {
            const found = getUserRank.some((ele) => {
                return ele.points == rankData.points && ele.rank <= lrsno;
            });
            if (found) {
                uplus++;
            } else {
                lrsno++;
                lrsno = lrsno + uplus;
                uplus = 0;
            }
            getUserRank.push({
                rank: lrsno,
                points: rankData.points,
                userid: rankData.userid,
                userjoinedleaugeId: rankData.userjoinedleaugeId,
                userTeamNumber: rankData.userTeamNumber,
            });
            sno++;
            if (sno == rankArray.length) {
                return getUserRank;
            }
        }

        return true;
    };

    /**
     * @function myLeaderboard
     * @description Get Contest LeaderBard
     * @param { matchkey }
     */
    async myLeaderboard(req) {
        try {
            const { matchchallengeid, matchkey } = req.query;
            let skip = (req.query?.skip) ? Number(req.query.skip) : 0;
            let limit = (req.query?.limit) ? Number(req.query.limit) : 10;
            const aggPipe = [];
            let sortarray = [];
            aggPipe.push({
                $match: {
                    'matchkey': mongoose.Types.ObjectId(req.query.matchkey),
                    'challengeid': mongoose.Types.ObjectId(req.query.matchchallengeid)
                }
            });
            aggPipe.push({
                $lookup: {
                    from: "users",
                    localField: "userid",
                    foreignField: "_id",
                    as: "userdata",
                }
            });
            aggPipe.push({
                $unwind: {
                    path: "$userdata"
                }
            });
            aggPipe.push({
                $lookup: {
                    from: "leaderboards",
                    localField: "_id",
                    foreignField: "joinId",
                    as: "leaderboards",
                }
            });
            aggPipe.push({
                $unwind: {
                    path: "$leaderboards"
                }
            });
            aggPipe.push({
                $addFields: {
                    usernumber: {
                        $cond: {
                            if: {
                                $eq: [
                                    "$userid",
                                    mongoose.Types.ObjectId(req.user._id),
                                ],
                            },
                            then: 1,
                            else: 0,
                        },
                    },
                    image: {
                        $cond: {
                            if: {
                                $and: [
                                    {
                                        $ne: ["$userdata.image", null],
                                    },
                                    {
                                        $ne: ["$userdata.image", ""],
                                    },
                                ],
                            },
                            then: "$userdata.image",
                            else: `${constant.BASE_URL}team_image.png`,
                        },
                    },
                }
            });
            aggPipe.push({
                $sort: {
                    usernumber: -1,
                    userid: -1,
                    "leaderboards.teamnumber": 1,
                }
            });

            aggPipe.push({
                $project: {
                    joinleaugeid: "$_id",
                    _id: 0,
                    joinTeamNumber: {
                        $ifNull: ["$leaderboards.teamnumber", 0],
                    },
                    jointeamid: {
                        $ifNull: ["$teamid", ""],
                    },
                    userid: {
                        $ifNull: ["$userid", ""],
                    },
                    team: {
                        $ifNull: ["$userdata.team", ""],
                    },
                    image: {
                        $ifNull: [
                            "$image",
                            `${constant.BASE_URL}user.png`,
                        ],
                    },
                    teamnumber: {
                        $ifNull: ["$leaderboards.teamnumber", 0],
                    },
                    usernumber: 1,
                }
            });

            aggPipe.push({
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            });
            const joinedleauge = await JoinLeaugeModel.aggregate(aggPipe);
            let total_joined_teams = 0;
            console.log('skip', skip);
            if (skip == 0) {
                total_joined_teams = await JoinLeaugeModel.countDocuments({
                    'matchkey': mongoose.Types.ObjectId(req.query.matchkey),
                    'challengeid': mongoose.Types.ObjectId(req.query.matchchallengeid)
                });
            }

            if (joinedleauge[0].data.length == 0) return { message: 'Contest LeaderBard Not Found', status: false, data: [] };

            return {
                message: "Contest LeaderBard",
                status: true,
                data: joinedleauge[0].data,
                total_joined_teams

            }
        } catch (error) {
            throw error;
        }
    };

    /**
     * @function updateJoinedusers
     * @description Is Running contest for join Querys
     * @param { matchkey }
     */
    // async updateJoinedusers(req) {
    //     try {
    //         console.log("--updateJoinedusers----")
    //         const query = {};
    //         query.matchkey = req.query.matchkey
    //         query.contest_type = 'Amount'
    //         query.status = 'opened'
    //         const matchchallengesData = await matchchallengesModel.find(query);
    //         if (matchchallengesData.length > 0) {
    //             for (let matchchallenge of matchchallengesData) {
    //                 const totalJoinedUserInLeauge = await JoinLeaugeModel.find({ challengeid: mongoose.Types.ObjectId(matchchallenge._id) });
    //                 if (matchchallenge.maximum_user == totalJoinedUserInLeauge.length) {
    //                     const update = {
    //                         $set: {
    //                             'status': 'closed',
    //                             'is_duplicated': 1,
    //                             'joinedusers': totalJoinedUserInLeauge.length,
    //                         },
    //                     };
    //                     // console.log("--matchchallenge.is_running == 1 && matchchallenge.is_duplicated != 1--",matchchallenge.is_running == 1 && matchchallenge.is_duplicated != 1)
    //                     if (matchchallenge.is_running == 1 && matchchallenge.is_duplicated != 1) {
    //                         let newmatchchallenge = {};
    //                         // delete newmatchchallenge._id;
    //                         // delete newmatchchallenge.createdAt;
    //                         // delete newmatchchallenge.updatedAt;
    //                         newmatchchallenge.joinedusers = 0;
    //                         newmatchchallenge.contestid = matchchallenge.contestid
    //                         newmatchchallenge.contest_cat = matchchallenge.contest_cat
    //                         newmatchchallenge.challenge_id = matchchallenge.challenge_id
    //                         newmatchchallenge.matchkey = matchchallenge.matchkey
    //                         newmatchchallenge.fantasy_type = matchchallenge.fantasy_type
    //                         newmatchchallenge.entryfee = matchchallenge.entryfee
    //                         newmatchchallenge.win_amount = matchchallenge.win_amount
    //                         newmatchchallenge.multiple_entryfee = matchchallenge.multiple_entryfee
    //                         newmatchchallenge.expert_teamid = matchchallenge.expert_teamid
    //                         newmatchchallenge.maximum_user = matchchallenge.maximum_user
    //                         newmatchchallenge.status = matchchallenge.status
    //                         newmatchchallenge.created_by = matchchallenge.created_by
    //                         newmatchchallenge.contest_type = matchchallenge.contest_type
    //                         newmatchchallenge.expert_name = matchchallenge.expert_name
    //                         newmatchchallenge.contest_name = matchchallenge.contest_name || ''
    //                         newmatchchallenge.amount_type = matchchallenge.amount_type
    //                         newmatchchallenge.mega_status = matchchallenge.mega_status
    //                         newmatchchallenge.winning_percentage = matchchallenge.winning_percentage
    //                         newmatchchallenge.is_bonus = matchchallenge.is_bonus
    //                         newmatchchallenge.bonus_percentage = matchchallenge.bonus_percentage
    //                         newmatchchallenge.pricecard_type = matchchallenge.pricecard_type
    //                         newmatchchallenge.minimum_user = matchchallenge.minimum_user
    //                         newmatchchallenge.confirmed_challenge = matchchallenge.confirmed_challenge
    //                         newmatchchallenge.multi_entry = matchchallenge.multi_entry
    //                         newmatchchallenge.team_limit = matchchallenge.team_limit
    //                         newmatchchallenge.image = matchchallenge.image
    //                         newmatchchallenge.c_type = matchchallenge.c_type
    //                         newmatchchallenge.is_private = matchchallenge.is_private
    //                         newmatchchallenge.is_running = matchchallenge.is_running
    //                         newmatchchallenge.is_expert = matchchallenge.is_expert
    //                         newmatchchallenge.bonus_percentage = matchchallenge.bonus_percentage
    //                         newmatchchallenge.matchpricecards = matchchallenge.matchpricecards
    //                         newmatchchallenge.is_expert = matchchallenge.is_expert
    //                         newmatchchallenge.team1players = matchchallenge.team1players
    //                         newmatchchallenge.team2players = matchchallenge.team2players
    //                         // console.log("---newmatchchallenge--",newmatchchallenge)
    //                         let data = await matchchallengesModel.findOne({
    //                             matchkey: matchchallenge.matchkey,
    //                             fantasy_type: matchchallenge.fantasy_type,
    //                             entryfee: matchchallenge.entryfee,
    //                             win_amount: matchchallenge.win_amount,
    //                             maximum_user: matchchallenge.maximum_user,
    //                             joinedusers: 0,
    //                             status: matchchallenge.status,
    //                             is_duplicated: { $ne: 1 }
    //                         });
    //                         if (!data) {
    //                             let createNewContest = new matchchallengesModel(newmatchchallenge);
    //                             let mynewContest = await createNewContest.save();
    //                         }
    //                         // console.log("---createNewContest----",mynewContest)
    //                     }

    //                     await matchchallengesModel.updateOne({ _id: mongoose.Types.ObjectId(matchchallenge._id) }, update);
    //                 }
    //             }

    //         }
    //     } catch (error) {
    //         throw error;
    //     }

    // };
    async updateJoinedusers(req) {
        try {
            console.log("--updateJoinedusers----");
            let aggPipe = [];
            aggPipe.push({
                $match: {
                    matchkey: mongoose.Types.ObjectId(req.query.matchkey),
                    contest_type: 'Amount',
                    status: 'opened'
                }
            });
            aggPipe.push({
                $lookup: {
                    from: "joinedleauges",
                    localField: "_id",
                    foreignField: "challengeid",
                    as: "joinedleauges"
                }
            });
            aggPipe.push({
                $addFields: {
                    joinedleauges: {
                        $size: "$joinedleauges"
                    }
                }
            });
            const matchchallengesData = await matchchallengesModel.aggregate(aggPipe);
            for (const matchchallenge of matchchallengesData) {
                if (matchchallenge.maximum_user === matchchallenge.joinedleauges) {
                    const update = {
                        $set: {
                            status: 'closed',
                            is_duplicated: 1,
                            joinedusers: matchchallenge.joinedleauges,
                        },
                    };

                    if (matchchallenge.is_running === 1 && matchchallenge.is_duplicated !== 1) {
                        const newMatchChallenge = {
                            joinedusers: 0,
                            contestid: matchchallenge.contestid,
                            contest_cat: matchchallenge.contest_cat,
                            challenge_id: matchchallenge.challenge_id,
                            matchkey: matchchallenge.matchkey,
                            fantasy_type: matchchallenge.fantasy_type,
                            entryfee: matchchallenge.entryfee,
                            win_amount: matchchallenge.win_amount,
                            multiple_entryfee: matchchallenge.multiple_entryfee,
                            expert_teamid: matchchallenge.expert_teamid,
                            maximum_user: matchchallenge.maximum_user,
                            status: matchchallenge.status,
                            created_by: matchchallenge.created_by,
                            contest_type: matchchallenge.contest_type,
                            expert_name: matchchallenge.expert_name,
                            contest_name: matchchallenge.contest_name || '',
                            amount_type: matchchallenge.amount_type,
                            mega_status: matchchallenge.mega_status,
                            winning_percentage: matchchallenge.winning_percentage,
                            is_bonus: matchchallenge.is_bonus,
                            bonus_percentage: matchchallenge.bonus_percentage,
                            pricecard_type: matchchallenge.pricecard_type,
                            minimum_user: matchchallenge.minimum_user,
                            confirmed_challenge: matchchallenge.confirmed_challenge,
                            confirmed_flexible: matchchallenge.confirmed_flexible,
                            multi_entry: matchchallenge.multi_entry,
                            team_limit: matchchallenge.team_limit,
                            image: matchchallenge.image,
                            c_type: matchchallenge.c_type,
                            is_private: matchchallenge.is_private,
                            is_running: matchchallenge.is_running,
                            is_expert: matchchallenge.is_expert,
                            bonus_percentage: matchchallenge.bonus_percentage,
                            matchpricecards: matchchallenge.matchpricecards,
                            team1players: matchchallenge.team1players,
                            team2players: matchchallenge.team2players,
                        };

                        const data = await matchchallengesModel.findOne({
                            matchkey: matchchallenge.matchkey,
                            fantasy_type: matchchallenge.fantasy_type,
                            entryfee: matchchallenge.entryfee,
                            win_amount: matchchallenge.win_amount,
                            maximum_user: matchchallenge.maximum_user,
                            joinedusers: 0,
                            status: matchchallenge.status,
                            is_duplicated: { $ne: 1 }
                        });

                        if (!data) {
                            const createNewContest = new matchchallengesModel(newMatchChallenge);
                            const mynewContest = await createNewContest.save();
                        }
                    }

                    await matchchallengesModel.updateOne({ _id: mongoose.Types.ObjectId(matchchallenge._id) }, update);
                }
            }
            return true;
        } catch (error) {
            throw error;
        }
    }


    /**
     * @function switchTeams
     * @description Contest Join replace with annother team
     * @param { matchkey,switchteam(joinleaugeid,newjointeamid) }
     */
    async switchTeams(req) {
        try {

            const { matchkey, switchteam } = req.body;
            let keyname = `listMatchesModel-${matchkey}`
            let match = await Redis.getkeydata(keyname);
            if (!match) {
                match = await listMatchesModel.findOne({ _id: mongoose.Types.ObjectId(matchkey) });
                Redis.setkeydata(keyname, match, 60 * 60 * 4);
            }
            console.log(req.user._id);
            if (!match) return { message: 'Match Not Found', status: false, data: {} };
            const matchTime = await matchServices.getMatchTime(match.start_date);
            if (matchTime === false) return { message: 'Match has been closed.', status: false, data: {} };
            let newData = JSON.parse(switchteam)

            for (let key of newData) {
                let joinTeam = await JoinTeamModel.findOne({ _id: key.newjointeamid });
                let updateData = await JoinLeaugeModel.findOneAndUpdate({ _id: key.joinleaugeid }, { teamid: key.newjointeamid, teamnumber: joinTeam.teamnumber }, { new: true });
                await leaderBoardModel.findOneAndUpdate({ joinId: key.joinleaugeid }, { teamnumber: joinTeam.teamnumber, teamId: key.newjointeamid, }, { new: true });

            }
            return { message: 'Team Updated ', status: true, data: {} }
        } catch (error) {
            throw error;
        }
    }

    /**
     * @function getUsableBalance
     * @description Get amount to be used
     * @param { matchchallengeid }
     */
    async getUsableBalance(req) {
        try {

            const { matchchallengeid } = req.query;
            // redis
            let keyname = `getUsableBalance-${matchchallengeid}`
            let matchchallengesData = await Redis.getkeydata(keyname);
            if (!matchchallengesData) {
                console.log("hello",req.user._id)
                
                matchchallengesData = await matchchallengesModel.findOne({ _id: mongoose.Types.ObjectId(matchchallengeid) });
                Redis.setkeydata(keyname, matchchallengesData, 60 * 60 * 4);
            }



            if (!matchchallengesData) {
                return {
                    message: 'Invalid details',
                    status: false,
                    data: {}
                }
            }
            req.query.matchkey = matchchallengesData.matchkey;
            await this.updateJoinedusers(req);
            const user = await userModel.findOne({ _id: req.user._id }, { userbalance: 1, user_verify: 1 });
            const bonus = parseFloat(user.userbalance.bonus.toFixed(2)) || 0;
            const balance = parseFloat(user.userbalance?.balance.toFixed(2)) || 0;
            const winning = parseFloat(user.userbalance?.winning.toFixed(2)) || 0;
            const totalBalance = bonus + balance + winning;
            const findUsableBalance = balance + winning;
            let findBonusAmount = 0,
                usedBonus = 0;
            if (matchchallengesData.is_bonus == 1 && matchchallengesData.bonus_percentage) {
                findBonusAmount = (matchchallengesData.bonus_percentage / 100) * matchchallengesData.entryfee;
            }
            if (bonus >= findBonusAmount) usedBonus = findBonusAmount;
            else usedBonus = bonus;
            return {
                message: 'Get amount to be used',
                status: true,
                data: {
                    usablebalance: findUsableBalance.toFixed(2).toString(),
                    usertotalbalance: totalBalance.toFixed(2).toString(),
                    entryfee: matchchallengesData.entryfee.toFixed(2).toString(),
                    bonus: usedBonus.toFixed(2).toString(),
                }
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * @function createPrivateContest
     * @description create private Contest
     * @param { matchkey, maximum_user, win_amount, entryfee, multi_entry, contestName }
     */
    async createPrivateContest(req) {
        try {
            const { matchkey, maximum_user, win_amount, entryfee, multi_entry, contestName } = req.body;
            if (maximum_user < 2) {
                return {
                    message: 'Invalid league details. You cannot create a league with less then two members.',
                    status: false,
                    data: {},
                };
            }
            let obj = {
                fantasy_type: 'Cricket',
                matchkey: mongoose.Types.ObjectId(matchkey),
                entryfee: Number(entryfee),
                win_amount: Number(win_amount),
                maximum_user: Number(maximum_user),
                minimum_user: 2,
                status: 'pending',
                contest_name: contestName || '',
                created_by: mongoose.Types.ObjectId(req.user._id),
                joinedusers: 0,
                bonus_type: '',
                pdf_created: 0,
                contest_type: 'Amount',
                megatype: 'normal',
                winning_percentage: 0,
                is_bonus: 0,
                bonus_percentage: 0,
                pricecard_type: 'Amount',
                confirmed_challenge: 0,
                confirmed_flexible: 0,
                is_running: 0,
                multi_entry: Number(multi_entry),
                is_private: 1,
                team_limit: 11,
                c_type: '',
                contest_cat: null,
                challenge_id: null,
                matchpricecards: [],
            }
            let challengeid = await matchchallengesModel.create(obj);
            if (challengeid) {
                return {
                    message: 'Challenge successfully Created.',
                    status: true,
                    data: {
                        matchchallengeid: challengeid._id,
                        entryfee: entryfee,
                        multi_entry: multi_entry
                    }
                };
            } else {
                return {
                    message: 'Error Occurred While Creating Challenge.',
                    status: false,
                    data: {}
                };
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * @function joinContestByCode
     * @description Contest Join By ContestCode
     * @param { getcode, matchkey }
     */
    async joinContestByCode(req) {
        try {
            console.log("--------------------------------------JOIN-CONTEST-BY-CODE-------------------------------------------------")
            const { getcode, matchkey } = req.body;
            let matchchallengeid, findReferCode;
            const code = getcode.split('-');
            if (code[0] == 'CC$') {
                findReferCode = await JoinedReferModel.findOne({ matchkey: matchkey, refercode: getcode });
                if (!findReferCode) return { message: 'Invalid code', status: false, data: {} };
                matchchallengeid = findReferCode.challengeid;
            } else {
                findReferCode = await JoinLeaugeModel.findOne({ matchkey: matchkey, refercode: getcode });
                if (!findReferCode) return { message: 'Invalid code', status: false, data: {} };
                matchchallengeid = findReferCode.challengeid;
            }
            // redis
            let keyname = `joinContestByCode-${matchchallengeid}`
            let redisdata = await Redis.getkeydata(keyname);
            let matchchallenge;
            if (redisdata) {
                matchchallenge = redisdata;
            }
            else {
                matchchallenge = await matchchallengesModel.findOne({ _id: mongoose.Types.ObjectId(matchchallengeid) });
                let redisdata = Redis.setkeydata(keyname, matchchallenge, 60 * 60 * 4);
            }
            if (!matchchallenge) {
                return { message: 'Invalid code', status: false, data: {} };
            }
            const joinLeagues = await JoinLeaugeModel.find({
                userid: req.user._id,
                challengeid: matchchallenge._id,
            }).countDocuments();
            let teamLimit;
            if (matchchallenge.multi_entry == 0) {
                teamLimit = 1;
            } else {
                teamLimit = matchchallenge.team_limit;
            }
            if (matchchallenge.multi_entry == 1) {
                if (joinLeagues == matchchallenge.team_limit) {
                    return { message: 'Already used', status: false, data: { multi_entry: 1 } };
                } else if (matchchallenge.status == 'closed') {
                    return { message: 'Challenge closed', status: false, data: { matchchallengeid: '', entryfee: '', multi_entry: 1, team_limit: teamLimit } };
                } else {
                    return { message: 'Challenge opened', status: true, data: { matchchallengeid: matchchallenge._id, entryfee: matchchallenge.entryfee, multi_entry: 1, team_limit: teamLimit } };
                }
            } else {
                if (joinLeagues != 0) {
                    return { message: 'Already used', status: false, data: { multi_entry: 0 } };
                } else if (matchchallenge.status == 'closed') {
                    return { message: 'Challenge closed', status: false, data: { matchchallengeid: '', entryfee: '', multi_entry: 0, team_limit: teamLimit } };
                } else {
                    return { message: 'Challenge opened', status: true, data: { matchchallengeid: matchchallenge._id, entryfee: matchchallenge.entryfee, multi_entry: 0, team_limit: teamLimit } };
                }
            }
        } catch (error) {
            throw error;
        }
    }
}
module.exports = new contestServices();