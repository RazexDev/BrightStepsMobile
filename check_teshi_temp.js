// Run this from: c:\Users\manis\OneDrive\Desktop\brightStepsLearning\brightStepsLearning-dev\server
// Command: node check_teshi.js
const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({ email: String, password: String, role: String, name: String }, { strict: false });
const User = mongoose.model('User', UserSchema);

console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    console.log('✅ Connected!\n');

    const user = await User.findOne({ email: 'teshi@gmail.com' });

    if (!user) {
      console.log('❌ User teshi@gmail.com NOT FOUND in database!');
      console.log('   → The account may have been deleted or never created.');
      process.exit(0);
    }

    console.log('✅ User found!');
    console.log('   Name :', user.name);
    console.log('   Email:', user.email);
    console.log('   Role :', user.role);
    console.log('   Has password hash:', !!user.password);

    if (!user.password) {
      console.log('\n❌ Password field is EMPTY (Google-auth account, cannot log in with password)');
      process.exit(0);
    }

    const match1234 = await bcrypt.compare('1234', user.password);
    console.log('\n   Does "1234" match stored hash?', match1234 ? '✅ YES' : '❌ NO');

    if (!match1234) {
      console.log('\n💡 The password stored in DB does NOT match "1234".');
      console.log('   → The password was likely changed or re-hashed incorrectly.');
      console.log('\nFix: Reset the password with this command in your server folder:');
      console.log('  node -e "require(\'./patchPin.js\')" or run the reset script below.\n');

      // Show hash of "1234" so you can manually patch
      const newHash = await bcrypt.hash('1234', 10);
      console.log('New bcrypt hash for "1234":');
      console.log(newHash);
      console.log('\nTo reset, run this in MongoDB Atlas or via script:');
      console.log(`  db.users.updateOne({email:'teshi@gmail.com'}, {$set:{password:'${newHash}'}})`);
    } else {
      console.log('\n✅ Password is correct. Login should work.');
      console.log('   → The issue is likely a NETWORK problem between mobile app and server.');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  });
