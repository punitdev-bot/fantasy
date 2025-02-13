const express = require("express");

// coustimize the default console.log function
console.logCopy = console.log.bind(console);
console.log = function (...data) {
  const currentDate = "[" + new Date().toString() + "]";
  this.logCopy(`${currentDate}-->`, ...data);
};

const app = express();

const { connectDB } = require("./src/db/dbconnection");
const constant = require("./src/config/const_credential");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const {
  updatePlayersCount,
  updateResultOfMatches,
  refund_amount,
  mappingPlayers,
  matchPointUpdate,
  rankUpdateInMatch,
  givingLevelUser,
  contestCompression,
  generateRandomPlayerClassic

} = require('./src/config/cronjob');
// updatePlayerSelected.start();
updateResultOfMatches.start();
updatePlayersCount.start();
generateRandomPlayerClassic.start();
// series_leaderboard.start();
refund_amount.start();
mappingPlayers.start();
matchPointUpdate.start();
contestCompression.start();
givingLevelUser.start();
const port = constant.CRON_PORT;
connectDB();
app.listen(port, () => {
  console.log(`server started on port ${port}`);
});
