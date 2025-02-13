const contestCompressionService = require('../services/contestCompressionService')

exports.contestCompression = async (req, res) => {
    try {
        const data = await contestCompressionService.contestCompression(req);
        // return res.status(200).json(Object.assign({ success: true }, data));
        return true;
    } catch (error) {
        console.log(error);
    }
}

exports.givingLevelUser = async (req, res) => {
    try {
        const data = await contestCompressionService.givingLevelUser(req);
        return true;
        // return res.status(200).json(Object.assign({ success: true }, data));
    } catch (error) {
        console.log(error);
    }
}