const { default: axios } = require("axios");
const mongoose = require("mongoose");
const listMatchModel = require("../../models/listMatchesModel");
const teamModel = require("../../models/teamModel");
const seriesModel = require("../../models/addSeriesModel");
const playersModel = require("../../models/playerModel");
const matchPlayersModel = require("../../models/matchPlayersModel");
const moment = require("moment");
const Redis = require("../../utils/redis");
const download = require('image-downloader');
const const_credential = require('../../config/const_credential')
const status = {
    1: "notstarted",
    2: "completed",
    3: "started",
    4: "completed",
};
const format = {
    1: "friendly",
    2: "league",
    3: "cup",
    4: "international",
    5: "world-cup",
    6: "champions-league",
    7: "europa-league",
    8: "super-cup",
    9: "playoff",
    10: "qualifier",
    11: "community-shield",
    12: "pre-season",
    13: "youth",
    14: "women",
    15: "five-a-side",
    16: "seven-a-side",
    17: "futsal",
    18: "beach-soccer",
};

const toss_decision = {
    0: null,
    1: "kickoff",
    2: "choose-side",
};
const role = {
    gk: "goalkeeper",
    df: "defender",
    mf: "midfielder",
    fw: "forward",
    st: "striker",
    lw: "left-winger",
    rw: "right-winger",
    cm: "central-midfielder",
    am: "attacking-midfielder",
    dm: "defensive-midfielder",
    cb: "center-back",
    lb: "left-back",
    rb: "right-back",
    sb: "substitute",
    cap: "captain",
    coach: "coach",
    physio: "physiotherapist",
};

class BasketballApiController {
    constructor() {
        return {
            listOfMatches_entity: this.listOfMatches_entity.bind(this),
            fetchPlayerByMatch_entity: this.fetchPlayerByMatch_entity.bind(this),
            getmatchscore: this.getmatchscore.bind(this),
            overData: this.overData.bind(this),
        };
    }

    async listOfMatches_entity(req, res , next) {
        try {
            let pageno = 1;
            // let fantasy_type = req.query.type;
            let fantasy_type = "Basketball"
            let url = `${const_credential.BASE_URL}basketball.json`
            axios.get(url).then(async (matchData) => {
                await this.child_listOfMatches_entity(matchData.data.response.items, fantasy_type);
                res.redirect("/view_AllUpcomingMatches");
            });
        } catch (error) {
            console.log("error", error);
            next(error);
        }
    }


    //import match, series and teams
    async child_listOfMatches_entity(items, fantasy_type) {
        // console.log(fantasy_type,'123343254374585487577')
        try {
            for (let mymatch of items) {
                fantasy_type = "Basketball"
                // let mymatch= JSON.parse(match.matchdata);
                const checkMatchkey = await listMatchModel.find({
                    real_matchkey: mymatch.mid,
                    "fantasy_type": fantasy_type
                });
                if (checkMatchkey.length == 0) {
                    if (
                        true
                        // moment(moment(mymatch.datestart).format()).isAfter(
                        //     moment().format()
                        // )
                    ) {
                        let temaData1, temaData2, series;
                        if (await teamModel.findOne({ team_key: mymatch.teams.home.tid })) {

                            temaData1 = await teamModel.findOneAndUpdate(
                                { team_key: mymatch.teams.home.tid },
                                {
                                    $set: {
                                        teamName: mymatch.teams.home.fullname,
                                        short_name: mymatch.teams.home.abbr,
                                    },
                                },
                                { new: true }
                            );
                        } else {
                            let insertTeam1 = new teamModel({
                                fantasy_type: "Basketball",
                                teamName: mymatch.teams.home.fullname,
                                team_key: mymatch.teams.home.tid,
                                short_name: mymatch.teams.home.abbr,
                            });
                            temaData1 = await insertTeam1.save();
                        }

                        if (await teamModel.findOne({ team_key: mymatch.teams.away.tid })) {
                            temaData2 = await teamModel.findOneAndUpdate(
                                { team_key: mymatch.teams.away.tid },
                                {
                                    $set: {
                                        teamName: mymatch.teams.away.fullname,
                                        short_name: mymatch.teams.away.abbr,
                                    },
                                },
                                { new: true }
                            );
                        } else {
                            let insertTeam2 = new teamModel({
                                fantasy_type: fantasy_type,
                                teamName: mymatch.teams.away.fullname,
                                team_key: mymatch.teams.away.tid,
                                short_name: mymatch.teams.away.abbr,
                            });
                            temaData2 = await insertTeam2.save();
                        }
                        //import series 
                        if (await seriesModel.findOne({ series_key: mymatch.competition.cid })) {
                            series = await seriesModel.findOneAndUpdate({ series_key: mymatch.competition.cid }, {
                                $set: {
                                    name: mymatch.competition.cname,
                                    status: 'opened',
                                    start_date: mymatch.competition.startdate,
                                    end_date: mymatch.competition.enddate
                                }
                            }, { new: true });
                        } else {
                            let seriesData = new seriesModel({
                                fantasy_type: fantasy_type,
                                name: mymatch.competition.cname,
                                series_key: mymatch.competition.cid,
                                status: 'opened',
                                start_date: mymatch.competition.startdate,
                                end_date: mymatch.competition.enddate
                            })
                            series = await seriesData.save();
                        }
                        let insertListmatch = new listMatchModel({
                            fantasy_type: fantasy_type,
                            name: `${mymatch.teams.home.fullname} vs ${mymatch.teams.away.fullname}`,
                            short_name: `${mymatch.teams.home.abbr} vs ${mymatch.teams.away.abbr}`,
                            team1Id: temaData1._id,
                            team2Id: temaData2._id,
                            series: series._id,
                            real_matchkey: mymatch.mid,
                            start_date: mymatch.datestart,
                            status: status[mymatch.status],
                            launch_status: "pending",
                            final_status: "pending",
                        });
                        let insertMatchList = await insertListmatch.save();
                    }
                } else {
                    if (
                        true
                        // moment(moment(mymatch.datestart).format()).isAfter(
                        //     moment().format()
                        // )
                    ) {
                        let temaData1, temaData2, series;
                        let getTeam1 = await teamModel.findOne({ team_key: mymatch.teams.home.tid });

                        if (getTeam1) {
                            const options = {
                                url: mymatch.teams.home.logo,
                                dest: '../../public/teams/',               // will be saved to /path/to/dest/image.jpg
                            };
                            let getImage;
                            let path;
                            let logoImage;
                            if (options.url) {
                                getImage = await download.image(options);
                                path = getImage.filename.split('/').pop()
                                path = path.split("\\").pop()
                                logoImage = `teams/${path}`;
                            } else {
                                logoImage = mymatch.teams.home.logo
                            }

                            temaData1 = await teamModel.findOneAndUpdate(
                                { team_key: mymatch.teams.home.tid },
                                {
                                    $set: {
                                        teamName: mymatch.teams.home.fullname,
                                        short_name: mymatch.teams.home.abbr,
                                        logo: logoImage
                                    },
                                },
                                { new: true }
                            );
                        } else {
                            const options = {
                                url: mymatch.teams.home.logo,
                                dest: '../../public/teams/',               // will be saved to /path/to/dest/image.jpg
                            };
                            let getImage;
                            let path;
                            let logoImage;
                            if (options.url) {
                                getImage = await download.image(options);
                                path = getImage.filename.split('/').pop()
                                path = path.split("\\").pop()
                                logoImage = `teams/${path}`;
                            } else {
                                logoImage = mymatch.teams.home.logo
                            }
                            let insertTeam1 = new teamModel({
                                fantasy_type: "Basketball",
                                teamName: mymatch.teams.home.fullname,
                                team_key: mymatch.teams.home.tid,
                                short_name: mymatch.teams.home.abbr,
                                logo: logoImage
                            });
                            temaData1 = await insertTeam1.save();
                        }
                        let getTeam2 = await teamModel.findOne({ team_key: mymatch.teams.away.tid });
                        if (getTeam2) {
                            const options2 = {
                                url: mymatch.teams.away.logo,
                                dest: '../../public/teams/',               // will be saved to /path/to/dest/image.jpg
                            };

                            let getImage;
                            let path;
                            let logoImage2;

                            if (options2.url) {
                                getImage = await download.image(options2);
                                path = getImage.filename.split('/').pop()
                                path = path.split("\\").pop()
                                logoImage2 = `teams/${path}`;
                            } else {
                                logoImage2 = mymatch.teams.away.logo
                            }

                            temaData2 = await teamModel.findOneAndUpdate(
                                { team_key: mymatch.teams.away.tid },
                                {
                                    $set: {
                                        teamName: mymatch.teams.away.fullname,
                                        short_name: mymatch.teams.away.abbr,
                                        logo: logoImage2
                                    },
                                },
                                { new: true }
                            );
                        } else {
                            const options2 = {
                                url: mymatch.teams.away.logo,
                                dest: '../../public/teams/',               // will be saved to /path/to/dest/image.jpg
                            };

                            let getImage;
                            let path;
                            let logoImage2;
                            if (options2.url) {
                                getImage = await download.image(options2);
                                path = getImage.filename.split('/').pop()
                                path = path.split("\\").pop()
                                logoImage2 = `teams/${path}`;
                            } else {
                                logoImage2 = mymatch.teams.away.logo
                            }

                            let insertTeam2 = new teamModel({
                                fantasy_type: "Basketball",
                                teamName: mymatch.teams.away.fullname,
                                team_key: mymatch.teams.away.tid,
                                short_name: mymatch.teams.away.abbr,
                                logo: logoImage2
                            });
                            temaData2 = await insertTeam2.save();
                        }
                        console.log(mymatch.competition.cid, 'mymatch.competition.cid')
                        if (await seriesModel.findOne({ series_key: mymatch.competition.cid })) {
                            series = await seriesModel.findOneAndUpdate({ series_key: mymatch.competition.cid }, {
                                $set: {
                                    name: mymatch.competition.cname,
                                    status: 'opened',
                                    start_date: `${mymatch.competition.startdate}`,
                                    end_date: `${mymatch.competition.enddate}`
                                }
                            }, { new: true });
                        } else {
                            let seriesData = new seriesModel({
                                fantasy_type: fantasy_type,
                                name: mymatch.competition.cname,
                                series_key: mymatch.competition.cid,
                                status: 'opened',
                                start_date: `${mymatch.competition.startdate}`,
                                end_date: `${mymatch.competition.enddate}`
                            })
                            series = await seriesData.save();

                        }
                        const updateListMatch = await listMatchModel.findOneAndUpdate(
                            { real_matchkey: mymatch.match_id, "fantasy_type": fantasy_type },
                            {
                                $set: {
                                    name: `${mymatch.teams.home.fullname} vs ${mymatch.teams.away.fullname}`,
                                    short_name: `${mymatch.teams.home.abbr} vs ${mymatch.teams.away.abbr}`,
                                    team1Id: temaData1._id,
                                    team2Id: temaData2._id,
                                    series: series._id,
                                    real_matchkey: mymatch.mid,
                                    start_date: mymatch.datestart,
                                },
                            },
                            { new: true }
                        );
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

    fetchPlayerByMatch_entity(req, res) {
        try {
            console.log(req, '>>>>>>>res')
            axios
                .get(
                    `https://soccer.entitysport.com/competition/${req.params.matchkey}/squad?token=44689d60663efa7ad59e4903675b794e`
                )
                .then(async (matchData) => {
                    if (matchData.data) {
                        let listmatch = await listMatchModel.findOne({
                            real_matchkey: req.params.matchkey,
                            fantasy_type: req.query.fantasy_type
                        });

                        await this.child_fetchPlayerByMatch_entity(
                            matchData.data,
                            listmatch._id,
                            req.params.matchkey
                        );
                        res.redirect(`/launch-match/${listmatch._id}`);
                    }
                });
        } catch (error) { }
    }

    async child_fetchPlayerByMatch_entity(myresponse, matchkey, real_matchkey) {
        let response = myresponse.response;
        if (response["teama"].squads.length == 0) {
            return false;
        }

        let team1Id = response.teama.team_id;
        let team2Id = response.teamb.team_id;
        let data = await Promise.all([
            this.importPlayer(team1Id, response, matchkey, "teama"),
            this.importPlayer(team2Id, response, matchkey, "teamb"),
        ]);
    }
    async importPlayer(teamId, response, matchkey, team) {
        let teamDAta = await teamModel.findOne({ team_key: teamId });
        if (teamDAta) {
            for (let player of response[team].squads) {
                let playerTeam = await playersModel.findOne({
                    players_key: player.player_id,
                    team: teamDAta._id,
                });

                let checkPlayersKey = response["players"].find(
                    (o) => o.pid == player.player_id
                );
                let player_role = role[checkPlayersKey.playing_role]
                    ? role[checkPlayersKey.playing_role]
                    : "allrounder";
                console.log('playerTeam', playerTeam)
                if (playerTeam) {
                    player_role = playerTeam.role;
                    if (
                        !(await matchPlayersModel.findOne({
                            playerid: playerTeam._id,
                            matchkey,
                        }))
                    ) {
                        let matchPlayerData = new matchPlayersModel({
                            matchkey: matchkey,
                            playerid: playerTeam._id,
                            credit: playerTeam.credit,
                            name: playerTeam.fullname,
                            role: player_role,
                            legal_name: player.name,
                        });
                        let insmatchPlayerData = await matchPlayerData.save();
                        // redis
                        let keyname = `matchkey-${matchkey}-playerid-${playerTeam._id}`;
                        let redisdata = Redis.setkeydata(keyname, insmatchPlayerData, 60 * 60 * 48);
                    }
                } else {
                    let playerData = new playersModel({
                        fantasy_type: "Basketball",
                        player_name: player.name,
                        players_key: player.player_id,
                        team: teamDAta._id,
                        role: player_role,
                        fullname: player.name,
                    });
                    let insertPlayer = await playerData.save();

                    let matchPlayerData = new matchPlayersModel({
                        matchkey: matchkey,
                        playerid: insertPlayer._id,
                        credit: insertPlayer.credit,
                        name: player.name,
                        role: player_role,
                        legal_name: player.name,
                    });
                    let insmatchPlayerData = await matchPlayerData.save();
                    let keyname = `matchkey-${matchkey}-playerid-${insertPlayer._id}`;
                    let redisdata = Redis.setkeydata(keyname, insmatchPlayerData, 60 * 60 * 48);
                    // }

                    // redis end
                }
            }
        }
    }

    async getmatchscore(real_matchkey) {
        try {
            let matchData = await axios.get(
                `http://rest.entitysport.com/v2/matches/${real_matchkey}/scorecard?token=1&token=5a59a52147983277808ffc8ee228c2bd`
            );
            return matchData.data.response;
        } catch (error) { }
    }
    async overData(real_matchkey, inning) {
        try {
            let matchData = await axios.get(
                `https://rest.entitysport.com/v2/matches/${real_matchkey}/innings/${inning}/commentary?token=5a59a52147983277808ffc8ee228c2bd`
            );
            return matchData;
        } catch (error) { }
    }
}
module.exports = new BasketballApiController();
