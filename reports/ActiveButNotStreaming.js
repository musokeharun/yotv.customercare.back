const {DateTime} = require("luxon");
const axios = require("axios");
const path = require("path");
const excelToJson = require("convert-excel-to-json");
const fs = require("fs");
let {json2excel} = require('js2excel');

const products = [3, 4, 5, 6, 9];

const getData = async (contact) => {
    try {
        const {data} = await axios.get(`https://details.yotvchannels.com/index.php/customer/index/${contact}`)
        return data;
    } catch (e) {
        return [];
    }
}

const getActiveSub = (billing) => {
    const now = DateTime.now().setZone("Africa/Kampala").toISO();
    console.log("Now", now)
    return billing?.find(b => b['viewers_bouquets_active_to'] > now && products.some(c => c === b['products_id']))
}

const convertToISoTime = (timeString) => {
    return DateTime.fromSeconds(timeString).setZone("Africa/Kampala").toISO();
}

const getJSON = (file) => {
    let uploadPath = path.join(__dirname, "../", "writable", "Subs", file);
    let result = excelToJson({
        source: fs.readFileSync(uploadPath),
        columnToKey: {
            A: "Customer",
        },
        header: {
            rows: 1
        },
        sheets: ["Sheet1"]
    });
    let i = 0;
    while (typeof result !== "object") {
        result = JSON.parse(result);
        i++;
        if (i >= 4) break;
    }
    return result['Sheet1'];
}

class ActiveButNotStreaming {

    async get(contact) {
        let {usage, billing} = await getData(contact);
        let activeSub = getActiveSub(billing);
        const watchingTimes = !usage ? [] : Object.keys(usage).map(e => [e, convertToISoTime(parseInt(e))]);
        if (activeSub) {
            const watched = watchingTimes.some(w => w[1] > activeSub['viewers_bouquets_active_from'])
            if (!watched)
                return {
                    Customer: contact,
                    Package: activeSub['products_name'] || activeSub['bouquets_name'],
                    SubscribedFrom: activeSub['viewers_bouquets_active_from'],
                    SubscribedTo: activeSub['viewers_bouquets_active_to'],
                };
            return null;
        } else return null;
    }

    async filter(data, key = "Customer", modifier = e => e) {
        const result = [];
        for (let value of data) {
            value = value[key];
            console.log(`${new Date().toLocaleString()} Processing ${modifier(value)}`)
            const detail = await this.get(modifier(value));
            console.log(`${new Date().toLocaleString()} Processed ${modifier(value)}`)
            if (detail) {
                // console.log("First Detail", detail);
                result.push(detail);
            }
        }
        return result;
    }

    getFromFile = (file) => {
        return getJSON(file);
    }

    dataToFile = (data, name = "") => {
        try {
            json2excel({
                data,
                name,
                formateDate: 'yyyy/mm/dd',
            });
        } catch (e) {
            console.error('export error');
        }
    }

}

module.exports = ActiveButNotStreaming;