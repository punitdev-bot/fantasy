const res = require('express/lib/response');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const adminModel = require('../../models/adminModel');
const referLevelModel = require("../../models/referLevelModel");
const fs = require("fs");
class adminServices {
    constructor() {
        return {
            registerAdminData: this.registerAdminData.bind(this),
            loginAdminData: this.loginAdminData.bind(this),
            changePasswordData: this.changePasswordData.bind(this),
            updateProfileData: this.updateProfileData.bind(this),
            // ------------------------------------
            addGenralTab: this.addGenralTab.bind(this),
            generalTabs: this.generalTabs.bind(this),
            generalTabDelete: this.generalTabDelete.bind(this),
            addBanner: this.addBanner.bind(this),
            editSideBanner: this.editSideBanner.bind(this),
            editBannerData: this.editBannerData.bind(this),
            deleteSideBanner: this.deleteSideBanner.bind(this),
            addLevel: this.addLevel.bind(this),
            levelDelete: this.levelDelete.bind(this),
        }
    }
    async registerAdminData(req) {
        try {
            const checkMailId = await adminModel.findOne({ email: req.body.email });
            if (checkMailId) {
                return {
                    status: false,
                    message: 'Email Id already Register'
                }
            } else {
                let androidVer = {}
                androidVer.updation_points = '<p>FantasyApp</p>'
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync(req.body.password, salt);
                const inserAdmin = new adminModel({
                    name: req.body.name,
                    email: req.body.email,
                    password: hash,
                    androidversion: androidVer
                })
                let saveAdmin = await inserAdmin.save();
                if (saveAdmin) {
                    return {
                        message: "register successfully",
                        status: true
                    }
                }
            }

        } catch (error) {
            throw error;
        }
    }

    async loginAdminData(req) {
        try {
            let whereObj = {
                is_deleted: false,
                email: req.body.email,
            }
            const data = await adminModel.find(whereObj);
            if (data.length == 0) {
                return {
                    message: " Email ID not register ",
                    status: false
                };
            } else {
                const checkPass = bcrypt.compareSync(req.body.password, data[0].password);
                if (!checkPass) {
                    return {
                        message: " Invalid Login...",
                        status: false,
                    };
                } else {
                    return {
                        message: " Admin Login Successfully...",
                        status: true,
                        data: data,
                    };
                }
            }
        } catch (error) {
            throw error;
        }
    }
    async addGenralTab(req) {
        try {
            let whereObj = {
                role: req.params.id,
                'general_tabs.type': req.body.type
            }
            const addData = await adminModel.findOne(whereObj);
            if (addData == null) {
                let doc = {
                    type: req.body.type,
                    amount: req.body.amount,

                };
                const updateData = await adminModel.updateOne({ role: req.params.id }, {
                    $push: {
                        'general_tabs': doc
                    }
                });
                if (updateData) {
                    return true;
                }
            } else {
                let obj
                if (req.body.flag && req.body.flag == "Bonus") {
                    obj = {
                        "general_tabs.$.amount2": req.body.amount
                    }
                } else {
                    obj = {
                        "general_tabs.$.amount": req.body.amount
                    }
                }
                let type = req.body.type;
                const updateData = await adminModel.updateOne({ role: req.params.id, 'general_tabs.type': type }, {
                    $set: obj
                });
                if (updateData) {
                    return true;
                }
            }
        } catch (error) {
            throw error;
        }
    }
    async generalTabs(req) {
        try {
            const getGeneralTabArray = await adminModel.aggregate([{
                $project: { general_tabs: 1 }
            }])
            if (getGeneralTabArray) {
                return getGeneralTabArray;
            }

        } catch (error) {
            throw error;
        }
    }
    async generalTabDelete(req) {
        try {
            const findData = await adminModel.find({ _id: req.query.Id });

            let newData = [];
            for (let key of findData[0].general_tabs) {
                if ((key._id).toString() != (req.query.generalTabId).toString()) {
                    newData.push(key)
                }
            }
            const deleteGeneralTb = await adminModel.updateOne({ _id: req.query.Id }, {
                $set: {
                    general_tabs: newData
                }
            })
            if (deleteGeneralTb) {
                return true;
            }

        } catch (error) {
            throw error;
        }
    }
    async addBanner(req) {
        try {
            if (req.fileValidationError) {
                return {
                    status: false,
                    message: req.fileValidationError
                }

            }
            let adminId = '0'
            let doc = req.body;
            delete doc.adminId;
            if (req.file) {
                doc.image = `/${doc.typename}/${req.file.filename}`;
            }
            delete doc.typename;
            const addBannerData = await adminModel.updateOne({ role: adminId }, {
                $push: {
                    sidebanner: doc
                }
            });
            if (addBannerData.modifiedCount == 1) {
                return true;
            }

        } catch (error) {
            throw error;
        }
    }
    async editSideBanner(req) {
        try {
            const data = await adminModel.findOne({ _id: req.query.Id });
            let arrayObj = [];
            for (let key of data.sidebanner) {
                if ((key._id).toString() == (req.query.bannerId).toString()) {
                    arrayObj.push(key)
                }
            }
            return arrayObj;

        } catch (error) {
            throw error;
        }
    }
    async editBannerData(req) {
        try {
            if (req.fileValidationError) {
                return {
                    status: false,
                    message: req.fileValidationError
                }

            }
            let image = `/${req.body.typename}/${req.file?.filename}` || "";

            if (!req.file) {
                let get = await adminModel.findOne({ role: '0', 'sidebanner._id': req.query.id }, { 'sidebanner.$': 1 });
                image = get.sidebanner[0].image
            } else {
                if (req.file) {
                    let get = await adminModel.findOne({ role: '0', 'sidebanner._id': req.query.id }, { 'sidebanner.$': 1 });
                    if (get.sidebanner[0].image) {
                        let fs = require('fs');
                        let filePath = `public${get.sidebanner[0].image}`;
                        if (fs.existsSync(filePath) == true) {
                            fs.unlinkSync(filePath);
                        }
                    }
                }
            }
            let updateBanner
            if (req.body.bannerType == 'others') {
                updateBanner = await adminModel.updateOne({ 'sidebanner._id': req.query.id }, {
                    $set: {
                        'sidebanner.$.type': req.body.type,
                        'sidebanner.$.bannerType': req.body.bannerType,
                        'sidebanner.$.image': image,
                        'sidebanner.$.url': req.body.url
                    }
                })
            } else {
                updateBanner = await adminModel.updateOne({ 'sidebanner._id': req.query.id }, {
                    $set: {
                        'sidebanner.$.type': req.body.type,
                        'sidebanner.$.bannerType': req.body.bannerType,
                        'sidebanner.$.image': image,
                        'sidebanner.$.url': ''
                    }
                })
            }
            if (updateBanner.modifiedCount == 1) {
                return true;
            }

        } catch (error) {
            throw error;
        }
    }
    async deleteSideBanner(req) {
        try {
            const findBanner = await adminModel.findOne({ _id: mongoose.Types.ObjectId(req.session.data._id), role: '0' });
            let newData = []
            console.log(findBanner)
            for (let key of findBanner.sidebanner) {
                console.log(key)
                if ((key._id).toString() != (req.query.bannerId).toString()) {
                    console.log(key)
                    newData.push(key)
                }
            }
            let get = await adminModel.findOne({ role: '0', 'sidebanner._id': req.query.bannerId, _id: mongoose.Types.ObjectId(req.session.data._id) }, { 'sidebanner.$': 1 });
            if (get.sidebanner[0].image) {
                let fs = require('fs');
                let filePath = `public/${get.sidebanner[0].image}`;
                if (fs.existsSync(filePath) == true) {
                    fs.unlinkSync(filePath);
                }
            }
            const deleteBanner = await adminModel.updateOne({ role: 0, _id: mongoose.Types.ObjectId(req.session.data._id) }, {
                $set: {
                    sidebanner: newData
                }
            })
            if (deleteBanner.modifiedCount == 1) {
                return true;
            }

        } catch (error) {
            throw error;
        }
    }

    // ------------------------- change password ------------------------
    async changePasswordData(req) {
        try {
            const { current_password, new_password, confirm_password } = req.body;
            if (new_password !== confirm_password) {
                return {
                    message: 'Confirm password and new password are not matched.',
                    status: false,
                };
            }
            const user = await adminModel.findOne({ _id: req.session.data._id });
            if (!user) {
                return {
                    message: 'Invalid Details.',
                    status: false,
                };
            }
            if (!(bcrypt.compareSync(current_password, user.password))) {
                return {
                    message: 'Old password does not matched to previous password.',
                    status: false,
                };
            }
            let salt = bcrypt.genSaltSync(10);
            let password = bcrypt.hashSync(new_password, salt);
            const updateUser = await adminModel.findOneAndUpdate({ _id: req.session.data._id }, { password: password }, { new: true });
            return {
                message: 'Password Changed Successfully...!',
                status: true,
            }
        } catch (error) {
            throw error;
        }
    }
    async updateProfileData(req) {
        try {
            if (req.fileValidationError) {
                return {
                    status: false,
                    message: req.fileValidationError
                }

            } else {
                if (req.body.name && req.body.email && req.body.mobile && req.body.masterpassword) {
                    let obj = req.body
                    const adminDatas = await adminModel.find({ _id: req.params.id });
                    if (adminDatas.length > 0) {
                        if (req.file) {
                            if (adminDatas[0].image) {
                                let filePath = `public${adminDatas[0].image}`;
                                if (fs.existsSync(filePath) == true) {
                                    fs.unlinkSync(filePath);
                                }
                            }
                            obj.image = `/${req.body.typename}/${req.file.filename}`
                        }
                        const updateAdminData = await adminModel.updateOne({ _id: req.params.id }, {
                            $set: obj
                        })
                        if (updateAdminData.modifiedCount > 0) {
                            return {
                                status: true,
                                message: 'admin data successfully update ,please login again--'
                            }
                        } else {
                            let filePath = `public/${req.body.typename}/${req.file.filename}`;
                            if (fs.existsSync(filePath) == true) {
                                fs.unlinkSync(filePath);
                            }
                            return {
                                status: false,
                                message: 'admin data not update..error'
                            }
                        }


                    } else {
                        let filePath = `public/${req.body.typename}/${req.file.filename}`;
                        if (fs.existsSync(filePath) == true) {
                            fs.unlinkSync(filePath);
                        }
                        return {
                            status: false,
                            message: 'admin data not found ..error'
                        }
                    }

                } else {
                    let filePath = `public/${req.body.typename}/${req.file.filename}`;
                    if (fs.existsSync(filePath) == true) {
                        fs.unlinkSync(filePath);
                    }
                    return {
                        status: false,
                        message: 'please proper details..'
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    async addLevel(req) {
        try {
            let whereObj = {
                'level': req.body.level
            }
            let updateObj = {
                'level': req.body.level,
                'percentage': req.body.percentage,
                is_deleted: false
            }
            const addData = await referLevelModel.findOneAndUpdate(whereObj, updateObj, { new: true, upsert: true });
            return addData;
        } catch (error) {
            throw error;
        }
    }
    async levelDelete(req) {
        try {
            let whereObj = {
                '_id': req.query.generalTabId
            }
            let deleteData = await referLevelModel.findOneAndUpdate(whereObj, { is_deleted: true });
            return deleteData;

        } catch (error) {
            throw error;
        }
    }

}
module.exports = new adminServices();