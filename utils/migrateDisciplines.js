const Sport = require("../models/Sport");
const UserSport = require("../models/userSport");
const History = require("../models/RatingHistory");
const Match = require("../models/Match");
const { catalog } = require("./sports");
module.exports = async () => {
  const sports = await Sport.find({ name: { $in: catalog.individual } }).lean();
  for (const sport of sports) {
    const discipline = catalog.disciplines[sport.name][0].id;
    await UserSport.updateMany(
      { sportId: sport._id, discipline: { $exists: false } },
      { $set: { discipline } },
    );
    await History.updateMany(
      { sportId: sport._id, discipline: { $exists: false } },
      { $set: { discipline } },
    );
    await Match.updateMany(
      { sport: sport._id, discipline: { $exists: false } },
      { $set: { discipline, sideSize: 1 } },
    );
  }
  await UserSport.collection.createIndex(
    { userId: 1, sportId: 1, discipline: 1 },
    { unique: true },
  );
  const indexes = await UserSport.collection.indexes();
  for (const index of indexes)
    if (
      index.unique &&
      JSON.stringify(index.key) === JSON.stringify({ userId: 1, sportId: 1 })
    )
      await UserSport.collection.dropIndex(index.name);
};
