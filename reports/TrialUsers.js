const {DateTime} = require("luxon");
const axios = require("axios");
const {use} = require("express/lib/router");
let url = "https://back-stats.yotvchannels.com/api/query/";

class TrialUsers {

    from;
    to;
    daySql;

    constructor(day, from, to) {
        let dateTime = DateTime.fromMillis(day);
        this.daySql = dateTime.toSQL();
        console.log("Day Sql", this.daySql, "TimeZone", dateTime.zoneName, dateTime.zone);
    }

    getAllForThtDay = async () => {
        try {
            let {data} = await axios.post(url, {
                sql: `SELECT customers_id as ID,customers_login AS Contact,customers_created AS Created
                    FROM customers C
                    WHERE date(customers_created) = date('${this.daySql}') 
                    AND ( customers_login LIKE '077%' OR customers_login LIKE '078%' OR customers_login LIKE '076%')`
            });
            return data;
        } catch (e) {
            console.log(e.message || e);
            return [];
        }
    }

    getSubscription = async (id) => {
        try {
            let {data} = await axios.post(url, {
                sql: `SELECT packages_name AS Package,subscriptions_from AS 'From',subscriptions_to AS 'To' FROM subscriptions
                    LEFT JOIN packages ON subscriptions_packages_id = packages_id 
                    WHERE subscriptions_customers_id=${id} LIMIT 5`
            })
            return data;
        } catch (e) {
            console.log(e.message || e);
            return {}
        }
    }

    getSubscriptionsForDay = async () => {
        let users = [];
        let pointer = 10;
        let thatDay = await this.getAllForThtDay();
        const ONE_SECOND = 1000;

        while (pointer <= thatDay.length) {
            let startTime = Date.now();

            users = users.concat(await Promise.all(thatDay.slice(pointer - 10, pointer).map(async user => {
                console.log("User Before", JSON.stringify(user));
                user.subscription = await this.getSubscription(user['ID']);
                console.log("User After", JSON.stringify(user));
                return user;
            })))

            let endTime = Date.now();
            let requestTime = endTime - startTime;
            let delayTime = ONE_SECOND - requestTime;
            console.log("Meta", requestTime, delayTime);
            if (delayTime > 0) {
                await this.delay(delayTime);
            }
            pointer += 10;
        }
        return users.filter(user => user.subscription.length <= 2);
    }

    delay = (milliseconds) => {
        return new Promise(ok => setTimeout(ok, milliseconds));
    }
}

module.exports = TrialUsers;