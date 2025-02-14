//Required Packages
const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../../../middlewares/adminauth");
const getUrl = require("../../../middlewares/geturl");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `public/${req.body.typename}`);
  },
  filename: function (req, file, cb) {
    let exe = file.originalname.split(".").pop();
    let filename = `${Date.now()}.${exe}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      req.fileValidationError = "Only .png, .jpg and .jpeg format allowed!";
      return cb(null, false, req.fileValidationError);
      // cb(null,false);
      // return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
});

const profitLossController = require("../../controller/profitLossController");
const adminPanelController = require("../../controller/adminController");
const dashboardController = require("../../controller/dashbordController");
const seriesController = require("../../controller/seriesController");
const matchController = require("../../controller/matchController");
const teamsController = require("../../controller/teamController");
const offerController = require("../../controller/offerController");
const pointController = require("../../controller/pointController");
const pointSystemController = require("../../controller/poinSystemController");
const cricketApiController = require("../../controller/cricketApiController");
const contestcategoryController = require("../../controller/contestCategoryController");
const challengersController = require("../../controller/challengersController");
const seriesDetailsController = require("../../controller/seriesDetailsController");
const playersController = require("../../controller/playersController");
const subAdminController = require("../../controller/subAdminController");
const userManagerController = require("../../controller/userManagerController");
const youtuberController = require("../../controller/youtuberController");
const adminController = require("../../controller/adminController");
const verifyManagerController = require('../../controller/verifyPanController');

const resultController = require("../../controller/resultController");
const notificationController = require("../../controller/notificationController");
const receivefundController = require("../../controller/receivefundController");
const leaderboardController = require("../../controller/leaderboardController");
const popupNotificationController = require("../../controller/popupNotificationController");
const resultServices = require('../../services/resultServices');
const contestCompressionController = require("../../controller/contestCompressionController");
const activateDeactivateBotController = require("../../controller/activateDeactivateController");
const botUserController = require("../../controller/botUserController");
const privacyPolicyController = require("../../controller/privacyPolicyController");
const termsConditionsController = require("../../controller/termsConditionController");
const LegalityController = require("../../controller/LegalityController");
const aboutusController = require("../../controller/aboutusController");
const contactController = require("../../controller/contactController");
const howtoplayController = require("../../controller/howtoplayController");
const mappingcontroller = require("../../controller/mappingController");
const TDSController = require('../../controller/TDSController')
const gstController = require("../../controller/gstController")
const ticketController = require("../../controller/ticketController")
const affiliateController = require("../../controller/affiliteController")
const FootballApiController = require("../../controller/footballApiController")
const KabaddiApiController = require("../../controller/KabaddiApiController");
const basketballController = require("../../controller/basketballController");
// TDS

router.get("/tds_page", TDSController.viewTDSPage);
router.post("/tds_table_data", TDSController.ViewAllTDSTable);

// GST

router.get("/gst_page", gstController.viewGSTPage);
router.post("/gst_table_data", gstController.ViewAllGSTTable);
// Tickets

router.get("/tickets_page", ticketController.viewTickets);
router.post("/tickets_table_data", ticketController.viewTicketsTable);
router.get("/edit-ticket-page", ticketController.editTicket);
router.post("/edit-ticket-data", ticketController.editTicketData);

// Affiliate Management
router.get("/affiliate-page", affiliateController.viewAffilitePage);
router.post("/affiliate-page-table-data", affiliateController.ViewAllAffiliteTable);
router.get("/affiliate-approve/:userid", affiliateController.approveAffiliate);
router.get("/affiliate-reject/:userid", affiliateController.rejectAffiliate);

//mapping of redis
router.get("/mappingPlayers", mappingcontroller.mappingPlayers);

router.get("/matchPointUpdate", mappingcontroller.matchPointUpdate);
router.get("/rankUpdateInMatch", mappingcontroller.rankUpdateInMatch);
//mapping of redis
router.get("/", auth, getUrl, dashboardController.showdashboard);
router.post("/total_amount_withdraw_in_week", dashboardController.totalAmountWithdrawInWeek);
router.post("/total_amount_received_in_week", dashboardController.totalAmountReceivedInWeek);

// --------------admin ----------------

router.get("/FantasyApp-dk-register-admin", adminPanelController.registerAdminPage);
router.post("/register-admin-data", adminPanelController.registerAdminData);

router.get("/login-admin", adminPanelController.loginAdminPage);
router.post("/login-admin-data", adminPanelController.loginAdminData);

router.get("/admin_profile_page", auth, getUrl, adminPanelController.adminProfilePage);
router.post("/admin_profile_data/:id", auth, getUrl, upload.single('image'), adminPanelController.updateProfileData);


// ---SERIES MODULE----//
router.get("/add-series", auth, getUrl, seriesController.Series_page);
router.post("/add-series", auth, seriesController.addSeries);
router.get("/view-series", auth, getUrl, seriesController.viewSeries);
router.post("/series-Data-Table", auth, seriesController.seriesDataTable);
router.get("/edit-series/:id", auth, getUrl, seriesController.edit_Series);
router.post("/edit-series-data/:id", auth, seriesController.editSeriesData);
router.get("/update-series-status/:id", auth, getUrl, seriesController.updateStatusforSeries);

// ---TEAM MODULE----//

router.get("/view-teams", auth, getUrl, teamsController.viewTeams);
router.post("/teams-Data-Table", auth, teamsController.teamsDataTable);
router.get("/edit-Team/:id", auth, getUrl, teamsController.editTeam);
router.post("/edit-Team-Data/:id", auth, upload.single("logo"), teamsController.edit_Team_Data);
router.get("/add_team_page", auth, teamsController.addTeamPage);
router.post("/add-Team-Data", auth, upload.single("logo"), teamsController.addTeamData);

// ---MATCH MODULE----//



router.get('/view_AllUpcomingMatches',  matchController.view_AllUpcomingMatches);
router.post('/view_AllUpcomingMatches-data-table',  matchController.view_AllUpcomingMatches_table);
router.get("/add-match_page", auth, matchController.addMatchPage);
router.post("/add-match-data", auth, matchController.addMatchData);
router.get('/edit-match/:id', auth, getUrl, matchController.edit_Match);
router.post('/edit-match-data/:id', auth, matchController.edit_match_data);
router.get('/view-AllMatches', auth, getUrl, matchController.view_AllMatches);
router.post('/view-AllMatches-data-table', auth, matchController.view_AllMatches_table);
router.get('/launch-match/:id', auth, getUrl, matchController.launch_Match);
router.get('/launch/:id', auth, getUrl, matchController.launch);
router.post("/launchMatch-changeTeamLog/:teamId", upload.single('logo'), matchController.launchMatchChangeTeamLogo);
router.get('/update-playing11', auth, getUrl, matchController.updatePlaying11);
router.post('/update-playing11-team1-table', auth, matchController.updatePlaying11Team1Data);
router.post('/update-playing11-team2-table', auth, matchController.updatePlaying11Team2Data);
router.post('/update-playing11-team1', auth, matchController.updateTeam1Playing11);
router.post('/update-playing11-team2', auth, matchController.updateTeam2Playing11);
router.post('/update-playing11-launch', matchController.updatePlaying11Launch);
router.get("/unlaunch/:id", matchController.unlaunchMatch);
router.post("/launchMatch-changeTeamLog/:teamId", auth, upload.single('logo'), matchController.launchMatchChangeTeamLogo);
router.post("/launchMatchPlayerUpdate/:playerId", auth, upload.single('logo'), matchController.launchMatchPlayerUpdateData);
router.get("/matchPlayerDelete", auth, matchController.matchPlayerDelete);

// -------  USER MODULE   ----- //

router.get('/view_all_users', auth, getUrl, userManagerController.view_AllUsers);
router.post('/view_users_datatable', auth, userManagerController.view_users_datatable);
router.get('/blockUser/:id', auth, getUrl, userManagerController.blockUser);
router.get('/unblockuser/:id', auth, getUrl, userManagerController.unBlockUser);
router.get('/viewtransactions/:id', auth, getUrl, userManagerController.viewtransactions);
router.post('/viewTransactions-Data-Table/:id', auth, userManagerController.viewTransactionsDataTable);
router.get('/editUserDetails-page/:id', auth, getUrl, userManagerController.editUserDetails_page);
router.post('/edituserdetails', auth, upload.single('image'), userManagerController.edituserdetails);
router.get('/userswallet', auth, getUrl, userManagerController.userswallet);
router.post('/userswallet_table', auth, userManagerController.userswallet_table);
router.get('/wallet-list', auth, getUrl, userManagerController.wallet_list);
router.get('/adminwallet', auth, getUrl, userManagerController.adminwallet);
router.get('/getUserDetails/:id', auth, getUrl, userManagerController.getUserDetails);
router.post('/addMoneyInWallet', auth, userManagerController.addmoneyinwallet);
router.post('/deductmoneyinWallet', auth, userManagerController.deductmoneyinwallet);
router.post('/adminwallet-dataTable', auth, userManagerController.adminwallet_dataTable);
router.get("/downloadalluserdetails/:id", auth, userManagerController.downloadalluserdetails);
router.get("/changeYotuberStatus/:userId", auth, userManagerController.changeYotuberStatus);

//----------verifyManager--------//
router.get("/verifypan", auth, getUrl, verifyManagerController.verifyPan);
router.get("/verifyaadhar", auth, getUrl, verifyManagerController.verifyAadhar);
router.get("/viewallkyc", auth, getUrl, verifyManagerController.viewallkyc);

router.post("/viewallkyc_datatable", auth, verifyManagerController.viewallkyc_Datatable)
router.post("/verifypan-datatable", auth, verifyManagerController.verifyPan_Datatable);
router.post("/verifyaadhar-datatable", auth, verifyManagerController.verifyAadhar_Datatable);

router.get("/viewpandetails/:id", auth, getUrl, verifyManagerController.viewPan_Details);
router.get("/viewkycdetails/:id", auth, getUrl, verifyManagerController.viewKyc_Details);
router.get("/viewaadhardetails/:id", auth, getUrl, verifyManagerController.viewAadhar_Details);

router.post("/modifyPanDetails", auth, verifyManagerController.update_Pan_Details);
router.post("/modifyAadharDetails", auth, verifyManagerController.update_Aadhar_Details);
router.get("/modifyKycDetails", auth, getUrl, verifyManagerController.update_Kyc_Details);

router.get("/editPandetails/:id", auth, getUrl, verifyManagerController.editPan_Details);
router.get("/editAadhardetails/:id", auth, getUrl, verifyManagerController.editAadhar_Details);
router.get("/editKycdetails/:id", auth, getUrl, verifyManagerController.editKyc_Details);

router.post("/Update-Credentials-Pan", auth, verifyManagerController.Update_Credentials_Pan);
router.post("/Update-Credentials-Aadhar", auth, verifyManagerController.Update_Credentials_Aadhar);
router.post("/Update-Credentials-Kyc", auth, verifyManagerController.Update_Credentials_Kyc);

router.get("/verifybankaccount", auth, getUrl, verifyManagerController.verifyBank);
router.post("/verifyBank_datatable", auth, verifyManagerController.verifyBank_Datatable);

router.get("/viewbankdetails/:id", auth, getUrl, verifyManagerController.viewBank_Details);
router.get("/editbankdetails/:id", auth, getUrl, verifyManagerController.editBank_Details);
router.get("/withdraw_amount", auth, getUrl, verifyManagerController.withdrawalAmount);
router.post("/withdraw-amount-datatable", auth, verifyManagerController.withdraw_amount_datatable2);
router.post("/modifyBankDetails", auth, verifyManagerController.update_Bank_Details);
router.post("/Update-Credentials-Bank", auth, verifyManagerController.Update_Credentials_Bank);
router.get("/approve-withdraw-request/:id", verifyManagerController.approve_withdraw_request);
//approve
router.get("/mannual-withdraw-request/:id", verifyManagerController.mannual_withdraw_request);
//approveend
router.get("/reject-withdraw-request/:id", auth, getUrl, verifyManagerController.reject_withdraw_request);
router.post("/widthdrow-webhook", verifyManagerController.widthdrowWebhook);
//------------downloads---------//

router.get("/downloadPanVerify", auth, verifyManagerController.downloadPanVerify);
router.get("/downloadallbankVerify", auth, verifyManagerController.downloadallbankVerify);
router.get("/downloadallwithdrawalrequest", auth, verifyManagerController.downloadallwithdrawalrequest);

// ---------General Manegar------//

router.get("/view-general-tab", auth, getUrl, adminPanelController.viewGeneralTab);
router.post("/general-tab-data/:id", auth, adminPanelController.generalTabData);
router.post("/generalTabData-table", auth, adminPanelController.generalTabTable);
router.get("/general_delete", auth, getUrl, adminPanelController.generalTabDelete);

//-----------banner----------------//

router.get("/add-banner", auth, getUrl, adminPanelController.addBanner);
router.post("/add-banner-Data", auth, upload.single("image"), adminPanelController.addBannerData);
router.get("/view-all-Banner", auth, getUrl, adminPanelController.viewallBanner);
router.post("/view-all-sideBanner", auth, adminPanelController.viewAllSideBanner);
router.get("/edit-sideBanner", auth, getUrl, adminPanelController.editSideBanner);
router.post("/edit-banner-Data", auth, upload.single("image"), adminPanelController.editBannerData);
router.get("/delete-sideBanner", auth, getUrl, adminPanelController.deleteSideBanner);

// -----------------------offer----------------------------

router.get("/add-offer", auth, getUrl, offerController.addOffer);
router.post("/add-offer-data", auth, offerController.addOfferData);
router.get("/view-all-offer", auth, getUrl, offerController.viewAllOffer);
router.post("/viewAllOffer-data-table", auth, offerController.viewAllOfferDataTable);
router.get("/editoffers", auth, getUrl, offerController.editoffers_page);
router.post("/edit-offer-data", auth, offerController.editOfferData);
router.get("/deleteoffers", auth, offerController.deleteoffers);




// -------------------------point System ------------------------------

router.get("/pointSystem", auth, getUrl, pointSystemController.pointSystem);
router.post("/update_point_system", auth, pointSystemController.updatePointSystem);

//-------------------point------------------

router.get("/point", auth, getUrl, pointController.point_page);
router.post("/add-point-data", auth, pointController.addPointData);

// --------------------contestcategory----------------------------

router.get("/view-contest-Category", auth, getUrl, contestcategoryController.contestCategoryPage);
router.get("/create-contest-category", auth, getUrl, contestcategoryController.createContestCategory);
router.post("/add-contest-category-data", auth, upload.single("image"), contestcategoryController.addContestCategoryData);
router.post("/contest-Category-table", auth, contestcategoryController.contestCategoryTable);
router.get("/edit-contest-category", auth, getUrl, contestcategoryController.editContestCategory);
router.post("/edit-contest-category-data/:contestId", upload.single("image"), auth, contestcategoryController.editContestCategoryData);
router.get("/delete-contest-category", auth, getUrl, contestcategoryController.deleteContestCategory);
router.get("/edit-contest-category-leaderBoard", auth, contestcategoryController.editContestCategoryLeaderBoard);

//---------------------global challengers--------------------------

router.get('/view-all-global-contests-challengers', auth, getUrl, challengersController.viewGlobleContests_page);
router.get("/add-global-contest-challengers", auth, getUrl, challengersController.addGlobalContest_page);
router.post("/add-global-contest-challengers-data", auth, challengersController.addGlobalchallengersData);
router.post("/global-challengers-datatable", auth, challengersController.globalChallengersDatatable);
router.get("/edit-global-contest-challengers/:id", auth, getUrl, challengersController.editglobalcontest_page);
router.post("/edit-global-contest-data", auth, challengersController.editGlobalContestData);
router.get("/delete-global-challengers", auth, getUrl, challengersController.deleteGlobalChallengers);
router.post("/delete-multi-global-challengers", auth, challengersController.globalcatMuldelete);
router.get("/addpricecard/:id", auth, getUrl, challengersController.addpricecard_page);
router.post("/add-price-card-Post", upload.single("image"), auth, challengersController.addpriceCard_Post);
router.post("/add-price-card-Post-byPercentage", auth, challengersController.addpricecardPostbyPercentage);
router.get("/deletepricecard/:id", auth, getUrl, challengersController.deletepricecard_data);
router.post("/get_contest_category", auth, getUrl, challengersController.getContestcategory);


// -------------------------custom contest----------------------------

router.get("/create-custom-contest", auth, getUrl, challengersController.createCustomContest);
router.get("/importmatchData/:matchKey", auth, getUrl, challengersController.importchallengersData);
router.get("/create_Match_custom", auth, getUrl, challengersController.create_custom_page);
router.post("/add_custom_contest_data", auth, challengersController.addCustom_contestData);
router.get("/editcustomcontest/:MatchChallengerId", auth, getUrl, challengersController.editcustomcontest_page);
router.post("/editcustomcontest/:MatchChallengerId", auth, challengersController.editcustomcontest_data);
router.get("/delete_customcontest/:MatchChallengerId", auth, getUrl, challengersController.delete_customcontest);
router.get("/makeConfirmed/:MatchChallengerId", auth, getUrl, challengersController.makeConfirmed);
router.get("/addEditmatchpricecard/:MatchChallengerId", auth, getUrl, challengersController.addEditmatchpricecard);
router.post("/add-edit-price-card-Post", auth, upload.single("image"), challengersController.addEditPriceCard_Post);
router.get("/deleteMatchPriceCard/:id", auth, getUrl, challengersController.deleteMatchPriceCard);
router.post('/add-edit-price-card-Post-byPercentage', auth, challengersController.addEditPriceCardPostbyPercentage);
router.get("/contestcancel/:MatchChallengerId", auth, challengersController.contestCancel);


// ------------------------------exports contests----------------------
router.get("/view_all_experts_contest", auth, getUrl, challengersController.viewAllExportsContests);
router.get("/add_expert_contest_page", auth, getUrl, challengersController.addExpertContestPage);
router.post("/add-expert-contest-data", upload.single("image"), challengersController.addExpertContestData);
router.get("/edit_expert_contest/:id", auth, challengersController.editExpertContest);
router.post("/edit-expert-contest-data/:id", upload.single("image"), challengersController.editExpertContestData);

// -----------------------------series Details-------------------------

router.get("/seriesDetails", auth, getUrl, seriesDetailsController.seriesDetails_Page);
router.post("/getFullSeriesDataTable", auth, seriesDetailsController.getFullSeriesDataTable_Page);
router.get("/getSeries", auth, getUrl, seriesDetailsController.getSeries);
//---------------------------- --player manager------------------------

router.get('/view-all-players', auth, getUrl, playersController.viewAllPlayer);
router.post('/view_player_datatable', auth, playersController.view_player_datatable);
router.get("/edit_player/:playerId", auth, getUrl, playersController.edit_player);
router.post("/edit_player_data/:playerId", auth, upload.single('image'), playersController.edit_player_data);
router.post("/saveplayerroles", auth, playersController.saveplayerroles);
router.get("/add_player_page", auth, playersController.addPlayerPage);
router.post("/add_player_data", auth, upload.single('image'), playersController.addPlayerData);


//--------------------------------Youtuber-----------------------

router.get("/add_youtuber", auth, getUrl, youtuberController.add_youtuber);
router.post("/add_youtuber_data", auth, youtuberController.add_youtuber_data);
router.post("/view_youtuber_dataTable", auth, youtuberController.view_youtuber_dataTable);
router.get("/view_youtuber", auth, getUrl, youtuberController.view_youtuber);
router.get("/edit_youtuber/:youtuberId", auth, getUrl, youtuberController.edit_youtuber);
router.post("/edit_youtuber/:youtuberId", auth, youtuberController.edit_youtuber_data);
router.get("/delete_youtuber/:youtuberId", auth, getUrl, youtuberController.delete_youtuber);
router.get("/view_youtuber_refer/:youtuberId", auth, getUrl, youtuberController.viewYoutuberRefer);
router.post("/refer_youtuber_datatable", youtuberController.referYoutuberDatatable);
router.get("/all_utuber_user", auth, getUrl, youtuberController.allYoutuberUser);
router.post("/contest_utuberuser_datatable", youtuberController.contestYoutuberUserDatatable);
router.get("/utube_profit_initiation", auth, getUrl, youtuberController.youtuberProfitInitiation);
router.get("/downloadalluserprofitdetails/:youtuberId", youtuberController.downloadAllUserProfitDetails);
//testing 
router.get("/giveYoutuberBonus", youtuberController.giveYoutuberBonus);
//testing
// -------------------------Receive Fund------------------------

router.get("/view_all_Receive_Fund", receivefundController.viewallReceiveFund);
router.post("/view_all_Receive_Fund_datatable", receivefundController.viewAllReceiveFundDatatable);


// ----------------------------- sub admin -------------------------

router.get("/add-sub-admin", auth, getUrl, subAdminController.addSubAdminPage);
router.post("/add-sub-admin-data", auth, subAdminController.addSubAdminData);
router.get("/view-sub-admin", auth, getUrl, subAdminController.viewSubAdminPage);
router.post("/view-sub-admin-table", auth, subAdminController.viewSubAdminData);
router.get("/view-permissions/:id", auth, getUrl, subAdminController.viewPermisionPage);
router.get('/update-sub-admin/:id', auth, getUrl, subAdminController.updateSubAdminPage);
router.post('/update-sub-admin-data/:id', auth, subAdminController.updateSubAdmin);
router.get('/delete-sub-admin/:id', auth, getUrl, subAdminController.deleteSubAdmin);

// ----------------------------- logout -------------------------

router.post("/logout", auth, adminController.logout);

// ------------------------- change password ------------------------

router.get("/change-password", auth, getUrl, adminController.changePasswordPage);
router.post("/change-password-data", auth, adminController.changePassword);

// ------------------------- result controller route ------------------------

//Cron don't add auth and getUrl function
router.get("/update_results_of_matches", resultController.update_results_of_matches);
router.get("/update_results_of_matches_refresh", resultController.update_results_of_matches_refresh);
router.get("/userpoints/:matchid", resultServices.userpoints);
router.get("/refund_amount", resultController.refund_amount);
router.get("/insertProfitLossData", resultController.insertProfitLossData);


router.get("/match-result", auth, getUrl, resultController.matchResult);
router.post("/match-result-table", auth, resultController.matchResultData);
router.get("/match-details/:id", auth, getUrl, resultController.matchDetails);
router.post("/match-details-table/:id", auth, resultController.matchDetailsData);
router.get("/allcontests/:id", auth, getUrl, resultController.matchAllcontests);
router.post("/allcontests-table/:id", auth, resultController.matchAllcontestsData);
router.get("/match-score/:id", auth, getUrl, resultController.matchScore);
router.get("/match-points/:id", auth, getUrl, resultController.matchPoints);
router.get("/batting-points/:id", auth, getUrl, resultController.battingPoints);
router.get("/bowling-points/:id", auth, getUrl, resultController.bowlingPoints);
router.get("/fielding-points/:id", auth, getUrl, resultController.fieldingPoints);
router.get("/team-points/:id", auth, getUrl, resultController.teamPoints);
router.post("/match-score-table/:id", auth, resultController.matchScoreData);
router.post("/match-points-table/:id", auth, resultController.matchPointsData);
router.post("/batting-points-table/:id", auth, resultController.battingPointsData);
router.post("/bowling-points-table/:id", auth, resultController.bowlingPointsData);
router.post("/fielding-points-table/:id", auth, resultController.fieldingPointsData);
router.post("/team-points-table/:id", auth, resultController.teamPointsData);
router.get('/contest-user-details/:matchkey', auth, getUrl, resultController.contestUserDetails);
router.post('/contest-user-details-table/:matchkey', auth, resultController.contestUserDetailsData);
router.post("/updateMatchFinalStatus/:id/:status", auth, resultController.updateMatchFinalStatus);
router.get("/autoupdateMatchFinalStatus", resultController.autoUpdateMatchFinalStatus);
router.get("/user-teams", auth, getUrl, resultController.viewTeams);
router.post("/user-teams-tabled", resultController.viewTeamsData);
router.get("/cancelMatch/:id", auth, resultController.cancelMatch);


// -----------------------edit user teams by admin  ----------------------
router.get("/edit-user-teams", auth, resultController.editUserTeams)
router.post("/edit-user-teams-tabled", auth, resultController.editUserTeamsTable)
router.post("/user-team-modified", auth, resultController.userTeamModified)
// -----------------------popup notification-------------------

router.get("/popup", auth, getUrl, popupNotificationController.popup);
router.post("/popup-data", auth, popupNotificationController.popupData);
router.get("/add-popup", auth, getUrl, popupNotificationController.addPopup);
router.get("/delete-popup", auth, popupNotificationController.deletePopup);
router.post("/add-popup-data", auth, upload.single("image"), popupNotificationController.addPopupData);


//----------------------profit loss--------------

router.get("/view-all-profit-loss", auth, profitLossController.viewAllProfitLoss);
router.post("/view-all-profit-loss-data-table", auth, profitLossController.viewAllProfitLossDataTable);
router.get('/download-all-profit-loss-data-excel', auth, profitLossController.downloadAllProfitLossDataExcel);


// --------------------notification---------------

router.post('/get-user', auth, notificationController.getUser);
router.get("/push-notification", auth, getUrl, notificationController.sendPushNotification);
router.post("/push-notification-data", auth, notificationController.sendPushNotificationData);
router.get("/email-notification", auth, getUrl, notificationController.sendEmailNotification);
router.post("/email-notification-data", auth, notificationController.sendEmailNotificationData);
router.get("/sms-notification", auth, getUrl, notificationController.smsNotification);
router.post("/sms-notification-data", auth, notificationController.smsNotificationData);

// --------------------------leaderBoard------------------
router.get("/view_leaderBoard_page", auth, getUrl, leaderboardController.viewLeaderBoarderPage);
router.post("/view_leaderBoard_datatable", auth, leaderboardController.viewLeaderBoardDatatable);
router.get("/add_series_pricecard_page/:id", auth, getUrl, leaderboardController.addSeriesPriceCardPage);
router.post("/add-series-price-card-Post", auth, leaderboardController.addSeriesPriceCardData);
router.get("/delete_series_pricecard/:id", auth, getUrl, leaderboardController.deleteSeriesPriceCard);

// ----------------18/07/2022-------------
router.post("/distribute_winning_amount_series_leaderboard/:id", leaderboardController.distributeWinningAmountSeriesLeaderboard);
router.get("/leaderboard_rank/:id", auth, leaderboardController.leaderboardRank);//need to testing api when data available
router.post("/leaderBoard_rank_datatable", leaderboardController.leaderBoardRankDatatable);//need to testing api when data available
router.get("/update-has_leaderBoard/:id", leaderboardController.updateHasLeaderBoard);

// -------------------bot user-------------------- don't add auth in post api 

router.get("/add-botuser", auth, getUrl, botUserController.botUserPage);
router.post("/add-botuser-data", botUserController.botUserData);
router.get("/view-botuser", auth,  getUrl, botUserController.viewBotUserPage);
router.post("/view-botuser-datatable", botUserController.viewBotUserData);
router.post("/join-botuser", botUserController.joinBotUser);
router.get("/edit_bot_details_page/:id",auth,botUserController.editBotDetails);
router.post("/edit_bot_details_data",upload.single('image'),botUserController.editBotDetailsData);
router.post("/joined_bot_user/:id",challengersController.joinedBotUser);

// activate and deactivate bot users

router.post("/return-a-b", auth, activateDeactivateBotController.acivateBotUser);
router.post("/return-i-b", auth, activateDeactivateBotController.deactivateBotUser);


// -----------------------------Privacy Policy-------------------
router.get('/privacy_policy_page', auth, getUrl, privacyPolicyController.privacyPolicyPage);
router.post("/edit_privacy_policy/:id?", auth, getUrl, privacyPolicyController.editPrivacyPolicy);


//------------------------------Terms Conditions-----------------

router.get('/terms_condition-page', auth, getUrl, termsConditionsController.termsConditionPage);
router.post("/edit_terms_conditions/:id?", auth, getUrl, termsConditionsController.editTermsCondition);

//------------------------------FairPlay Policy------------------

router.get("/legality_policy_page", auth, getUrl, LegalityController.LegalityPage);
router.post("/edit_legality_policy/:id?", auth, getUrl, LegalityController.editLegality);


//------------------------------About us-------------------------

router.get("/about_us_page", auth, getUrl, aboutusController.aboutusPage);
router.post("/edit_about_us/:id?", auth, getUrl, aboutusController.editAboutUs);

// ------------------------------contact-------------------------

router.get("/contact_page", auth, getUrl, contactController.contactPage);
router.post("/edit_Contact/:id?", auth, getUrl, contactController.editContact);

// -------------------------------how to play------------------
router.get("/how_to_play_page", auth, getUrl, howtoplayController.howtoplayPage);
router.post("/edit_how_to_play", auth, getUrl, howtoplayController.editHowtoplay);
router.get("/view_selected_category_howtoplay", auth, getUrl, howtoplayController.viewSelectedCategoryHowtoplay);


//-----cricket api controller (3rd party api)------------//
// router.get("/listMatches", cricketApiController.listOfMatches);
router.get("/listMatches", cricketApiController.listOfMatches_entity);
router.get("/importPlayers/:matchkey", cricketApiController.fetchPlayerByMatch_entity);
router.get("/contestCompression", contestCompressionController.contestCompression);
router.get("/givingLevelUser", contestCompressionController.givingLevelUser);

// ---------Refer level Manegar------//

router.get("/viewLevel", auth, getUrl, adminPanelController.viewLevel);
router.post("/levelData/:id", auth, adminPanelController.levelData);
router.post("/levelDatatable", auth, adminPanelController.levelDatatable);
router.get("/levelDelete", auth, getUrl, adminPanelController.levelDelete);

//---------deposit request----//
router.get("/deposit_amount", auth, getUrl, verifyManagerController.depositAmount);
router.post("/deposit_amount_datatable", auth, getUrl, verifyManagerController.deposit_amount_datatable);

router.get("/approve-deposit-request/:id", verifyManagerController.approve_deposit_request);
//approveend
router.get("/reject-deposit-request/:id", auth, getUrl, verifyManagerController.reject_deposit_request);

router.get("/importfootballData", FootballApiController.listOfMatches_entity);

router.get("/importKabaddiData", KabaddiApiController.listOfMatches_entity);

router.get("/importBasketballData" , basketballController.listOfMatches_entity)

module.exports = router;