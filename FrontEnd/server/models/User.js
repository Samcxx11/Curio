const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  phone:      { type: String, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String }, // null for Google OAuth users
  category:   { type: String, default: 'General' },
  country:    { type: String, default: 'India' },
  googleId:   { type: String },
  avatar:     { type: String },
  bookmarks:  [{ type: String }], // news IDs
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
