const express = require("express");
const Admin = express.Router();
const config = require("config");
const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

Admin.use((req, res, next) => {
  const { isAdmin } = res.locals.user;
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
  const { email, password } = req.body;
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
    const calls = await prisma.call.count({
      where: {
        createdAt: {
          gte: today,
        },
        respondedTo: true,
      },
    });

    const currentBulk = await prisma.bulk.findFirst({
      where: {
        status: true,
      },
      select: {
        data: true,
      },
    });

    let i = 0;
    while (typeof currentBulk.data !== "object") {
      currentBulk.data = JSON.parse(currentBulk.data);
      i++;
      if (i >= 4) break;
    }

    // CURRENT USER STATISTICS
    let currentData = await prisma.$queryRaw(
      "SELECT u.email as label,COUNT(c.id) as value FROM `Call`	c LEFT JOIN `User` u ON u.id = c.userId WHERE date(CURRENT_DATE()) = date(c.`createdAt`) GROUP BY u.email;"
    );

    let current = {
      data: currentData,
      title: "CURRENT OVERVIEW",
      type: "bar",
      x: "User",
      y: "Calls",
    };

    // YESTERDAY USER STATISTICS
    let yesterdayData = await prisma.$queryRaw(
      "SELECT u.email as label,COUNT(c.id) as value FROM `Call`	c LEFT JOIN `User` u ON u.id = c.userId WHERE date( DATE_SUB(NOW(), INTERVAL 1 DAY) ) = date(c.`createdAt`) GROUP BY u.email;"
    );

    let yesterday = {
      data: yesterdayData,
      title: "YESTERDAY OVERVIEW",
      type: "bar",
      x: "User",
      y: "Calls",
    };

    // FIRST RESPONSE
    let firstResponseData = await prisma.$queryRaw(
      "SELECT `Response`.`firstResponse` as label, COUNT(`Response`.`id`) as value FROM `Response` INNER JOIN `Call` ON `Call`.`responseId` = `Response`.`id` WHERE date(NOW()) = date(`Call`.`createdAt`) GROUP BY `Response`.`firstResponse`;"
    );

    let firstResponse = {
      data: firstResponseData,
      title: "FIRST RESPONSE OVERVIEW",
      type: "donut",
    };

    // LAST RESPONSE
    let lastResponseData = await prisma.$queryRaw(
      "SELECT `Response`.`lastResponse` as label, COUNT(`Response`.`id`) as value FROM `Response` INNER JOIN `Call` ON `Call`.`responseId` = `Response`.`id` WHERE date(NOW()) = date(`Call`.`createdAt`) GROUP BY `Response`.`lastResponse`;"
    );

    let lastResponse = {
      data: lastResponseData,
      title: "LAST RESPONSE OVERVIEW",
      type: "bar",
      x: "Response",
      y: "Count",
    };

    //WEEK ANALYTICS
    let lastWeekData = await prisma.$queryRaw(
      "SELECT COUNT(id) as value, date(`createdAt`) as label FROM `Call` GROUP BY date(`createdAt`) ORDER BY date(`createdAt`) DESC LIMIT 7;"
    );

    let lastWeek = {
      data: lastWeekData,
      title: "WEEK OVERVIEW",
      type: "area",
      x: "Date of Week",
      y: "Calls",
    };

    res.json({
      calls,
      total: currentBulk.data.length,
      current,
      yesterday,
      firstResponse,
      lastResponse,
      lastWeek,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Couldnot process");
  }
});

module.exports = Admin;
