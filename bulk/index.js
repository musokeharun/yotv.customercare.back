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

const insertBulk = async (data, tag, name = "msisdn") => {
  try {
    let today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let insertBulk = await prisma.bulk.create({
      data: {
        data,
        contactName: name,
        status: false,
        tag,
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

  const { tag } = req.body;

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
        B: "last_subscribed",
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
          await insertBulk(temparray, tag + " #" + i);
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

Data.post("/list/:page?", async (req, res) => {
  let page = req.params.page || 1;
  let take = 20;
  let skip = (page - 1) * take;

  try {
    let bulks = await prisma.bulk.findMany({
      select: {
        id: true,
        status: true,
        popIndex: true,
        tag: true,
        createdAt: true,
        data: true,
      },
      orderBy: [
        {
          status: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take,
      skip,
    });

    let newBulks = bulks.map((bulk) => {
      bulk.data = bulk.data.length;
      return bulk;
    });

    res.json(newBulks);
  } catch (e) {
    console.log(e);
    res.status(500).send("Could not process");
  }
});

Data.post("/set/:id", async (req, res) => {
  let id = req.params.id || 0;

  if (!id) {
    res.status(404).send("No datasource to alter");
    return;
  }

  try {
    let deaActivateBulk = await prisma.bulk.updateMany({
      where: {
        status: true,
      },
      data: {
        status: false,
      },
    });

    let updateBulk = await prisma.bulk.update({
      where: {
        id: Number(id),
      },
      data: {
        status: true,
      },
    });

    res.send("Processed successfully");
  } catch (e) {
    console.log(e);
    res.status(500).send("Could not process");
  }
});

module.exports = Data;
