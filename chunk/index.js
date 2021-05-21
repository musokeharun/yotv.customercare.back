const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

let today = new Date();
today.setUTCHours(0, 0, 0, 0);

const Chunk = {
  // DEPRECATED
  hasChunk: async (email) => {
    let chunk = await prisma.chunk.findFirst({
      where: {
        user: { email },
        createdAt: {
          gte: today,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });
    if (!chunk || chunk == null) return false;
    return chunk["id"];
  },

  getAvailableChunkId: async (email) => {
    let registeredChunk = await prisma.chunk.findFirst({
      where: {
        user: { email },
        status: true,
      },
      select: {
        id: true,
        bulk: {
          select: {
            id: true,
            data: true,
          },
        },
      },
    });

    console.log(registeredChunk);

    if (registeredChunk) {
      return registeredChunk.id;
    }

    let bulkId = await Chunk.getAvailabeBulkId();

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

  getAvailabeBulkId: async () => {
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
      const { popIndex, data } = currentBulk;
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
    } else throw new Error("No Current Bulk");
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
          connect: { email },
        },
        bulk: {
          connect: { id: bulk["id"] },
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
