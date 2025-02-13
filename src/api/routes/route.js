//Required Packages
const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("../controller/userController");
const MatchController = require("../controller/matchController");
const ContestController = require("../controller/ContestController");
const webController = require("../controller/webController");
const CronJob = require("../services/cronJobServices");

const auth = require("../../middlewares/apiauth");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('multer-----------------', req.body.typename);
    console.log('multer-----------------', req.body);
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
});
let aadharupload = upload.fields([{ name: 'front', maxCount: 1 }, { name: 'back', maxCount: 1 }])
let idProofupload = upload.fields([{ name: 'front', maxCount: 1 }, { name: 'back', maxCount: 1 }])


router.get("/", (req, res) => {
  res.send("working");
});
//Temporary Registration of User And OTP to Them
router.post("/add-tempUser", userController.addTempuser);

//Registration of User and Check the Verification code
router.post("/add-user", userController.registerUser);

//User Login
router.post("/login", userController.loginuser);

//User Logout
router.post("/logout", auth, userController.logoutUser);

//if Mobile Use for login then call the login OTP
router.post("/login-otp", userController.loginuserOTP);

//Get Version API for the Android and IOS
router.get("/getversion", userController.getVersion);

//Get Main Banner for App
router.get("/getmainbanner", userController.getmainbanner);

//Get Slide Banner for App
router.get("/webslider", userController.getwebslider);

// Save Image Url of User
router.post("/imageUploadUser", auth, upload.single("image"), userController.uploadUserImage);

//Resend OTP
router.post("/resendotp", userController.resendOTP);

// Send Otp on mobile for mobile verification
router.post("/verifyMobileNumber", auth, userController.verifyMobileNumber);

// Send Otp on Email for email verification
router.post("/verifyEmail", auth, userController.verifyEmail);

// Verifiy the email and mobile from OTP
router.post("/verifyCode", auth, userController.verifyCode);

// Get User all verifivcation Details
router.get("/allverify", auth, userController.allverify);

// Get User Full Details
router.get("/userfulldetails", auth, userController.userFullDetails);

// Get User refer Details
router.get("/user-refer-list", auth, userController.userReferList);
router.get("/userAllReferList", auth, userController.userAllReferList);

//Get User Transaction
router.get("/mytransactions", auth, userController.myTransactions);

// Send Link to User
router.get("/sendLink", userController.sendLink);

//Get User Transaction

// router.get('/mytransactionsold', auth, userController.myOldTransactions);

// Edit Profile of User
router.post("/editprofile", auth, userController.editProfile);

// Forgot password to send OTP for vaild user
router.post("/forgotpassword", userController.forgotPassword);

// Check Forgot Password OTP
router.post("/matchCodeForReset", userController.matchCodeForReset);

// Reset Password
router.post("/resetpassword", userController.resetPassword);

// Change Password
router.post("/changepassword", auth, userController.changePassword);

// For Pancard Verify submit the pancard information
router.post("/panrequest", auth, upload.single("image"), userController.panRequest);
router.post("/depositRequest", auth, upload.single("image"), userController.depositRequest);
router.get("/getDeposit", auth, userController.getDeposit);

//addhar_card_verification
router.post("/aadhar_card_request", auth, aadharupload, userController.aadharRequest);

//addhar_card_verification
router.get("/getaadharDetails", auth, userController.aadharDetails);


// See Uploaded Pan information of user
router.get("/getpandetails", auth, userController.panDetails);

// For bank Verify submit the bank information
router.post("/bankrequest", auth, upload.single("image"), userController.bankRequest);

// IdProofDetails
router.post("/uploadIdProof", auth, idProofupload, userController.uploadIdProof);
router.get("/getIdProofDetails", auth, userController.getIdProofData);

//See Uploaded Bank information of user
router.get("/getbankdetails", auth, userController.bankDetails);
router.get("/zoop", auth, userController.zoop)
//User Balance
router.get("/getbalance", auth, userController.getBalance);

//User Wallet and verify Details
router.get("/mywalletdetails", auth, userController.myWalletDetails);

//Withdraw Request By user
router.post("/requestwithdraw", auth, userController.requestWithdraw);

//Withdraw List of users
router.get("/mywithdrawlist", auth, userController.myWithdrawList);

//Request for Add cash
router.post("/requestaddcash", auth, userController.requestAddCash);

//cashfree
router.post("/cashfreewebhook", userController.cashfreewebhook);
//cashfree

router.post("/juspay", userController.juspaywebhookDetail);
//Webhook data get
router.post("/webhookDetail", userController.webhookDetail);
// phonpaywebhook
router.post("/phonePayWebhook", userController.phonePayWebhook);
// phonepaywebhook end

//Social Authtication
router.post("/socialauthentication", userController.socialAuthentication);


//Payment Status change
// router.post('/paymentstatus', userController.paymentStatus);

//Get Notifications by today and privous array
router.get("/getnotification", auth, userController.getNotification);

//Get Offers
router.get("/getoffers", auth, userController.getOffers);

router.get("/deactivateAccount", auth, userController.deactivateAccount);
router.get("/updateCheck", userController.getAndroidVersion);

// Ticket Routes

router.post("/raiseTicket", auth, userController.raiseTicket);

router.get("/viewalltickets", auth, userController.viewalltickets);

router.get("/viewticket", auth, userController.viewticket);

// Request for Affiliate

router.post("/req_affiliate", auth, userController.req_affiliate);


// Get All Activated Seriesget
// router.get('/getallseries', auth, MatchController.getAllSeries);

// Get All Upcoming Matches
router.get("/getmatchlist", auth, MatchController.getMatchList);

// Get Details of a perticular match(no use)
router.get("/getmatchdetails/:matchId", auth, MatchController.getMatchDetails);

// Get All Match Players with their points
router.get("/getallplayers/:matchId", MatchController.getallplayers);
router.get("/getallplayersopt/:matchId", auth, MatchController.getallplayersopt);

router.get("/viewPlayerState",  MatchController.viewPlayerState);

//apk download code 
router.get("/download-app", MatchController.downloadApp);

//apk download code  end
// Get Perticular Players Info
router.get("/getPlayerInfo", auth, MatchController.getPlayerInfo);

// Create Team for User to a perticular match
router.post("/createmyteam", auth, MatchController.createMyTeam);
// phonepay payment api now
router.post("/phonepayapi", auth, MatchController.phonepayapi);
router.post("/phonepayapiwithbase64", auth, MatchController.phonepayapiwithbase64);
router.post("/phonepayapiwithcalling", MatchController.phonepayapiwithcalling);
//  phone pay api end now
// User All Teams of the match
router.get("/getMyTeams", auth, MatchController.getMyTeams);

router.get("/megawinners", auth, MatchController.megawinners);

// User team according their TeamId
router.get("/viewteam", auth, MatchController.viewTeam);



// User Joiend latest 5 Upcoming
router.get("/newjoinedmatches", auth, MatchController.Newjoinedmatches);

// User Joiend latest 5 live match
router.get("/livematches", auth, MatchController.NewjoinedmatchesLive);

// User Joiend all completed matches
router.get("/all-completed-matches", auth, MatchController.AllCompletedMatches);

// Live Match Runs
router.get("/getlivescores", auth, MatchController.getLiveScores);

// Live Leaderbord of the challange
router.get("/liveRanksLeaderboard", auth, MatchController.liveRanksLeaderboard);
router.get("/matchplayerfantasyscorecards", auth, MatchController.matchPlayerFantasyScoreCards);
// Scors/Points of players
router.get("/fantasyscorecards", auth, MatchController.fantasyScoreCards);

// Get Match Live Score
router.get("/matchlivescore", auth, MatchController.matchlivedata);

// Get Join Team Player Info
router.get("/joinTeamPlayerInfo", auth, MatchController.joinTeamPlayerInfo);
router.post("/getReferDetails", auth, userController.referDetails);

// Get All Contest of Match
router.get("/getAllContests", auth, ContestController.getAllContests);
router.get("/getAllNewContests", auth, ContestController.getAllNewContests);

// Gat Details Of A Perticular Contest of Match
router.get("/getContestDetails", auth, ContestController.getContest);

//--> For User Contest/Leauge Join
router.post("/joinContest", auth, ContestController.joinContest);

// User Joined Contests/Leauge
router.get("/myjoinedcontests", auth, ContestController.myJoinedContests);

// Get Contest LeaderBard
router.get("/myleaderboard", auth, ContestController.myLeaderboard);

//Is Running contest for join Querys
router.get("/updateJoinedusers", auth, ContestController.updateJoinedusers);

//Replace With Another Team In Ongoing JoinedContest
router.post("/switchteams", auth, ContestController.switchTeams);

// Get amount to be used for joining contest
router.get("/getUsableBalance", auth, ContestController.getUsableBalance);
router.post("/getUsableBalance", auth, ContestController.getUsableBalance);

// Get All Contests Of A Match Without Category
router.get("/getAllContestsWithoutCategory", auth, ContestController.getAllContestsWithoutCategory);

// create private Contest
router.post("/create-private-contest", auth, ContestController.createPrivateContest);

// Contest Join By contestCode
router.post("/joinContestByCode", auth, ContestController.joinContestByCode);

// get youtuber profit
router.get("/getutubetprofit", auth, userController.getYoutuberProfit);

// Get All Match Players with their points with playing status 1
router.get("/getAllPlayersWith_PlayingStatus/:matchId", auth, MatchController.getAllPlayersWithPlayingStatus);

// router.get('/test', CronJob.updatePlayerSelected);

//refer bonus which get bonus get to refer person
router.get("/refer_bonus", userController.referBonus);

router.get("/popup_notify", userController.popupNotify);

router.get("/addcash1", auth, userController.addcash1);

// getallseries api for leaderboard
router.get("/getallseries", auth, userController.getAllSeries);


// get leaderboard by series id
router.get("/getleaderboard/:series_id?", auth, userController.getleaderboard);

//get leaderBoard by series id and contest cat leaderboard true
router.get("/getLeaderBoardbyCat/:series_id", auth, userController.getLeaderBoardbyCat);

// web controller api's

router.get("/webBanner", webController.webBanner);
router.get("/termsConditions", webController.termsConditions);
router.get("/privacyPolicy", webController.privacyPolicy);
router.get("/aboutus", webController.aboutus);
router.get("/Legality", webController.Legality);
// router.get("/testimonial",webController.testimonial);
router.get("/contact", webController.contact);
router.get("/how_to_play", webController.howtoplay);
router.get("/faq_question", webController.faqQuestion);

//-------------------
let { playerPoint } = require("../../admin/services/resultServices");
router.get("/getmatchlist123", playerPoint);
const cricketcontrollerfun = require("../../admin/controller/cricketApiController");



router.get("/matchplayerimport/:matchkey", cricketcontrollerfun.fetchPlayerByMatch_entity);
router.post("/updateTeamName", auth, userController.updateTeamName);




module.exports = router;
