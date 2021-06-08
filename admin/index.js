const express = require("express");
const Admin = express.Router();
const config = require("config");
const {PrismaClient} = require("@prisma/client");
const bcryptjs = require("bcryptjs");
const Report = require("../reports");

const prisma = new PrismaClient();

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

Admin.use((req, res, next) => {
    const {isAdmin} = res.locals.user;
    isAdmin
        ? next()
        : res
            .status(403)
            .send(
                "Forbidden                                                                                                                                                                                                            "
            );
});

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

        let users = await prisma.user.findMany({
            select: {
                email: true
            },
            where: {
                isAdmin: false
            }
        });

        // TODAY USER STATISTICS
        let reportTODAY = new Report(Report.ALL, Report.TODAY, Report.TODAY);

        let today = {
            customerCalls: await reportTODAY.userAndCall(),
            deviceAvailability: await reportTODAY.deviceAvailability(),
            customerResponse: await reportTODAY.customerResponse(),
            othersLog: await reportTODAY.othersList()
        };

        // YESTERDAY USER STATISTICS
        let reportYesterday = new Report(Report.ALL, Report.YESTERDAY, Report.YESTERDAY);
        let yesterday = {
            customerCalls: await reportYesterday.userAndCall(),
            deviceAvailability: await reportYesterday.deviceAvailability(),
            customerResponse: await reportYesterday.customerResponse(),
        };

        // LAST WEEK USER STATISTICS
        let reportLastWeek = new Report(Report.ALL, Report.LAST_WEEK, Report.TODAY, Report.STEP_DAILY_WEEK);
        let lastWeek = {
            totals: await reportLastWeek.totalAndRange(),
        };

        // console.log(currentData);
        today.total = today.customerCalls.reduce((prev, curr) => {
            return Number(prev) + Number(curr.value);
        }, 0) || 0;

        res.json({
            "usage": currentBulk.popIndex,
            "total": currentBulk.data.length,
            today,
            yesterday,
            lastWeek,
            users
        });
    } catch (e) {
        console.log(e);
        res.status(500).send("Couldnot process");
    }
});

module.exports = Admin;
