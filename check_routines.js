const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

const Schema = new mongoose.Schema({}, { strict: false });
const Routine = mongoose.model('Routine', Schema, 'routines');

console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    const routines = await Routine.find({}).limit(5);
    console.log('\nRoutines:', routines);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
