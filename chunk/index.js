const {PrismaClient} = require("@prisma/client");
const prisma = new PrismaClient();

let today = new Date();
today.setUTCHours(0, 0, 0, 0);

const Chunk = {
    // DEPRECATED
    hasChunk: async (email) => {
        let chunk = await prisma.chunk.findFirst({
            where: {
                user: {email},
                createdAt: {
                    gte: today,
                },
            },
            select: {
                id: true,
                createdAt: true,
            },
        });
        if (!chunk) return false;
        return chunk["id"];
    },

    getAvailableChunkId: async (email) => {

        let registeredChunk = await prisma.chunk.findFirst({
            where: {
                user: {email},
                status: true,
            },
            select: {
                id: true,
                bulk: {
                    select: {
                        id: true,
                        data: true,
                        popIndex: true
                    },
                },
            },
        });
        let bulkId = null;

        if (registeredChunk) {

            let i = 0;
            while (typeof registeredChunk.bulk.data !== "object") {
                registeredChunk.bulk.data = JSON.parse(registeredChunk.bulk.data);
                if (i >= 4)
                    break;
            }

            let bulk = registeredChunk.bulk.data;
            let lastIndex = registeredChunk.bulk.popIndex;

            if (!bulk.length || Number(lastIndex) >= bulk.length || Number(lastIndex) >= bulk.length - 1) {

                let deActivatedBulk = await prisma.bulk.update({
                    data: {
                        status: false
                    },
                    where: {
                        id: registeredChunk.bulk.id
                    }
                })

                // ALTER TO NEW BULK IN LOOP
                let newBulk = null;
                let i = 0;
                while (true) {
                    let newInternalBulk = await prisma.bulk.findFirst({
                        where: {
                            id: {
                                gt: bulk.id
                            },
                            popIndex: {
                                equals: 0
                            }
                        },
                        select: {
                            id: true
                        }
                    })
                    i++;
                    if (newInternalBulk) {
                        newBulk = newInternalBulk
                        break;
                    }
                    if (i > 5) {
                        break;
                    }
                }

                if (!newBulk) {
                    throw new Error("Could not find Bulk to replace");
                }

                // CONNECT ANOTHER BULK
                let connectedChunk = await prisma.


                bulkId = newBulk.id;
            }

            return registeredChunk.id;
        }


        let createdChunk = await prisma.chunk.create({
            data: {
                user: {
                    connect: {
                        email,
                    },
                },
                bulk: {
                    connect: {
                        id: bulkId,
                    },
                },
            },
        });

        return createdChunk.id;
    },

    getAvailableBulkId: async () => {

        let currentBulk = await prisma.bulk.findFirst({
            where: {
                status: true,
            },
            select: {
                id: true,
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

        if (currentBulk) {
            const {popIndex, data} = currentBulk;
            console.log("Bulk", currentBulk.id);

            if (popIndex >= data.length - 1 || popIndex >= data.length) {
                let updatedOldBulk = await prisma.bulk.update({
                    where: {
                        id: currentBulk.id,
                    },
                    data: {
                        status: false,
                    },
                });

                let newBulk = await prisma.bulk.findFirst({
                    where: {
                        status: false,
                        id: {
                            gte: currentBulk.id,
                        },
                    },
                    select: {
                        id: true,
                        popIndex: true,
                    },
                });

                if (newBulk && popIndex == 0) {
                    let newBulk = await prisma.bulk.update({
                        where: {
                            id: newBulk.id,
                        },
                        data: {
                            status: true,
                        },
                    });
                    return newBulk.id;
                } else {
                    throw new Error("No New Bulk Found");
                }
            } else return currentBulk.id;
        } else {

            throw new Error("No Current Bulk");
        }
    },

    // DEPRECATED
    createChunk: async (email) => {
        let hasChunk = await Chunk.hasChunk(email);
        if (hasChunk) {
            throw new Error("Chunk already exists");
        }

        let bulk = await prisma.bulk.findFirst({
            where: {
                status: true,
            },
            select: {
                id: true,
                createdAt: true,
                data: true,
                popIndex: true,
                contactName: true,
            },
        });
        if (!bulk) throw new Error("No Bulk found");

        console.log("Active Bulk", bulk["id"]);
        // CREATE CHUNK
        let chunk = await prisma.chunk.create({
            data: {
                user: {
                    connect: {email},
                },
                bulk: {
                    connect: {id: bulk["id"]},
                },
            },
            select: {
                id: true,
            },
        });
        return chunk["id"];
    },
};

module.exports = Chunk;
