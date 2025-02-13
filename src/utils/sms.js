const axios = require('axios');
module.exports = class SMS {
    otp;
    msg;
    message;
    constructor(mobile, message) {
        this.mobile = mobile;
        this.otp = SMS.genOtp();
        this.message = message;
    }

    async sendOtp(msg) {
        this.msg = msg;
        return true;
    }
    static genOtp() {
        return process.env.NODE_ENV == 'prod' ? `${Math.floor(1000 + Math.random() * 9000)}` : '1234';
    }
    async sendSMS(mobile, message) {
        if (process.env.NODE_ENV != 'prod') return true;
        console.log("---mobile--and otp", mobile, "..message--", message, "--process.env.BULKSMS_AUTH_KEY---", process.env.BULKSMS_AUTH_KEY, "--process.env.BULKSMS_SENDER--", process.env.BULKSMS_SENDER, "--process.env.BULKSMS_ROUTE--", process.env.BULKSMS_ROUTE)
        let payload = {
            "campaign_name": 'OTP',
            "auth_key": process.env.BULKSMS_AUTH_KEY,
            "receivers": Number(mobile),
            "sender": process.env.BULKSMS_SENDER,
            "route": 'TR',
            "message": {
                "msgdata": message,
                "Template_ID": '1107111515785715633',
                'coding': 1
            },
        }
        let headers = {
            'Content-Type': 'application/json'
        }
        axios.post(
            `http://sms.bulksmsserviceproviders.com/api/send/sms`, payload
        )
            .then(function (response) {
                console.log('...............................the response is', response.data);
                return response;
            })
            .catch(function (error) {
                console.log('AXIOS message API ERROR-- ', error);
                // reject(error);
            });
        return true;

    }
}