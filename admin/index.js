const express = require("express");
const Admin = express.Router();
const config = require("config");
const {PrismaClient} = require("@prisma/client");
const bcryptjs = require("bcryptjs");
const Report = require("../reports");
const TrialUsers = require("../reports/TrialUsers");
const ActiveButNotStreaming = require("../reports/ActiveButNotStreaming");

const prisma = new PrismaClient();

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

// Admin.use((req, res, next) => {
//     // const {isAdmin} = res.locals.user;
//     // isAdmin
//     //     ? next()
//     //     : res
//     //         .status(403)
//     //         .send(
//     //             "Forbidden                                                                                                                                                                                                            "
//     //         );
// });

Admin.all("/", (req, res) => {
    res.status(403).send("Not allowed");
});

Admin.all("/users", async (req, res) => {
    try {
        let users = await prisma.user.findMany({
            where: {
                isAdmin: false,
            },
            select: {
                email: true,
                createdAt: true,
            },
        });
        res.json(users);
    } catch (e) {
        console.log(e);
        res.status(500).send("Could not process");
    }
});

Admin.post("/register", async (req, res) => {
    const {email, password} = req.body;
    if (!email || !password) {
        res.status(404).send("No such user found");
        return;
    }

    const salt = bcryptjs.genSaltSync(config.salt);
    const hash = bcryptjs.hashSync(password, salt);

    try {
        let user = await prisma.user.create({
            data: {
                email,
                password: hash,
            },

            select: {
                email: true,
                isAdmin: true,
            },
        });

        res.status(201).json(user);
    } catch (e) {
        console.log(e);
        res.status(500).send("Could not register");
    }
});

Admin.post("/dashboard", async (req, res) => {
    try {
        const currentBulk = await prisma.bulk.findFirst({
            where: {
                status: true,
            },
            select: {
                data: true,
                popIndex: true,
            },
        });

        let i = 0;
        while (typeof currentBulk.data !== "object") {
            currentBulk.data = JSON.parse(currentBulk.data);
            i++;
            if (i >= 4) break;
        }

        // TODAY USER STATISTICS
        let reportTODAY = new Report(Report.ALL, Report.TODAY, Report.TODAY);

        let today = {
            totalCalls: await reportTODAY.userAndTotalCalls(),
            customerCalls: await reportTODAY.userAndCall(),
            deviceAvailability: await reportTODAY.deviceAvailability(),
            customerResponse: await reportTODAY.customerResponse(),
            othersLog: await reportTODAY.othersList(),
            gender: await reportTODAY.genderGraph(),
            likely: await reportTODAY.likelyGraph(),
            suggestions: await reportTODAY.suggestionList(),
            resolution: await reportTODAY.resolutionList(),
        };

        // YESTERDAY USER STATISTICS
        let reportYesterday = new Report(
            Report.ALL,
            Report.YESTERDAY,
            Report.YESTERDAY
        );
        let yesterday = {
            totalCalls: await reportYesterday.userAndTotalCalls(),
            customerCalls: await reportYesterday.userAndCall(),
            deviceAvailability: await reportYesterday.deviceAvailability(),
        };

        // LAST WEEK USER STATISTICS
        let reportLastWeek = new Report(
            Report.ALL,
            Report.LAST_WEEK,
            Report.TODAY,
            Report.STEP_DAILY_WEEK
        );
        let lastWeek = {
            totals: await reportLastWeek.totalAndRange(),
        };

        // console.log(currentData);
        today.total =
            today.customerCalls.reduce((prev, curr) => {
                return Number(prev) + Number(curr.value);
            }, 0) || 0;

        res.json({
            usage: currentBulk.popIndex,
            total: currentBulk.data.length,
            today,
            yesterday,
            lastWeek,
        });
    } catch (e) {
        console.log(e);
        res.status(500).send("Couldn't process");
    }
});

Admin.all("/freetrial/list", (async (req, res) => {

    const list = await prisma.freeTrial.findMany({
        take: 30
    });

    res.json(list).end();
}))

Admin.all("/freetrial/generate", (async (req, res) => {
    const day = req.query["day"];
    const trial = new TrialUsers(parseInt(day))
    const data = await trial.getSubscriptionsForDay();
    // const user = await trial.getSubscription(data[0]['ID'])
    res.json(data).end();
}))

Admin.all("/report/active-not-streaming", (async (req, res) => {
    res.json("Started...||").end();
    const activeButNotStreaming = new ActiveButNotStreaming();
    const data = await activeButNotStreaming.filter(activeButNotStreaming.getFromFile("Nov.csv"), "Customer", e => `0${e}`);
    activeButNotStreaming.dataToFile(data, `Nov${new Date().getMilliseconds()}`)
    res.json(data).end();
}))


module.exports = Admin;