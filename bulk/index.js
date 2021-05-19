const express = require("express");
const Data = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

Data.all("/", (req, res) => {
  res.send("Not Allowed");
});

const getBulkFromSource = () => {
  // TODO GET DATA FROM SOURCE
};

Data.post("/save", async (req, res) => {
  const { data, name } = req.body;

  if (!data) {
    res.status(404).send("No data found");
    return;
  }

  if (Array.isArray(data) || !data || !data.length) {
    res.status(403).send("array is required");
    return;
  }

  try {
    let today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayAndDeleted = await prisma.bulk.updateMany({
      data: {
        status: false,
      },
    });

    let insertBulk = await prisma.bulk.create({
      data: {
        data,
        contactName: name,
      },
    });
    res.json(insertBulk);
  } catch (e) {
    console.log(e);
    res.status(500).send("Could not process");
  }
});

Data.all("/fetch", (req, res) => {
  res.send("Fetched from extenal source");
});

module.exports = Data;
