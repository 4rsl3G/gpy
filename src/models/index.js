const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: String(process.env.DB_LOGGING || "false") === "true" ? console.log : false,
    timezone: "+07:00",
    dialectOptions: {
      // lebih aman untuk timestamp
      dateStrings: true
    }
  }
);

const User = require("./User")(sequelize);
const ApiKey = require("./ApiKey")(sequelize);

User.hasMany(ApiKey, { foreignKey: "userId" });
ApiKey.belongsTo(User, { foreignKey: "userId" });

async function initDb() {
  await sequelize.authenticate();
  // Production idealnya pakai migrations. Untuk siap jalan cepat: sync alter.
  await sequelize.sync({ alter: true });
}

module.exports = { sequelize, initDb, User, ApiKey };
