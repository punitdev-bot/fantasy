const nodemailer = require("nodemailer");
const constant = require('../config/const_credential');
module.exports = class mail {
    otp;
    msg;
    constructor(email) {
        this.email = email;
        this.otp = mail.genOtp();
    }

    async sendOtp(msg) {
        this.msg = msg;
        return true;
    }
    static genOtp() {
        return process.env.NODE_ENV == 'prod' ? `${Math.floor(1000 + Math.random() * 9000)}` : "1234";
    }
    async sendMail(email, message, subject) {
        if (process.env.NODE_ENV != 'prod') return true;
        console.log("--email, message, subject---", email, message, subject);
        console.log("process.env.MAIL_FROM", process.env.MAIL_FROM, "process.env.MAIL_APP_KEY", process.env.MAIL_APP_KEY, "DOMAIN", process.env.MAILGUN_DOMAIN)
        const mailgun = require("mailgun-js");
        const DOMAIN = process.env.MAILGUN_DOMAIN;
        const mg = await mailgun({ apiKey: process.env.MAIL_APP_KEY, domain: DOMAIN });
        console.log('mg', mg);
        const data = {
            from: process.env.MAIL_FROM,
            to: email,
            subject: subject,
            text: message
        };
        mg.messages().send(data, function (error, body) {
            console.log(body);
        });


    }
}