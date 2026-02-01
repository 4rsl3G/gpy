const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.STRING(64), primaryKey: true },

      // token terenkripsi (JSON string {kid,iv,tag,data})
      gobizAccessTokenEnc: { type: DataTypes.TEXT("long"), allowNull: true },
      gobizRefreshTokenEnc: { type: DataTypes.TEXT("long"), allowNull: true },

      gobizTokenExpiry: { type: DataTypes.BIGINT, allowNull: true },

      // cache merchant_id (non-sensitive)
      merchantId: { type: DataTypes.STRING(64), allowNull: true },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true,
    }
  );

  return User;
};
