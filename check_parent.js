const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('UserRaw', UserSchema, 'users');

console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    console.log('Connected!');
    
    // Look for parent hirusha
    const parent = await User.findOne({ email: 'hiru@gmail.com' });
    console.log('\nParent Hirusha:', parent);

    const allParents = await User.find({ role: 'parent' }).limit(5);
    console.log('\nSome parents:', allParents.map(p => ({ email: p.email, childId: p.childId, studentId: p.studentId })));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
