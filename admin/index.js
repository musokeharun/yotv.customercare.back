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

    res.json({
      calls,
      total: currentBulk.data.length,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Couldnot process");
  }
});

module.exports = Admin;
