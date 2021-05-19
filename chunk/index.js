const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

let today = new Date();
today.setUTCHours(0, 0, 0, 0);

const Chunk = {
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
