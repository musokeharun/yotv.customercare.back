const {PrismaClient} = require("@prisma/client");
const {DateTime} = require("luxon");
const prisma = new PrismaClient({
    log: ["query"]
});

class Report {
    user;
    from;
    to;
    step;

    static DAY = "D";
    static MONTH = "M";
    static WEEK = "W";
    static ALL = "*";

    static TODAY = "TODAY";
    static YESTERDAY = "YESTERDAY";
    static LAST_WEEK = "LASTWEEK";
    static LAST_MONTH = "LASTMONTH";
    static LAST_YEAR = "LAST YEAR";
    static STEP_HOURLY = "HOURLY";
    static STEP_DAILY_WEEK = "dailyW";
    static STEP_DAILY_MONTH = "dailyM";
    static STEP_WEEKLY_MONTHLY = "weekly";
    static STEP_WEEKLY_YEARLY = "weekly";
    static STEP_MONTHLY = "monthly";

    constructor(user, from, to, step) {
        const {
            DAY,
            ALL,
            TODAY,
            LAST_MONTH,
            LAST_WEEK,
            LAST_YEAR,
            WEEK,
            MONTH,
            YESTERDAY,
        } = Report;

        if (user !== ALL) this.user = user;
        else this.user = null;
        switch (from) {
            case TODAY:
                this.from = DateTime.now()
                    .startOf("day")
                    .toSQL({includeOffset: false});
                break;

            case YESTERDAY:
                this.from = DateTime.now()
                    .minus({days: 1})
                    .startOf("day")
                    .toSQL({includeOffset: false});
                break;

            case LAST_WEEK:
                this.from = DateTime.now()
                    .minus({weeks: 1})
                    .startOf("day")
                    .toSQL({includeOffset: false});
                break;

            default:
                this.from = DateTime.fromSQL(from)
                    .startOf("day")
                    .toSQL({includeOffset: false});
        }
        console.log(this.from);

        switch (to) {
            case TODAY:
                this.to = DateTime.now().endOf("day").toSQL({includeOffset: false});
                break;

            case YESTERDAY:
                this.to = DateTime.now()
                    .minus({days: 1})
                    .endOf("day")
                    .toSQL({includeOffset: false});
                break;

            case LAST_WEEK:
                this.from = DateTime.now()
                    .minus({weeks: 1})
                    .endOf("day")
                    .toSQL({includeOffset: false});
                break;

            default:
                this.to = DateTime.fromSQL(to)
                    .endOf("day")
                    .toSQL({includeOffset: false});
        }
        console.log(this.to);

        if (step) {
            switch (step) {
                case Report.STEP_HOURLY:
                    this.step = value => ` HOUR(${value})`;
                    break;

                case Report.STEP_DAILY_WEEK:
                    this.step = value => ` DAYNAME(${value})`;
                    break;

                case Report.STEP_DAILY_MONTH:
                    this.step = value => ` DAYOFMONTH(${value})`;
                    break;
                default:
                    this.step = null;
            }
        }
    }

    usersMap = async (values) => {
        let users = await prisma.user.findMany({
            select: {
                email: true
            },
            where: {
                isAdmin: false,
                isActive: true
            },
            orderBy: {
                email: "asc"
            }
        })
        if (!Array.isArray(values)) return values;
        return users.map(user => {
            let found = values.find(value => value.label === user.email);
            if (!found) return {label: user.email, value: 0};
            return found;
        });

    };

    userAndCall = async () => {
        const {from, to} = this;
        let values = await prisma.$queryRaw(
            `SELECT u.email as label,COUNT(c.id) as value FROM ${"`Call`"} c LEFT JOIN User u ON u.id = c.userId INNER JOIN Response r ON c.responseId = r.id  WHERE  r.firstResponse = "RECEIVED" AND date(c.createdAt) BETWEEN date("${from}") AND date("${to}") GROUP BY u.email ORDER BY u.email ASC;`
        );
        return await this.usersMap(values);
    };

    userAndResponse = () => {
    };

    totalAndRange = async () => {
        const {from, to, step} = this;

        return prisma.$queryRaw(
            `SELECT COUNT(id) as value,createdAt as label ${step ? "," + step("createdAt") + " AS other" : ""} FROM ${"`Call`"} WHERE date(createdAt) BETWEEN date("${from}") AND date("${to}") GROUP BY date(createdAt),${step ? step("createdAt") : `date(createdAt)`};`
        );
    };

    deviceAvailability = () => {
        const {from, to} = this;
        return prisma.$queryRaw(
            `SELECT r.firstResponse as label, COUNT(r.id) as value FROM Response r INNER JOIN ${"`Call`"} c ON c.responseId = r.id WHERE date(createdAt) BETWEEN date("${from}") AND date("${to}") GROUP BY r.firstResponse;`
        );
    };

    customerResponse = () => {
        const {from, to} = this;

        return prisma.$queryRaw(
            `SELECT r.lastResponse as label, COUNT(r.id) as value FROM Response r INNER JOIN ${"`Call`"} c ON c.responseId = r.id WHERE r.lastResponse != "NO_RESPONSE" AND date(updatedAt) BETWEEN date("${from}") AND date("${to}") GROUP BY r.lastResponse;`
        );
    };

    othersList = (page = 1) => {
        const {from} = this;
        let pageSize = 50;
        return prisma.call.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            where: {
                createdAt: {
                    gte: DateTime.fromSQL(from).toJSDate()
                },
                reponse: {
                    NOT: {
                        other: {
                            in: [""]
                        }
                    }
                }
            },
            select: {
                reponse: {
                    select: {
                        other: true
                    },
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })
    }

}

module.exports = Report;
