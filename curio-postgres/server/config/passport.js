const passport      = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User          = require('../models/User');

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

const googleConfigured =
  GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_SECRET &&
  GOOGLE_CLIENT_ID !== 'your_google_client_id' &&
  GOOGLE_CLIENT_SECRET !== 'your_google_client_secret';

if (googleConfigured) {
  passport.use(new GoogleStrategy({
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL:  GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ where: { googleId: profile.id } });
      if (!user) {
        user = await User.findOne({ where: { email: profile.emails[0].value } });
        if (user) {
          await user.update({ googleId: profile.id, avatar: profile.photos[0]?.value });
        } else {
          user = await User.create({
            googleId: profile.id,
            name:     profile.displayName,
            email:    profile.emails[0].value,
            avatar:   profile.photos[0]?.value,
          });
        }
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }));
  console.log('✅ Google OAuth strategy registered');
} else {
  console.warn('⚠️  Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
module.exports.googleConfigured = googleConfigured;
