const {DateTime} = require("luxon");
const axios = require("axios");

const url = `https://service.yotvchannels.com:3000/api/`;

class Revenue {
    constructor(from, to) {
        // console.log(DateTime.now(from).toSQL(), DateTime.fromSeconds(to).toSQL())
        console.log(DateTime.fromSeconds(1626998400).toSQL())
        console.log(DateTime.fromMillis(1629719812345).toSQL())
        console.log(DateTime.now().startOf("day").toSeconds(), DateTime.now().endOf("day").toSeconds())
    }

    getList = async (from, to, limit = 1000) => {
        let {data} = axios.get(`${url}?from_time=${from}&to_time=${to}&limit=${limit}`);
        return data;
    }

}

module.exports = Revenue;