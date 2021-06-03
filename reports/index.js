const {PrismaClient} = require("@prisma/client");
const {DateTime} = require('luxon');
const prisma = new PrismaClient();


class Report {

    user;
    from;
    to;

    static  DAY = "D";
    static MONTH = "M";
    static WEEK = "W";
    static ALL = "*";

    static TODAY = "TODAY";
    static YESTERDAY = "YESTERDAY";
    static LAST_WEEK = "LASTWEEK";
    static LAST_MONTH = "LASTMONTH";
    static LAST_YEAR = "LAST YEAR"


    constructor(user, from, to) {
        const {DAY, ALL, TODAY, LAST_MONTH, LAST_WEEK, LAST_YEAR, WEEK, MONTH, YESTERDAY} = Report;

        if (user !== ALL)
            this.user = user;
        else this.user = null;
        switch (from) {
            case TODAY:
                this.from = DateTime.now().startOf("day").toSQL({includeOffset: false});
                break

            case YESTERDAY:
                this.from = DateTime.now().minus({days: 1}).startOf("day").toSQL({includeOffset: false});
                break

            case LAST_WEEK:
                this.from = DateTime.now().minus({weeks: 1}).startOf("day").toSQL({includeOffset: false});
                break

            default :
                this.from = DateTime.fromSQL(from).startOf("day").toSQL({includeOffset: false});
        }
        console.log(this.from);

        switch (to) {
            case TODAY:
                this.to = DateTime.now().endOf("day").toSQL({includeOffset: false});
                break

            case YESTERDAY:
                this.to = DateTime.now().minus({days: 1}).endOf("day").toSQL({includeOffset: false});
                break

            default :
                this.to = DateTime.fromSQL(to).endOf("day").toSQL({includeOffset: false});
        }
        console.log(this.to);
    }

    userAndCall = () => {
        const {user, from, to} = this;
        return prisma.$queryRaw(
            `SELECT u.email as label,COUNT(c.id) as value FROM ${"`Call`"} c LEFT JOIN User u ON u.id = c.userId WHERE date(c.createdAt) BETWEEN date("${from}") AND date("${to}") GROUP BY u.email ORDER BY u.email ASC;`
        );
    }

    userAndResponse = () => {

    }

    totalAndRange = async () => {

        const {from, to} = this;

        return prisma.$queryRaw(
            `SELECT COUNT(id) as value, date(createdAt) as label FROM ${"`Call`"} WHERE date(createdAt) BETWEEN date("${from}") AND date("${to}") GROUP BY date(createdAt) ORDER BY date(createdAt) DESC LIMIT 7;`
        );
    }

}


module.exports = Report
