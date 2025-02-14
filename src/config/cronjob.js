const { CronJob } = require('cron');
const axios = require('axios');
const CronJobService = require('../api/services/cronJobServices');
const resultServices = require('../admin/services/resultServices');
const mappingServices = require('../admin/services/mappingService');
const refund_amount = require("../admin/controller/resultController");
const randomizePlayerSelectionClassic = require("../admin/controller/randomizePlayerSelectionClassic");
const autoWinnerDeclared = require("../admin/controller/resultController");
const contestCompressionController = require("../admin/controller/contestCompressionController");

const adminModel = require("../models/adminModel");

// 1 0 */15 * * every 15 days on 00:01:00 GMT+0530
exports.updatePlayerSelected = new CronJob("*/5 * * * *", async function () {
  try {
    return CronJobService.updatePlayerSelected();
  } catch (e) {
    return e;
  }
});
exports.refund_amount = new CronJob('*/20 * * * *', async function () {
  try {
    console.log('<------ Refund cron ------>');
    return refund_amount.refund_amount();
  } catch (e) {
    return e;
  }
});

exports.updateResultOfMatches = new CronJob("*/1 * * * *", async function () {
  try {
    console.log("<------ update match result cron ------>");
    resultServices.updateResultMatches();
  } catch (error) {
    return error;
  }
});
exports.autoWinnerDeclared = new CronJob("*/1 * * * *", async function () {
  try {
    console.log("<------ Auto winner declared cron ------>");
    autoWinnerDeclared.autoUpdateMatchFinalStatus();
  } catch (error) {
    return error;
  }
});

exports.botUserJoinTeamPercentage = new CronJob(
  "*/50 * * * * *",
  async function () {
    try {
      let admin = await adminModel.findOne({ role: "0" });
      console.log(
        "----------admin.is_active === true--------",
        admin.is_active === true
      );
      if (admin.is_active === true) {
        console.log("<------ join bot user percentage cron ------>");
        boatUserService.joinBotUserAccordingPercentage();
        ``;
      }
    } catch (error) {
      return error;
    }
  }
);


exports.generateRandomPlayerClassic = new CronJob('*/30 * * * * *', async function () {
  try {
      let admin = await adminModel.findOne({ role: '0' });
      if (admin.is_active === true) {
          console.log('<------ classic random team cron ------>');
          randomizePlayerSelectionClassic.generateRandomPlayerClassic();
      }
  } catch (error) {
      return error;
  }
});


exports.contestCompression = new CronJob("*/1 * * * *", async function () {
  try {
    console.log("<------ contestCompression cron ------>");
    contestCompressionController.contestCompression();
  } catch (error) {
    return error;
  }
});
exports.givingLevelUser = new CronJob("*/5 * * * *", async function () {
  try {
    console.log("<------givingLevelUser cron ------>");
    contestCompressionController.givingLevelUser();
  } catch (error) {
    return error;
  }
});

exports.mappingPlayers = new CronJob('*/1 * * * *', async function () {
  try {
    console.log('<------ Mapping Players------>');
    mappingServices.mappingPlayers();
  } catch (error) {
    return error;
  }
});

exports.matchPointUpdate = new CronJob('*/1 * * * *', async function () {
  try {
    console.log('<------ Point updates------>');
    mappingServices.matchPointUpdate();
  } catch (error) {
    return error;
  }
});


exports.rankUpdateInMatch = new CronJob('*/1 * * * *', async function () {
  try {
    console.log('<------ Rank updates------>');
    mappingServices.rankUpdateInMatch();
  } catch (error) {
    return error;
  }
});

exports.generateRandomPlayerClassic = new CronJob(
  "*/30 * * * * *",
  async function () {
    try {
      let admin = await adminModel.findOne({ role: "0" });
      if (admin.is_active === true) {
        console.log("<------ classic random team cron ------>");
        randomizePlayerSelectionClassic.generateRandomPlayerClassic();
      }
    } catch (error) {
      return error;
    }
  }
);


exports.generateRandomPlayerBatting = new CronJob(
  "*/1 * * * *",
  async function () {
    try {
      let admin = await adminModel.findOne({ role: "0" });
      if (admin.is_active === true) {
        console.log("<------ batting random team cron ------>");
        randomizePlayerSelectionBatting.generateRandomPlayerBatting();
      }
    } catch (error) {
      return error;
    }
  }
);

exports.generateRandomPlayerBowling = new CronJob(
  "*/1 * * * *",
  async function () {
    try {
      let admin = await adminModel.findOne({ role: "0" });
      if (admin.is_active === true) {
        console.log("<------ bowling random team cron ------>");
        randomizePlayerSelectionBowling.generateRandomPlayerBowling();
      }
    } catch (error) {
      return error;
    }
  }
);

exports.generateRandomPlayerReverse = new CronJob(
  "*/1 * * * *",
  async function () {
    try {
      let admin = await adminModel.findOne({ role: "0" });
      if (admin.is_active === true) {
        console.log("<------ reverse random team cron ------>");
        randomizePlayerSelectionReverse.generateRandomPlayerReverse();
      }
    } catch (error) {
      return error;
    }
  }
);
exports.updatePlayersCount = new CronJob("*/1 * * * *", async function () {
  try {
    console.log('updatePlayersCount');
    CronJobService.updatePlayersCount();
  } catch (error) {
    return error;
  }
});
exports.series_leaderboard = new CronJob("*/1 * * * *", async function () {
  try {
    let admin = await adminModel.findOne({ role: "0" });
    if (admin.is_active === true) {
      console.log("<------ series_leaderboard ------>");
      resultServices.series_leaderboard();
    }
  } catch (error) {
    return error;
  }
});
