const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ApiKey = sequelize.define(
    "ApiKey",
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.STRING(64), allowNull: false },

      keyHash: { type: DataTypes.STRING(64), allowNull: false }, // sha256
      name: { type: DataTypes.STRING(80), allowNull: true },

      revokedAt: { type: DataTypes.DATE, allowNull: true },
      lastUsedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: "api_keys",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["key_hash"] },
        { fields: ["user_id", "key_hash"] }
      ]
    }
  );

  return ApiKey;
};
