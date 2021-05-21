const express = require("express");
const Data = express.Router();
const { PrismaClient } = require("@prisma/client");
const fileUpload = require("express-fileupload");
const excelToJson = require("convert-excel-to-json");
const fs = require("fs");

const prisma = new PrismaClient();

Data.all("/", (req, res) => {
  res.send("Not Allowed");
});

const insertBulk = async (data, name = "msisdn") => {
  try {
    let today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let insertBulk = await prisma.bulk.create({
      data: {
        data,
        contactName: name,
        status: false,
      },
    });

    return today.getTime();
  } catch (e) {
    throw e;
  }
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
    let r = insertBulk(data, name);
    res.send(r);
  } catch (e) {
    console.log(e);
    res.status(500).send("Could not process");
  }
});

Data.all("/fetch", (req, res) => {
  res.send("Fetched from extenal source");
});

Data.use(fileUpload());

Data.post("/upload", (req, res) => {
  let dataFile;
  let uploadPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  // let  = new Date().getTime();

  // The name of the input field (i.e. "dataFile") is used to retrieve the uploaded file
  dataFile = req.files.dataFile;
  uploadPath = __dirname + "/uploads/" + dataFile.name;

  console.log(dataFile.mimetype);

  // Use the mv() method to place the file somewhere on your server
  dataFile.mv(uploadPath, function (err) {
    if (err) return res.status(500).send(err);

    let result = excelToJson({
      source: fs.readFileSync(uploadPath),
      columnToKey: {
        A: "msisdn",
        B: "last_subscibed",
        C: "amount",
      },
    });

    let i = 0;
    while (typeof result !== "object") {
      result = JSON.parse(result);
      i++;
      if (i >= 4) break;
    }

    let data = [];
    Object.getOwnPropertyNames(result).forEach((sheet) => {
      let currentValue = result[sheet];
      if (typeof currentValue[0].msisdn == "string") {
        data = [...data, ...currentValue.slice(1)];
      } else {
        data = [...data, ...currentValue];
      }
    });

    console.log(data.length);

    const ProcessData = async () => {
      try {
        let i,
          j,
          temparray,
          chunk = 1000;
        for (i = 0, j = data.length; i < j; i += chunk) {
          temparray = data.slice(i, i + chunk);
          await insertBulk(temparray);
          console.log(temparray.length);
        }
        res.send("Added Chunks");
        return;
      } catch (error) {
        console.log(error);
        res.status(500).send("Could not process");
        return;
      }
    };

    ProcessData().then((r) => console.log(r));
  });
});

module.exports = Data;
