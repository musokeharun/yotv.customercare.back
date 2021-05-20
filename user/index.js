const express = require("express");
const User = express.Router();
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const config = require("config");
const Chunk = require("../chunk");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

User.all("/", (req, res) => {
  res.send("Not Allowed");
});

User.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(404).send("No such user found");
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        email: true,
        password: true,
        isAdmin: true,
      },
    });

    if (!user) {
      res.status(404).send("No such user found");
      return;
    }

    let passwordCorrect = bcryptjs.compareSync(password, user["password"]);
    if (!passwordCorrect) {
      res.status(404).send("Password Incorrect");
      return;
    }

    delete user["password"];

    let chunk = await Chunk.hasChunk(email);
    console.log("Chunk Already There-Id", chunk);
    if (!chunk) {
      if (!user.isAdmin) {
        chunk = await Chunk.createChunk(email);
        console.log("Chunk created-Id", chunk);
      }
    }

    if (!user.isAdmin) {
      user["chunk"] = chunk;
    }

    let token = jwt.sign(user, config["secret"], { expiresIn: "1day" });
    res.set("token", token).send(token);
  } catch (e) {
    console.log(e);
    res.status(500).send("Could not process.Contact Admin.");
  }
});

User.post("/call", async (req, res) => {
  try {
    const { chunk: chunkId, email } = res.locals.user;

    if (!chunkId) {
      return res.status(404).send("Not Allowed to Call");
    }

    //NOT YET RESPONDED TO
    let notYetRespondedTo = await prisma.call.findFirst({
      where: {
        respondedTo: false,
        user: {
          email,
        },
      },
      select: {
        id: true,
        contact: true,
      },
    });

    if (notYetRespondedTo) {
      res.json(notYetRespondedTo);
      return;
    }

    // TODO GET NUMBER FROM BULK
    let chunk = await prisma.chunk.findUnique({
      where: {
        id: chunkId,
      },
      select: {
        id: true,
        popCount: true,
        bulk: {
          select: {
            id: true,
            data: true,
            popIndex: true,
            contactName: true,
          },
        },
      },
    });

    if (!chunk) {
      res.status(404).send("No Chunk Created Re::Login");
      return;
    }

    console.log("Chunk Id", chunk.id);
    console.log("Bulk Id", chunk.bulk.id);
    console.log("Last Pop Index", chunk.bulk.popIndex);
    // res.json(JSON.parse(JSON.parse(chunk.bulk.data)));

    let bulk = chunk.bulk.data;
    let i = 0;
    while (typeof bulk === "string") {
      bulk = JSON.parse(bulk);
      i++;
      if (i >= 4) {
        res.status(500).send("Data format error");
        return;
      }
    }

    // GET CONTACT
    let { popIndex: lastIndex, contactName } = chunk.bulk;

    if (!bulk.length || Number(lastIndex) >= bulk.length) {
      res.status(404).send("Chunk out of data.Re::Login");
    }

    let contact;
    let others;
    let otherUsers = null;

    // TODO CHECK IF SUBSCRIBED IN WHILE LOOP

    while (true) {
      others = bulk[lastIndex];
      contact = String(others[contactName]);

      let checkContactIfCalled = await prisma.call.findUnique({
        where: {
          contact: String(contact),
        },
        select: {
          id: true,
          contact: true,
          respondedTo: true,
          otherUsers: true,
        },
      });
      if (!checkContactIfCalled) {
        console.log("Never called");
        break;
      } else if (!checkContactIfCalled.respondedTo) {
        console.log("Never responded to");
        otherUsers = checkContactIfCalled.otherUsers || "";
        break;
      } else {
        console.log("Contact Once Called And Responded");
        lastIndex++;
      }
    }

    console.log("Contact to be used", contact);

    let updatedChunk = await prisma.chunk.update({
      where: { id: chunk.id },
      data: { popCount: chunk.popCount + 1 },
    });

    let updatedBulk = await prisma.bulk.update({
      where: { id: chunk.bulk.id },
      data: { popIndex: lastIndex + 1 },
    });

    const call = await prisma.call.upsert({
      where: {
        contact: String(contact),
      },
      create: {
        user: {
          connect: {
            email,
          },
        },
        contact,
      },
      update: {
        user: {
          connect: {
            email,
          },
        },
        contact,
        otherUsers: otherUsers + email + ",",
      },
      select: {
        id: true,
        contact: true,
      },
    });

    if (otherUsers) {
      call.otherUsers = otherUsers;
    }
    if (others) {
      call.others = others;
    }

    res.status(201).json(call);
  } catch (e) {
    console.log(e);
    res.status(500).send("Could not process");
  }
});

User.post("/response", async (req, res) => {
  try {
    const { id, firstResponse, gender, lastResponse, other, likely } = req.body;

    if (!id || !firstResponse || firstResponse == "") {
      res.status(404).send("No response data");
      return;
    }

    const { email } = res.locals;

    let call = await prisma.call.findFirst({
      where: {
        id: Number(id),
        user: {
          email,
        },
      },
      select: {
        id: true,
        contact: true,
      },
    });

    if (!call) {
      res.status(404).send("No such call for you");
      return;
    }

    // IF NOT RECEIVED ::
    if (firstResponse.toUpperCase() !== "RECEIVED") {
      let response = await prisma.response.create({
        data: {
          firstResponse: firstResponse.toUpperCase(),
          gender: "NONE",
          lastResponse: "NO_RESPONSE",
          call: {
            connect: {
              id: Number(id),
            },
          },
        },
      });
    } else {
      if (!gender || !lastResponse || lastResponse == "") {
        res.status(404).send("No response data");
        return;
      }

      let response = await prisma.response.create({
        data: {
          firstResponse: firstResponse.toUpperCase(),
          gender: gender.toUpperCase(),
          lastResponse: lastResponse.toUpperCase(),
          likely: Number(likely),
          other,
          call: {
            connect: {
              id: Number(id),
            },
          },
        },
      });
    }

    let updatedCall = await prisma.call.update({
      where: {
        id: call.id,
      },
      data: {
        respondedTo: true,
      },
    });

    res.send("Call Ended");
  } catch (e) {
    console.log(e);
    res.status(500).send("Could end call");
  }
});

User.post("/options", async (req, res) => {
  try {
    const result = await prisma.$queryRaw("DESC Response;");
    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Could not process");
  }
});

module.exports = User;
