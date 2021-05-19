const express = require("express");
const Admin = express.Router();
const config = require("config");
const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

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

Admin.all("/list", (req, res) => {
  res.status(403).send("Not allowed");
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

module.exports = Admin;
