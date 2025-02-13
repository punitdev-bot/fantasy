const userModel = require('../../models/userModel');
const withdrawalModel = require('../../models/withdrawModel');
const axios = require("axios");
const withdrawRequestModel = require('../../models/withdrawRequestModel');
const constant = require('../../config/const_credential');
const crypto = require("crypto");
const hmacSHA256 = require("crypto-js/hmac-sha256");
const Base64 = require("crypto-js/hmac-sha256");
const CryptoJS = require("crypto-js");
const moment = require("moment");
const Razorpay = require("razorpay");
const NOTIFICATION_TEXT = require("../../config/notification_text");
const notification = require("../../utils/notifications");
const TransactionModel = require("../../models/transactionModel");
const NotificationModel = require("../../models/notificationModel");
const bonusReferedModel = require("../../models/bonusReferedModel");
const depositModel = require("../../models/depositModel");
const Mail = require("../../utils/mail");


let instance
let USERNAME
let PASSWORD
let RAZORPAY_ACC
let KEY_SECRET
let KEY_ID
if (process.env.NODE_ENV == 'prod') {
    KEY_ID = constant.RAZORPAY_KEY_ID_LIVE,
        KEY_SECRET = constant.RAZORPAY_KEY_SECRET_LIVE,
        USERNAME = constant.RAZORPAY_KEY_ID_LIVE,
        PASSWORD = constant.RAZORPAY_KEY_SECRET_LIVE
    RAZORPAY_ACC = constant.RAZORPAY_ACC_LIVE
} else {
    KEY_ID = constant.RAZORPAY_KEY_ID_TEST
    KEY_SECRET = constant.RAZORPAY_KEY_SECRET_TEST
    USERNAME = constant.RAZORPAY_KEY_ID_TEST,
        PASSWORD = constant.RAZORPAY_KEY_SECRET_TEST
    RAZORPAY_ACC = constant.RAZORPAY_ACC_TEST
}
instance = new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
});
const GetBouns = require('../../utils/getBonus');


const path = require('path');
const mongoose = require('mongoose');
class verificationServices {
    constructor() {
        return {
            viewPan_Details: this.viewPan_Details.bind(this),
            viewAadhar_Details: this.viewAadhar_Details.bind(this),
            update_Pan_Details: this.update_Pan_Details.bind(this),
            update_Aadhar_Details: this.update_Aadhar_Details.bind(this),
            editPan_Details: this.editPan_Details.bind(this),
            editAadhar_Details: this.editAadhar_Details.bind(this),
            viewBank_Details: this.viewBank_Details.bind(this),
            editBank_Details: this.editBank_Details.bind(this),
            update_Bank_Details: this.update_Bank_Details.bind(this),
            approve_withdraw_request: this.approve_withdraw_request.bind(this),
            mannual_withdraw_request: this.mannual_withdraw_request.bind(this),
            reject_withdraw_request: this.reject_withdraw_request.bind(this),
            widthdrowWebhook: this.widthdrowWebhook.bind(this),
            viewKyc_Details: this.viewKyc_Details.bind(this),
            update_Kyc_Details: this.update_Kyc_Details.bind(this),
            editKyc_Details: this.editKyc_Details.bind(this),
            givebonusToUser: this.givebonusToUser.bind(this),
            updateUserBalanceAndUserVerify: this.updateUserBalanceAndUserVerify.bind(this),
            approve_deposit_request: this.approve_deposit_request.bind(this),
            reject_deposit_request: this.reject_deposit_request.bind(this),
        }
    }

    async updateUserBalanceAndUserVerify(data) {
        const update = {};
        update["$inc"] = { "userbalance.bonus": data.bonusamount };
        update["code"] = "";
        if (data.verifyType != "") update[`user_verify.${data.verifyType}`] = 1;
        if (data.type != constant.PROFILE_VERIFY_BONUS_TYPES.REFER_BONUS)
            update[`user_verify.${data.type}`] = 1;
        return await userModel.findOneAndUpdate({ _id: data.userId }, update, {
            new: true,
        });
    }

    async givebonusToUser(
        bonusamount = 0,
        userId,
        type,
        verifyType = "",
        referUser
    ) {
        if (!referUser) {
            referUser = null;
        }
        const transaction_id = `${constant.APP_SHORT_NAME}-EBONUS-${Date.now()}`;
        const balanceUpdate = await this.updateUserBalanceAndUserVerify({
            bonusamount,
            type,
            verifyType,
            userId,
        });
        if (Number(bonusamount) > 0) {
            await TransactionModel.create({
                userid: userId,
                type: constant.BONUS_NAME[type],
                transaction_id,
                transaction_by: constant.TRANSACTION_BY.APP_NAME,
                amount: bonusamount,
                paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED,
                challengeid: null,
                seriesid: null,
                joinid: null,
                bonus_amt: bonusamount,
                win_amt: 0,
                addfund_amt: 0,
                bal_bonus_amt: balanceUpdate.userbalance.bonus || 0,
                bal_win_amt: balanceUpdate.userbalance.winning || 0,
                bal_fund_amt: balanceUpdate.userbalance.balance || 0,
                total_available_amt:
                    balanceUpdate.userbalance.balance ||
                    0 + balanceUpdate.userbalance.winning ||
                    0 + balanceUpdate.userbalance.bonus ||
                    0,
                withdraw_amt: 0,
                challenge_join_amt: 0,
                cons_bonus: 0,
                cons_win: 0,
                cons_amount: 0,
            });
            let bonus_refered = {}
            bonus_refered['userid'] = referUser;
            bonus_refered['fromid'] = userId;
            bonus_refered['amount'] = 51;
            bonus_refered['type'] = 'signup bonus';
            bonus_refered['txnid'] = transaction_id;

            let bonusRefModel = await bonusReferedModel.create(bonus_refered);
            console.log("---bonusRefModel--->--", bonusRefModel);

            if (type == constant.PROFILE_VERIFY_BONUS_TYPES.REFER_BONUS) {
                const dataToSave = {
                    $push: {
                        bonusRefered: {
                            userid: mongoose.Types.ObjectId(referUser),
                            amount: bonusamount,
                            txnid: transaction_id,
                        },
                    },
                };
                await userModel.findOneAndUpdate({ _id: userId }, dataToSave, {
                    new: true,
                });
            }

            const notificationObject = {
                receiverId: userId,
                deviceTokens: balanceUpdate.app_key,
                type: NOTIFICATION_TEXT.BONUS,
                title: NOTIFICATION_TEXT.BONUS.TITLE(constant.BONUS_NAME[type]),
                message: NOTIFICATION_TEXT.BONUS.BODY(
                    bonusamount,
                    constant.BONUS_NAME[type]
                ),
                entityId: userId,
            };
            await NotificationModel.create({
                title: notificationObject.message,
                userid: userId,
            });

            if (!balanceUpdate.app_key) {
                return true;
            }
            await notification.PushNotifications(notificationObject);
        }

        return true;
    }

    async viewPan_Details(req) {
        try {
            const findUser = await userModel.findOne({ _id: req.params.id });
            if (findUser) {
                return {
                    status: true,
                    data: findUser,
                }
            }
        } catch (error) {
            throw error
        }
    }
    async viewKyc_Details(req) {
        try {
            const findUser = await userModel.findOne({ _id: req.params.id });
            if (findUser) {
                return {
                    status: true,
                    data: findUser,
                }
            }
        } catch (error) {
            throw error
        }
    }
    async viewAadhar_Details(req) {
        try {
            const findUser = await userModel.findOne({ _id: req.params.id });
            if (findUser) {
                return {
                    status: true,
                    data: findUser,
                }
            }
        } catch (error) {
            throw error
        }
    }

    async update_Pan_Details(req) {
        try {

            const userData = await userModel.findOne({ _id: mongoose.Types.ObjectId(req.body.userid) }, { refer_id: 1 });

            let abc;
            console.log("req.body", req.body)
            if (req.body.panstatus == 1) {
                const panBonus = await new GetBouns().getBonus(constant.BONUS_TYPES.PAN_BONUS, constant.PROFILE_VERIFY_PAN_BANK.SUBMITED);


                abc = await this.givebonusToUser(
                    panBonus,
                    req.body.userid,
                    constant.PROFILE_VERIFY_BONUS_TYPES.PAN_BONUS,
                    constant.USER_VERIFY_TYPES.PAN_VERIFY,
                    userData.refer_id,
                );

            }
            if (req.body.panstatus == 2) {
                const panCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'idProof.status': req.body.panstatus, 'user_verify.pan_verify': req.body.panstatus, 'idProof.comment': req.body.comment || '' } }, { new: true });
                if (!panCredentials) {
                    return {
                        status: false,
                        message: 'pan status can not update..error'
                    }
                } else {
                    return {
                        status: true,
                        message: 'pan rejected successfully ...',
                        data: panCredentials,
                    }
                }
            }
            if (abc) {
                const panCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'idProof.status': req.body.panstatus, 'user_verify.pan_verify': req.body.panstatus, 'idProof.comment': req.body.comment || '' } }, { new: true });
                if (!panCredentials) {
                    return {
                        status: false
                    }
                } else {
                    return {
                        status: true,
                        data: panCredentials,
                    }
                }
            }
        } catch (error) {
            throw error
        }
    }
    async update_Kyc_Details(req) {
        try {

            const userData = await userModel.findOne({ _id: mongoose.Types.ObjectId(req.body.userid) }, { refer_id: 1 });

            let abc;
            console.log("req.body", req.body)
            if (req.body.panstatus == 1) {
                const panBonus = await new GetBouns().getBonus(constant.BONUS_TYPES.VOTER_BONUS, constant.PROFILE_VERIFY_VOTER_BANK.SUBMITED);


                abc = await this.givebonusToUser(
                    panBonus,
                    req.body.userid,
                    constant.PROFILE_VERIFY_BONUS_TYPES.VOTER_BONUS,
                    constant.USER_VERIFY_TYPES.VOTER_VERIFY,
                    userData.refer_id,
                );

            }
            if (req.body.panstatus == 2) {
                const panCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'idProof.status': req.body.panstatus, 'user_verify.voter_verify': req.body.panstatus, 'idProof.comment': req.body.comment || '' } }, { new: true });
                if (!panCredentials) {
                    return {
                        status: false,
                        message: 'voterid can not update..error'
                    }
                } else {
                    return {
                        status: true,
                        message: 'voterid rejected successfully ...',
                        data: panCredentials,
                    }
                }
            }
            if (abc) {
                const panCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'idProof.status': req.body.panstatus, 'user_verify.voter_verify': req.body.panstatus, 'idProof.comment': req.body.comment || '' } }, { new: true });
                if (!panCredentials) {
                    return {
                        status: false
                    }
                } else {
                    return {
                        status: true,
                        data: panCredentials,
                    }
                }
            }
        } catch (error) {
            throw error
        }
    }
    async update_Aadhar_Details(req) {
        try {

            const userData = await userModel.findOne({ _id: mongoose.Types.ObjectId(req.body.userid) }, { refer_id: 1 });

            let abc;
            console.log("req.body---------->", req.body)
            if (req.body.aadharstatus == 1) {
                const aadharBonus = await new GetBouns().getBonus(constant.BONUS_TYPES.AADHAR_BONUS, constant.PROFILE_VERIFY_AADHAR_BANK.SUBMITED);


                abc = await this.givebonusToUser(
                    aadharBonus,
                    req.body.userid,
                    constant.PROFILE_VERIFY_BONUS_TYPES.AADHAR_BONUS,
                    constant.USER_VERIFY_TYPES.AADHAR_VERIFY,
                    userData.refer_id,
                );

            }
            if (req.body.aadharstatus == 2) {
                const aadharCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'idProof.status': req.body.aadharstatus, 'user_verify.aadhar_verify': req.body.aadharstatus, 'idProof.comment': req.body.comment || '' } }, { new: true });
                if (!aadharCredentials) {
                    return {
                        status: false,
                        message: 'aadhar status can not update..error'
                    }
                } else {
                    return {
                        status: true,
                        message: 'aadhar rejected successfully ...',
                        data: aadharCredentials,
                    }
                }
            }
            if (abc) {
                const aadharCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'idProof.status': req.body.aadharstatus, 'user_verify.aadhar_verify': req.body.aadharstatus, 'idProof.comment': req.body.comment || '' } }, { new: true });
                if (!aadharCredentials) {
                    return {
                        status: false
                    }
                } else {
                    return {
                        status: true,
                        data: aadharCredentials,
                    }
                }
            }
        } catch (error) {
            throw error
        }
    }

    async editPan_Details(req) {
        try {
            const findUser = await userModel.findOne({ _id: req.params.id })
            if (findUser) {
                return {
                    status: true,
                    data: findUser,
                }
            }
        } catch (error) {
            throw error
        }
    }
    async editKyc_Details(req) {
        try {
            const findUser = await userModel.findOne({ _id: req.params.id })
            if (findUser) {
                return {
                    status: true,
                    data: findUser,
                }
            }
        } catch (error) {
            throw error
        }
    }
    async editAadhar_Details(req) {
        try {
            const findUser = await userModel.findOne({ _id: req.params.id })
            if (findUser) {
                return {
                    status: true,
                    data: findUser,
                }
            }
        } catch (error) {
            throw error
        }
    }

    //  async Update_Credentials_Pan(req) {
    //     try {
    //          const updatePan = await userModel.findOneAndUpdate({_id:req.body.userid},{$set:{'pancard.pan_dob':req.body.DOB,'pancard.pan_name':req.body.pan_name.toUpperCase(),'pancard.status':req.body.status,'user_verify.pan_verify':req.body.status,'pancard.comment':req.body.comment || ''}},{new:true})
    //          if(!updatePan){
    //             return{
    //                 status:false
    //        }
    //    }else{
    //        return{
    //            status:true,
    //            data:updatePan,
    //        }
    //         }      
    //     } catch (error) {
    //        throw error
    //     }
    // }
    // async Update_Credentials_Bank(req){
    //     try {
    //         const dataUpdate = await userModel.findOneAndUpdate({ _id: req.body.userid }, {
    //             $set: {
    //                 'bank.accno': req.body.accno,
    //                 'bank.ifsc': req.body.ifsc.toUpperCase(),
    //                 'bank.bankname': req.body.bankname,
    //                 'bank.bankbranch': req.body.bankbranch,
    //                 'bank.state': req.body.state,
    //                 'bank.status': req.body.status,
    //                 'user_verify.bank_verify': req.body.status,
    //                 'bank.comment': req.body.comment || '',
    //             }
    //         }, { new: true });
    //         if(!dataUpdate){
    //             return{
    //                 status:false
    //        }
    //    }else{
    //        return{
    //            status:true,
    //            data:dataUpdate,
    //        }
    //         }      

    //     } catch (error) {
    //         throw error
    //     }
    // }



    async viewBank_Details(req) {
        try {
            const viewUser = await userModel.findOne({ _id: req.params.id });
            if (viewUser) {
                return {
                    status: true,
                    data: viewUser,
                }
            }
        } catch (error) {
            throw error
        }
    }
    async editBank_Details(req) {
        try {
            const findUser = await userModel.findOne({ _id: req.params.id });
            if (findUser) {
                return {
                    status: true,
                    data: findUser,
                }
            }
        } catch (error) {
            throw error
        }
    }
    async update_Bank_Details(req) {
        try {
            let abc;
            
            if (req.body.bankstatus == 1) {
                const bankBonus = await new GetBouns().getBonus(constant.BONUS_TYPES.BANK_BONUS, constant.PROFILE_VERIFY_PAN_BANK.SUBMITED);

                abc = await this.givebonusToUser(
                    bankBonus,
                    req.body.userid,
                    constant.PROFILE_VERIFY_BONUS_TYPES.BANK_BONUS,
                    constant.USER_VERIFY_TYPES.BANK_VERIFY
                );

            } else if (req.body.bankstatus == 2) {
                const bankCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'bank.status': req.body.bankstatus, 'user_verify.bank_verify': req.body.bankstatus, 'bank.comment': req.body.comment || '' } }, { new: true });
                if (!bankCredentials) {
                    return {
                        status: false,
                        message: 'bank status can not update..error'
                    }
                } else {
                    return {
                        status: true,
                        message: 'bank rejected successfully ...',
                        data: bankCredentials,
                    }
                }
            }
            if (abc) {
                const bankCredentials = await userModel.findOneAndUpdate({ _id: req.body.userid }, { $set: { 'bank.status': req.body.bankstatus, 'user_verify.bank_verify': req.body.bankstatus, 'bank.comment': req.body.comment || '' } }, { new: true });
                if (!bankCredentials) {
                    return {
                        status: false,
                        message: 'bank status can not update..error'
                    }
                } else {
                    return {
                        status: true,
                        message: 'update successfully ..',
                        data: bankCredentials,
                    }
                }
            }
        } catch (error) {
            throw error
        }
    }

    async approve_withdraw_request(req) {
        try {
            let amount1 = req.query.amount;
            if (amount1 >= 100 && amount1 <= 1000) {
                amount1 -= 5
            } else if (amount1 >= 1001 && amount1 <= 10000) {
                amount1 -= 10
            } else if (amount1 >= 10001) {
                amount1 -= 25
            } else {
                amount1 = req.query.amount;
            }
            const amount = Number(amount1) * 100;
            console.log("req.query.withdrawalId", req.query.withdrawalId)

            const pipeline = [];
            pipeline.push({
                $match: {
                    _id: mongoose.Types.ObjectId(req.query.withdrawalId),
                    status: 0
                }
            })

            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'userid',
                    foreignField: '_id',
                    as: 'userData'
                }
            })
            pipeline.push({
                $unwind: { path: "$userData" }
            })
            let result = await withdrawalModel.aggregate(pipeline);
            if (result.length > 0) {
                let userWithdraw = result[0];
                let user = userWithdraw.userData;
                if (user.status != 'activated') {
                    return {
                        status: false,
                        message: 'user is blocked.'
                    }
                }
                if (user.user_verify.pan_verify != 1) {
                    return {
                        status: false,
                        message: 'Please first complete your PAN verification process to withdraw this amount.'
                    }
                }
                if (user.user_verify.bank_verify != 1) {
                    return {
                        status: false,
                        message: 'Please first complete your Bank verification process to withdraw this amount.'
                    }
                }

                try {
                    let userContact = {};
                    userContact.name = user.bank.accountholder;
                    userContact.email = user.email;
                    userContact.contact = user.mobile;
                    userContact.type = "employee";
                    userContact.reference_id = req.query.withdrawalId;
                    console.log("--userContact--", userContact)
                    let contantAdd = await axios.post("https://api.razorpay.com/v1/contacts", userContact, {
                        auth: {
                            username: USERNAME,
                            password: PASSWORD
                        }
                    });
                    if (contantAdd.data.id) {
                        let fundObj = {
                            contact_id: contantAdd.data.id,
                            account_type: "bank_account",
                            bank_account: {
                                name: user.bank.accountholder,
                                ifsc: user.bank.ifsc,
                                account_number: user.bank.accno
                            }
                        }
                        console.log("--fundObj--", fundObj)
                        let addFund = await axios.post("https://api.razorpay.com/v1/fund_accounts", fundObj, {
                            auth: {
                                username: USERNAME,
                                password: PASSWORD
                            }
                        });

                        if (addFund.data && addFund.data.active == true) {

                            let payoutObj = {
                                account_number: RAZORPAY_ACC,
                                fund_account_id: addFund.data.id,
                                amount: Number(amount),
                                currency: "INR",
                                mode: "IMPS",
                                purpose: "payout",
                                queue_if_low_balance: true,
                                reference_id: contantAdd.data.reference_id,
                            }
                            let payoutData = await axios.post("https://api.razorpay.com/v1/payouts", payoutObj, {
                                auth: {
                                    username: USERNAME,
                                    password: PASSWORD
                                }
                            });

                            if (payoutData.data.id) {
                                const updateWidthdrow = await withdrawalModel.findOneAndUpdate({
                                    _id: req.query.withdrawalId
                                }, {
                                    payout_id: payoutData.data.id,
                                    fund_account_id: payoutData.data.fund_account_id,
                                    // status:finalstatus,
                                })

                            } else {
                                if (payoutData.data.error) {
                                    if (payoutData.data.error.description) {
                                        const updateWidthdrow = await withdrawalModel.findOneAndUpdate({
                                            _id: req.query.withdrawalId
                                        }, {
                                            status_description: payoutData.data.error.description,
                                        })
                                    }
                                    return {
                                        status: false,
                                        messaage: payoutData.data.error.description
                                    }
                                } else {
                                    const updateWidthdrow = await withdrawalModel.findOneAndUpdate({
                                        _id: req.query.withdrawalId
                                    }, {
                                        status_description: 'somthing issue',
                                    })
                                    return {
                                        status: false,
                                        messaage: 'balance not found'
                                    }
                                }
                            }
                        } else {
                            const updateWidthdrow = await withdrawalModel.findOneAndUpdate({
                                _id: req.query.withdrawalId
                            }, {
                                status_description: 'Fund Account is not activate',
                            })
                            return {
                                status: false,
                                message: 'Fund Account is not activate'
                            }
                        }




                    } else {
                        return {
                            status: false,
                            messaage: "contact not create ..rayzorpay",
                            data: {}
                        }
                    }




                    // const payoutsInstance = new cashFree.Payouts({
                    //     env: 'PRODUCTION',
                    //     clientId: constant.CASHFREE_PAYOUT_CLIENT_ID,
                    //     clientSecret: constant.CASHFREE_PAYOUT_SECRETKEY,
                    //     pathToPublicKey: process.cwd() + '/public_key.pem'
                    // });
                    // console.log("---payoutsInstance-------",payoutsInstance)
                    // let beneId = `${req.params.id}${user.bank.accno}`;
                    // consooel.log("---beneId----",beneId)
                    // let beneficiaryData = {
                    //     beneId: beneId,
                    //     name: user.bank.accountholder,
                    //     email: user.email,
                    //     phone: user.mobile,
                    //     bankAccount: user.bank.accno,
                    //     ifsc: user.bank.ifsc,
                    //     address1: 'India',
                    //     city: '',
                    //     state: '',
                    //     pincode: '',
                    // }
                    // console.log("-----beneficiaryData---",beneficiaryData)



                    // const response1 = await payoutsInstance.beneficiary.add(beneficiaryData);
                    // const response = await instance.
                    // console.log("----response-----",response)
                    // const timestamp = Date.now();
                    // let transferId = `${timestamp}${Math.floor(1000 + Math.random() * 9000)}`;
                    // if (response.status == 'SUCCESS' && response.subCode == 200 || response.status == 'ERROR' && response.subCode == 409) {
                    //     let transferss = {
                    //         beneld: beneId,
                    //         amount: amount,
                    //         transferId: transferId,
                    //         remarks: 'Transfer request from Payout kit',
                    //         withdrawid: req.query.withdrawalId
                    //     }
                    //     await withdrawRequestModel.create(transferss);

                    //     const transferResult = await payoutsInstance.transfers.requestTransfer({
                    //         beneId: beneId,
                    //         amount: amount,
                    //         transferId: `${timestamp}${Math.floor(1000 + Math.random() * 9000)}`,
                    //     });
                    //     const updateWithdraw = await withdrawalModel.findOneAndUpdate({ _id: req.query.withdrawalId }, {
                    //         $set: {
                    //             approved_date: moment().format("YYYY-MM-DD"),
                    //             status: 3,
                    //             comment: "approved",
                    //             tranfer_id: transferId,
                    //             beneld: beneficiaryData.beneId
                    //         }
                    //     }, { new: true });
                    //     if (updateWithdraw) {
                    //         return {
                    //             status: true,
                    //             data: updateWithdraw.status
                    //         }
                    //     }
                    // }
                    return {
                        status: true,
                        messaage: "payout successfull"
                    }

                } catch (error) {
                    console.log('error', error)
                    throw error
                }

            } else {
                return {
                    status: false,
                    message: 'data is not available.'
                }
            }
        } catch (error) {
            console.log('error', error)
            throw error
        }
    }
    //approve
    async mannual_withdraw_request(req) {
        try {

            let amount1 = req.query.amount;
            if (amount1 >= 100 && amount1 <= 1000) {
                amount1 -= 5
            } else if (amount1 >= 1001 && amount1 <= 10000) {
                amount1 -= 10
            } else if (amount1 >= 10001) {
                amount1 -= 25
            } else {
                amount1 = req.query.amount;
            }
            const amount = Number(amount1) * 100;

            const pipeline = [];
            pipeline.push({
                $match: {
                    _id: mongoose.Types.ObjectId(req.query.withdrawalId),
                    status: 0
                }
            })

            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'userid',
                    foreignField: '_id',
                    as: 'userData'
                }
            })
            pipeline.push({
                $unwind: { path: "$userData" }
            })
            let result = await withdrawalModel.aggregate(pipeline);
            if (result.length > 0) {
                let userWithdraw = result[0];
                let user = userWithdraw.userData;
                if (user.status != 'activated') {
                    return {
                        status: false,
                        message: 'user is blocked.'
                    }
                }
                if (user.user_verify.pan_verify != 1) {
                    return {
                        status: false,
                        message: 'Please first complete your PAN verification process to withdraw this amount.'
                    }
                }
                if (user.user_verify.bank_verify != 1) {
                    return {
                        status: false,
                        message: 'Please first complete your Bank verification process to withdraw this amount.'
                    }
                }
                if (!user.email) {
                    return {
                        status: false,
                        message: 'Please Verify your email'
                    }
                }

                try {

                    let userContact = {};
                    userContact.name = user.bank.accountholder;
                    userContact.email = user.email;
                    userContact.contact = user.mobile;
                    userContact.type = "employee";
                    userContact.reference_id = req.query.withdrawalId;
                    let beneId = `${req.params.id}${user.bank.accno}`;
                    console.log("---beneId----", beneId)
                    let beneficiaryData = {
                        beneId: beneId,
                        name: user.bank.accountholder,
                        email: user.email,
                        phone: user.mobile,
                        bankAccount: user.bank.accno,
                        ifsc: user.bank.ifsc,
                        address1: 'India',
                        city: '',
                        state: '',
                        pincode: '',
                    }
                    const timestamp = Date.now();
                    let transferId = `${timestamp}${Math.floor(1000 + Math.random() * 9000)}`;
                    let transferss = {
                        beneld: beneId,
                        amount: amount,
                        transferId: transferId,
                        remarks: 'Transfer request from Payout kit',
                        withdrawid: req.query.withdrawalId
                    }
                    await withdrawRequestModel.create(transferss);
                    const updateWithdraw = await withdrawalModel.findOneAndUpdate({ _id: req.query.withdrawalId }, {
                        $set: {
                            approved_date: moment().format("YYYY-MM-DD"),
                            status: 1,
                            comment: "approved",
                            tranfer_id: transferId,
                            beneld: beneficiaryData.beneId
                        }
                    }, { new: true });

                    await TransactionModel.findOneAndUpdate({ transaction_id: updateWithdraw.withdraw_req_id }, { paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED });
                    const mail = new Mail(user.email);
                    await mail.sendMail(
                        mail.email,
                        `Hello User,

We’re writing to confirm that your recent withdrawal request has been successfully processed.

Transaction Details:

Amount Withdrawn: ${req.query.amount}
Transaction ID: ${transferId}
The funds should be available in your account shortly. If you have any questions or notice any discrepancies, please don’t hesitate to reach out to our support team.

Thank you for choosing FantasyApp!

Best regards,`,
                        `💸 Withdrawal Successful - Confirmation of Your Transaction`
                    );
                    if (updateWithdraw) {
                        return {
                            status: true,
                            data: updateWithdraw.status
                        }
                    }
                }

                catch (error) {
                    console.log('error', error)
                    throw error
                }

            } else {
                return {
                    status: false,
                    message: 'data is not available.'
                }
            }
        } catch (error) {
            console.log('error', error)
            throw error
        }
    }
    //shahilapproveend
    async reject_withdraw_request(req) {
        try {
            const updateWithdraw = await withdrawalModel.findOneAndUpdate({ _id: req.query.withdrawalId }, { $set: { approved_date: moment().format("YYYY-MM-DD"), status: 2, comment: req.query.description } }, { new: true });


            if (updateWithdraw) {
                const returnAmount = await userModel.findByIdAndUpdate({ _id: req.query.userid }, {
                    $inc: {
                        'userbalance.winning': Number(req.query.amount)
                    }
                })
                console.log(returnAmount)
                if (returnAmount) {
                    const mail = new Mail(returnAmount.email);
                    await mail.sendMail(
                        mail.email,
                        `Hello User,

We regret to inform you that your recent withdrawal request could not be processed.

Transaction Details:

Requested Amount: ${req.query.amount}
Date of Request: ${moment().format("YYYY-MM-DD")}
Reason for Rejection: ${req.query.description}

Please review the details above and take the necessary steps to resolve this issue. If you have questions or believe this was an error, feel free to contact our support team for further assistance.

We appreciate your understanding and thank you for using FantasyApp.

Best regards,`,
                        `🚫 Withdrawal Request Rejected - Action Needed`
                    );
                    return {
                        status: true,
                        data: updateWithdraw.status
                    }
                } else {
                    return {
                        status: false,
                        message: 'Amount not add in wallet'
                    }
                }

            } else {
                return {
                    status: false,
                    data: 'rejection can not be proccess'
                }
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
    async widthdrowWebhook(req) {
        try {
            if (req.body) {
                const webhookSignature = req.headers['x-razorpay-signature']
                console.log("----webhookSignature---", webhookSignature)
                let message = JSON.stringify(req.body)
                let expected_signature1 = crypto.createHmac('sha256', KEY_SECRET).update(message).digest('hex');
                console.log("--expected_signature1---", expected_signature1)
                console.log("--webhookSignature--test--->>", webhookSignature === expected_signature1)
                if (webhookSignature === expected_signature1) {
                    if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.TRANSACTION_CREATED) {
                        console.log("--- constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.TRANSACTION_CREATED-------", constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.TRANSACTION_CREATED)
                        let payoutData = req.body.payload.transaction.entity;

                        let finalstatus = 8;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        console.log("--payoutData.status--", payoutData)
                        let updateObj = {
                            $set: {
                                tranfer_id: payoutData.id,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: 'transaction created'
                            }
                        }

                        console.log("--updateObj--", updateObj)
                        const updateWidthdrow = await withdrawalModel.updateOne({
                            payout_id: payoutData.source.id
                        }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            return {
                                status: true,
                                messaage: "widthdrow transaction created successfully"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }

                    } else if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.PAYOUT_FAILED) {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 8;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        console.log("--payoutData.status--", payoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        const updateWidthdrow = await withdrawalModel.updateOne({
                            payout_id: payoutData.id
                        }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {

                            const returnAmount = await userModel.updateOne({ _id: updateWidthdrow.userid }, {
                                $inc: {
                                    'userbalance.winning': Number(updateWidthdrow.amount)
                                }
                            })
                            console.log(returnAmount)
                            if (returnAmount.modifiedCount > 0) {
                                return {
                                    status: true,
                                    data: updateWidthdrow.status
                                }
                            } else {
                                return {
                                    status: false,
                                    message: 'Amount not add in wallet'
                                }
                            }

                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    } else if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.PAYOUT_REVERSED) {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 7;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        console.log("--payoutData.status--", payoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        const updateWidthdrow = await withdrawalModel.updateOne({
                            payout_id: payoutData.id
                        }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            return {
                                status: true,
                                messaage: "widthdrow transaction reversed"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    } else if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.PAYOUT_UPDATED) {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 1;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        const updateWidthdrow = await withdrawalModel.updateOne({
                            payout_id: payoutData.id
                        }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            return {
                                status: true,
                                messaage: "widthdrow transaction updated"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    } else if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.PAYOUT_PROCESSED) {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 1;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        console.log("--payoutData.status--", payoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        const updateWidthdrow = await withdrawalModel.updateOne({ payout_id: payoutData.id }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            return {
                                status: true,
                                messaage: "widthdrow transaction processing"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    } else if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.PAYOUT_INITIATED) {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 3;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        console.log("--payoutData.status--", payoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        const updateWidthdrow = await withdrawalModel.updateOne({ payout_id: payoutData.id }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            return {
                                status: true,
                                messaage: "widthdrow transaction Initiated"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    } else if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.PAYOUT_QUEUED) {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 5;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        console.log("--checkoutData--", checkoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        console.log("--payoutData.id--->>--", payoutData.id)
                        console.log("----updateObj--->>>", updateObj)
                        const updateWidthdrow = await withdrawalModel.updateOne({ payout_id: payoutData.id }, updateObj, { new: true });

                        console.log("--updateWidthdrow--queued--???-", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            return {
                                status: true,
                                messaage: "widthdrow transaction Queued"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    } else if (req.body.event == constant.RAZORPAY_TRANSACTION_WEBHOOK_EVENT.PAYOUT_REJECTED) {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 2;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        const updateWidthdrow = await withdrawalModel.updateOne({ payout_id: payoutData.id }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            const returnAmount = await userModel.updateOne({ _id: updateWidthdrow.userid }, {
                                $inc: {
                                    'userbalance.winning': Number(updateWidthdrow.amount)
                                }
                            })
                            console.log(returnAmount)
                            if (returnAmount.modifiedCount > 0) {
                                return {
                                    status: true,
                                    data: updateWidthdrow.status
                                }
                            } else {
                                return {
                                    status: false,
                                    message: 'Amount not add in wallet'
                                }
                            }
                            return {
                                status: true,
                                messaage: "widthdrow transaction Reject"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    } else {
                        let payoutData = req.body.payload.payout.entity;
                        console.log("--payoutData.status--", payoutData)
                        let finalstatus = 3;
                        let checkoutData = payoutData.created_at
                        let aprojvtDat = new Date(checkoutData)
                        let updateObj = {
                            $set: {
                                fund_account_id: payoutData.fund_account_id,
                                status: finalstatus,
                                approved_date: payoutData.created_at,
                                account_id: req.body.account_id,
                                status_description: payoutData.status_details.description
                            }
                        }
                        const updateWidthdrow = await withdrawalModel.updateOne({ payout_id: payoutData.id }, updateObj, { new: true });

                        console.log("--updateWidthdrow---", updateWidthdrow)
                        if (updateWidthdrow.modifiedCount == 1) {
                            return {
                                status: true,
                                messaage: "widthdrow transaction created successfully"
                            }
                        }
                        return {
                            status: false,
                            messaage: "widthdrow transaction can not update"
                        }
                    }

                } else {
                    return {
                        status: false,
                        message: "Authentication Failed",
                        data: ""
                    }
                }
            } else {
                return {
                    status: false,
                    message: 'Invalid Credentials',
                    data: ""
                }
            }
        } catch (error) {
            throw error
        }
    }

    //approve
    async approve_deposit_request(req) {
        try {

            let amount = req.query.amount;
            const pipeline = [];
            pipeline.push({
                $match: {
                    _id: mongoose.Types.ObjectId(req.query.depositId),
                    status: 'pending'
                }
            })

            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            })
            pipeline.push({
                $unwind: { path: "$userData" }
            })
            let result = await depositModel.aggregate(pipeline);
            if (result.length > 0) {
                let userDeposit = result[0];
                let user = userDeposit.userData;
                if (user.status != 'activated') {
                    return {
                        status: false,
                        message: 'user is blocked.'
                    }
                }

                try {
                    const update = {};
                    update["$inc"] = { "userbalance.balance": Number(userDeposit.amount) };
                    const userData = await userModel.findOneAndUpdate(
                        { _id: user._id },
                        update,
                        { new: true }
                    );
                    await TransactionModel.findOneAndUpdate({ transaction_id: userDeposit.transaction_id }, { paymentstatus: constant.PAYMENT_STATUS_TYPES.CONFIRMED }, { new: true });
                    const updateDeposit = await depositModel.findOneAndUpdate({ _id: req.query.depositId }, {
                        $set: {
                            approveDate: moment().format("YYYY-MM-DD HH:mm:ss"),
                            status: "approved",
                            comment: "approved"
                        }
                    }, { new: true });
                    if (updateDeposit) {
                        
                        return {
                            status: true,
                            data: updateDeposit.status
                        }
                    }
                }

                catch (error) {
                    console.log('error', error)
                    throw error
                }

            } else {
                return {
                    status: false,
                    message: 'data is not available.'
                }
            }
        } catch (error) {
            console.log('error', error)
            throw error
        }
    }
    //shahilapproveend
    async reject_deposit_request(req) {
        try {
            const updateDeposit = await depositModel.findOneAndUpdate({ _id: req.query.depositId }, { $set: { approveDate: moment().format("YYYY-MM-DD  HH:mm:ss"), status: 'rejected', comment: req.query.description } }, { new: true });
            return {
                status: true,
                data: updateDeposit.status
            }
        } catch (error) {
            throw error
        }
    }

}


module.exports = new verificationServices();