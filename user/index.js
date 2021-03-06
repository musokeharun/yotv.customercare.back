const express = require("express");
const User = express.Router();
const jwt = require("jsonwebtoken");
const bcryptJs = require("bcryptjs");
const config = require("config");

const {PrismaClient} = require("@prisma/client");

const prisma = new PrismaClient();

User.all("/", (req, res) => {
    res.send("Not Allowed");
});

User.post("/login", async (req, res) => {
    const {email, password} = req.body;
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

        let passwordCorrect = bcryptJs.compareSync(password, user["password"]);
        if (!passwordCorrect) {
            res.status(404).send("Password Incorrect");
            return;
        }

        delete user["password"];
        let token = jwt.sign(user, config["secret"], {expiresIn: "1day"});
        res.set("token", token).send(token);
    } catch (e) {
        console.log(e);
        res.status(500).send("Could not process.Contact Admin.");
    }
});

User.post("/call", async (req, res) => {
    try {
        const {isAdmin, email} = res.locals.user;
        // const {v} = req.query;
        // const vendor = v ? await prisma.vendor.findUnique({
        //     where: {
        //         id: parseInt(v)
        //     },
        //     select: {
        //         codes: true,
        //         title: true
        //     }
        // }) : null;

        // console.log(vendor);

        if (isAdmin) {
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
            console.log("NRT", email, notYetRespondedTo)
            res.json(notYetRespondedTo);
            return;
        }

        // TODO GET BULK
        let currentBulk = await prisma.bulk.findFirst({
            where: {
                status: true,
            },
            select: {
                id: true,
                data: true,
                popIndex: true,
                contactName: true,
                usage: true
            },
        });

        if (!currentBulk) {
            res.status(404).send("No Chunk Created Re::Login or Contact Admin");
            return;
        }

        // console.log("Bulk Id", currentBulk.id);
        // console.log("Last Pop Index", currentBulk.popIndex);

        let bulk = currentBulk.data;
        let i = 0;
        while (typeof bulk !== "object") {
            bulk = JSON.parse(bulk);
            i++;
            if (i >= 4) {
                res.status(500).send("Data format error");
                return;
            }
        }

        // GET CONTACT
        let {popIndex: lastIndex, contactName, usage} = currentBulk;
        // let startIndex = lastIndex;

        if (!bulk.length || Number(lastIndex) >= bulk.length || Number(lastIndex) >= bulk.length - 1) {
            res.status(404).send("Chunk out of data.Re::Login or Contact Administrator");
            return;
        }

        let contact;
        let others;
        let otherUsers = null;

        // TODO CHECK IF SUBSCRIBED AND LIES IN VENDOR CODES
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
                // if (vendor) {
                //     if (!vendor['codes'].some(code => contact.startsWith(String(code)))) {
                //         skipped = true;
                //         skippedInt++;
                //         lastIndex++;
                //         continue
                //     }
                // }
                console.log(contact + " never called");
                break;
            } else if (!checkContactIfCalled.respondedTo) {
                console.log("never responded to");
                otherUsers = checkContactIfCalled.otherUsers || "";
                break;
            } else {
                console.log("contact Once Called And Responded");
                lastIndex++;
            }
        }

        console.log("Contact to be used", contact);

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
                bulk: {
                    connect: {
                        id: currentBulk.id
                    }
                },
                contact,
            },
            update: {
                user: {
                    connect: {
                        email,
                    },
                },
                bulk: {
                    connect: {
                        id: currentBulk.id
                    }
                },
                contact,
                otherUsers: otherUsers + email + ",",
            },
            select: {
                id: true,
                contact: true,
            },
        });

        let updatedBulk = await prisma.bulk.update({
            where: {id: currentBulk.id},
            data: {popIndex: lastIndex + 1, usage: usage + 1},
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
        const {
            id,
            contact,
            firstResponse,
            gender,
            subCategoryId,
            other,
            likely,
            resolution,
            suggestion
        } = req.body;

        if (!id || !contact || !firstResponse || firstResponse === "") {
            res.status(404).send("No response data");
            return;
        }

        const {email} = res.locals;

        let call = await prisma.call.findFirst({
            where: {
                id: Number(id),
                user: {
                    email,
                },
                contact
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
                    other,
                    call: {
                        connect: {
                            id: Number(id),
                        },
                    },
                },
            });
        } else {

            //firstResponse
            // gender
            // likely
            // suggestion
            // resolution
            // subCategoryId
            // subCategory
            // call
            // other
            console.log("Received");
            if (!gender || !subCategoryId || !likely) {
                res.status(404).send("No response data");
                return;
            }

            let response = await prisma.response.create({
                data: {
                    firstResponse: firstResponse.toUpperCase(),
                    gender: gender.toUpperCase(),
                    likely: Number(likely),
                    suggestion,
                    resolution,
                    other,
                    call: {
                        connect: {
                            id: Number(id),
                        },
                    },
                    subCategory: {
                        connect: {
                            id: Number(subCategoryId)
                        }
                    }
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

        const availability = ["BUSY", "RECEIVED", "UNAVAILABLE", "UNANSWERED", "HANGUP"];
        const gender = ["FEMALE", "MALE", "NONE"];
        const categories = await prisma.category.findMany({
            select: {
                title: true,
                id: true,
                subCategories: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            where: {
                isActive: true
            }
        });
        const vendors = await prisma.vendor.findMany({
            select: {
                id: true,
                title: true,
                codes: true
            }
        });
        const users = await prisma.user.findMany({
            where: {
                isAdmin: false,
                isActive: true
            },
            select: {
                id: true,
                email: true
            }
        })
        res.json({availability, gender, categories, vendors, users});
    } catch (error) {
        console.log(error);
        res.status(500).send("Could not process");
    }
});

User.post("/forward", async (req, res) => {

    const {call, user} = req.body;
    const {email} = res.locals;

    let userCall = await prisma.call.findUnique({
        where: {
            id: Number(call)
        }, select: {
            id: true
        }
    });

    if (!userCall) {
        res.status(404).send("Call not found");
        return;
    }

    let updatedCall = await prisma.call.update({
        data: {
            user: {
                connect: {
                    id: Number(user)
                }
            }
        },
        select: {
            contact: true
        },
        where: {
            id: Number(call)
        }
    })

    res.send(updatedCall);
    res.end();
})

module.exports = User;