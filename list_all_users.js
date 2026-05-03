const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔗 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI, {
  family: 4,
  serverSelectionTimeoutMS: 15000,
})
  .then(async () => {
    console.log('✅ Connected!\n');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections in this database:');
    collections.forEach(c => console.log('  -', c.name));
    
    // Count users in each possible user collection
    for (const col of collections) {
      if (col.name.toLowerCase().includes('user')) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`\n👥 "${col.name}" has ${count} documents`);
        
        // List all user emails
        const users = await db.collection(col.name).find({}, { projection: { email: 1, role: 1, name: 1 } }).toArray();
        users.forEach(u => {
          console.log(`   → ${u.email || '(no email)'} | role: ${u.role || '?'} | name: ${u.name || '?'}`);
        });
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
