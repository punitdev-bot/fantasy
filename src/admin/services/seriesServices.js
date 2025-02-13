const mongoose = require('mongoose');
const moment = require("moment");

const seriesModel = require('../../models/addSeriesModel');
const sportCategoryModel = require('../../models/sportCategoryModel');

class seriesServices {
    constructor() {
        return {
            addSeries: this.addSeries.bind(this),
            seriesDataTable: this.seriesDataTable.bind(this),
            updateStatusforSeries: this.updateStatusforSeries.bind(this),
            edit_Series: this.edit_Series.bind(this),
            editSeriesData: this.editSeriesData.bind(this),
            findSeries: this.findSeries.bind(this)
        }
    }

    async findSeries(data) {
        let result = await seriesModel.find(data);
        return result;
    }

    async addSeries(req) {
        try {
          

            let whereObj = {
                is_deleted: false,
                name: req.body.seriesName,
                fantasy_type: req.body.fantasy_type
            }
            const data = await this.findSeries(whereObj);
            if (data.length > 0) {
                return {
                    message: "series Name already exist...",
                    status: false
                }
            } else {
                if (moment(moment(req.body.startdate).format('DD-MM-YYYY'), 'DD-MM-YYYY').isBefore(moment(moment(req.body.enddate).format('DD-MM-YYYY'), 'DD-MM-YYYY')) === false) {
                    return {
                        message: "please select a end date after start date",
                        status: false
                    };
                } else if (moment(moment().format('DD-MM-YYYY'), 'DD-MM-YYYY').isBefore(moment(moment(req.body.enddate).format('DD-MM-YYYY'), 'DD-MM-YYYY')) === false) {
                    return {
                        message: "end date should be greater then current date...",
                        status: false
                    }
                } else {
                    let addseries = new seriesModel({
                        fantasy_type: req.body.fantasy_type,
                        name: req.body.seriesName,
                        start_date: moment(req.body.startdate).format('YYYY-MM-DD HH:mm'),
                        end_date: moment(req.body.enddate).format('YYYY-MM-DD HH:mm')
                    });

                    let saveseries = await addseries.save();
                    if (saveseries) {
                        return {
                            status: true,
                            message: 'series add successfully'
                        }
                    } else {
                        return {
                            status: false,
                            message: 'series not add error..'
                        }
                    }
                }
            }
        } catch (error) {
            throw error;
        }
    }

    async seriesDataTable(req) {
        try {
            let limit1 = req.query.length;
            let start = req.query.start;
            let sortObject = {},
                dir, join
            if (req.query.seriesName) {
                let seriesName = req.query.seriesName;
                conditions.seriesName = { $regex: new RegExp("^" + seriesName.toLowerCase(), "i") }
            }

            seriesModel.countDocuments(conditions).exec((err, rows) => {
                let totalFiltered = rows;
                let data = [];
                let count = 1;
                seriesModel.find(conditions).skip(Number(start)).limit(Number(limit1)).sort(sortObject).exec((err, rows1) => {

                    if (err) console.log(err);
                    rows1.forEach((index) => {

                        data.push({
                            "fantasy_type": index.fantasy_type,
                            "name": index.name,
                            "start_date": moment(index.start_date).format("dddd, MMMM Do YYYY, h:mm:ss a"),
                            "end_date": moment(index.end_date).format("dddd, MMMM Do YYYY, h:mm:ss a"),
                            "status": index.status,
                            "Actions": `<div class="row">
                        <div class="col-md-6">
                        <a href="#" ><i class="bi bi-pencil-square" style="color:blue;" title="update"></i></a>
                        </div>
                        <div class="col-md-6">
                        <a href="#"><i class="bi bi-trash2-fill" style="color:blue;" title="delete"></i></a>
                        </div>
                        </div>`
                        });
                        count++;

                        if (count > rows1.length) {

                            let json_data = JSON.stringify({
                                "recordsTotal": rows,
                                "recordsFiltered": totalFiltered,
                                "data": data
                            });
                            return json_data;
                        }
                    });
                });
            });
        } catch (error) {
            throw error;
        }
    }

    async updateStatusforSeries(req) {
        try {
            let data = await seriesModel.updateOne({ _id: req.params.id }, { $set: { status: req.query.status } });

            if (data.modifiedCount == 1) {
                return true;
            }
        } catch (error) {
            throw error;
        }
    }

    async edit_Series(req) {
        try {
            if (req.params.id) {

                const type = await sportCategoryModel.find({})

                let whereObj = {
                    is_deleted: false,
                    _id: req.params.id
                };
                let data = await this.findSeries(whereObj);

                if (data.length > 0) {
                    return {
                        status: true,
                        data: data,
                        type
                    }
                } else {
                    return {
                        status: false,
                        message: 'series not found ..'
                    }
                }

            } else {
                return {
                    status: false,
                    message: 'Invalid series Id..'
                }
            }

        } catch (error) {
            throw error;
        }
    }

    async editSeriesData(req) {
        try {
            if (req.body.seriesName) {
                let doc = req.body
                doc.name = doc.seriesName;
                delete doc.seriesName;

                let whereObj = {
                    is_deleted: false,
                    _id: { $ne: req.params.id },
                    name: doc.name,

                }
                const data = await this.findSeries(whereObj);
                if (data.length > 0) {
                    return {
                        message: "series Name already exist...",
                        status: false,
                        data: data[0]
                    };
                } else {
                    let whereObj = {
                        is_deleted: false,
                        _id: req.params.id

                    }
                    const data = await this.findSeries(whereObj);
                    if (moment(moment(doc.start_date).format('DD-MM-YYYY'), 'DD-MM-YYYY').isBefore(moment(moment(doc.end_date).format('DD-MM-YYYY'), 'DD-MM-YYYY')) === false) {

                        return {
                            message: "start date should be less then end date...",
                            status: false,
                            data: data[0]
                        };
                    } else if (moment(moment().format('DD-MM-YYYY'), 'DD-MM-YYYY').isBefore(moment(moment(doc.end_date).format('DD-MM-YYYY'), 'DD-MM-YYYY')) === false) {
                        return {
                            message: "end date should be greater then current date...",
                            status: false,
                            data: data[0]
                        };
                    } else {
                        let data = await seriesModel.updateOne({ _id: req.params.id }, { $set: doc });

                        if (data.modifiedCount == 1) {
                            return {
                                status: true,
                                message: 'series update successfully'
                            }
                        }
                    }
                }
            } else {
                return {
                    status: false,
                    message: 'series name required..'
                }
            }

        } catch (error) {
            throw error;
        }
    }



}
module.exports = new seriesServices();