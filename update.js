const { PrismaClient } = require("@prisma/client");
const { response } = require("express");
const { connect } = require("./admin");

const prisma = new PrismaClient();

const updateV2 = async () => {
  let array = [
    {
      label: "FAILURE_TO_DOWNLOAD",
      id: 27,
    },
    {
      label: "OFFLINE_ERROR",
      id: 8,
    },
    {
      label: "SOMETHING_WENT_WRONG_ERROR",
      id: 6,
    },
    {
      label: "MAXIMUM_DEVICES_ERROR",
      id: 7,
    },
    {
      label: "DEVICE_RELATED_ISSUES",
      id: 29,
    },
    {
      label: "ENCRYPTED_CONTENT_ERROR",
      id: 10,
    },
    {
      label: "FAILURE_TO_PLAY",
      id: 1,
    },
    {
      label: "CONTENT_RELATED",
      id: 16,
    },
    {
      label: "DATA_DEPLETION",
      id: 13,
    },
    {
      label: "CHANNELS_DONOT_DISPLAY",
      id: 18,
    },
    {
      label: "APP_CRUSHES",
      id: 11,
    },
    {
      label: "BUFFERING",
      id: 14,
    },
  ];

  array.forEach(async ({ id, label }, index) => {
    console.log("Started");
    let updated = await prisma.$queryRaw(
      `UPDATE Response SET subCategoryId=${id} WHERE lastResponse ="${label}"`
    );
    if (index === array.length - 1) {
      console.log("Finished");
    }
  });
};

updateV2();
