// ============================================================
// RESET PASSWORD SCRIPT for teshi@gmail.com
// Run from SERVER folder: node reset_teshi_password.js
// ============================================================
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Same fix as server.js

const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Raw schema — no hooks, direct DB access
const UserSchema = new mongoose.Schema({ email: String, password: String, role: String, name: String }, { strict: false });
const User = mongoose.model('UserRaw', UserSchema, 'users');

const TARGET_EMAIL = 'teshi@gmail.com';
const NEW_PASSWORD = '1234';

console.log('🔗 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI, {
  family: 4,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
})
  .then(async () => {
    console.log('✅ Connected!\n');

    const user = await User.findOne({ email: TARGET_EMAIL });

    if (!user) {
      console.log(`❌ User "${TARGET_EMAIL}" not found in database.`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} | Role: ${user.role}`);
    console.log(`Current password hash exists: ${!!user.password}`);

    // Hash the new password manually (bypass Mongoose pre-save hooks)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    // Directly update in MongoDB
    const result = await User.updateOne(
      { email: TARGET_EMAIL },
      { $set: { password: hashedPassword } }
    );

    console.log(`\nUpdate result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

    // Verify it works
    const verify = await bcrypt.compare(NEW_PASSWORD, hashedPassword);
    console.log(`bcrypt verify "1234" against new hash: ${verify}`);

    console.log(`\n🎉 SUCCESS! "${TARGET_EMAIL}" can now log in with password: "${NEW_PASSWORD}"`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
