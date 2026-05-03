const { DataTypes } = require('sequelize');
const bcrypt        = require('bcryptjs');
const sequelize     = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type:          DataTypes.UUID,
    defaultValue:  DataTypes.UUIDV4,
    primaryKey:    true,
  },
  name: {
    type:      DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type:      DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type:      DataTypes.STRING,
    allowNull: false,
    unique:    true,
    set(val) { this.setDataValue('email', val?.toLowerCase()); },
  },
  password: {
    type:      DataTypes.STRING,
    allowNull: true,   // null for Google OAuth users
  },
  category: {
    type:         DataTypes.STRING,
    defaultValue: 'General',
  },
  country: {
    type:         DataTypes.STRING,
    defaultValue: 'India',
  },
  googleId: {
    type:      DataTypes.STRING,
    allowNull: true,
  },
  avatar: {
    type:      DataTypes.STRING,
    allowNull: true,
  },
  bookmarks: {
    type:         DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
}, {
  timestamps:  true,   // createdAt, updatedAt
  tableName:   'users',
});

// Hash password before create/update
User.beforeSave(async (user) => {
  if (user.changed('password') && user.password) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

// Instance method — same API as the Mongoose version
User.prototype.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = User;
