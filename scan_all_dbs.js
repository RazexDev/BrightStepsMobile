const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Connect to the cluster root (without specifying a database)
const baseUri = process.env.MONGO_URI.replace(/\/brightsteps\?/, '/?');

console.log('🔗 Connecting to Atlas cluster to scan ALL databases...\n');

MongoClient.connect(baseUri, { serverSelectionTimeoutMS: 15000 })
  .then(async (client) => {
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    console.log('📂 ALL Databases on this cluster:');
    dbs.databases.forEach(d => {
      console.log(`  - ${d.name} (${(d.sizeOnDisk / 1024).toFixed(1)} KB)`);
    });
    
    console.log('\n🔍 Scanning each database for user accounts...\n');
    
    for (const dbInfo of dbs.databases) {
      if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
      
      const db = client.db(dbInfo.name);
      const cols = await db.listCollections().toArray();
      
      console.log(`\n📦 Database: "${dbInfo.name}" — Collections:`, cols.map(c => c.name).join(', ') || '(none)');
      
      for (const col of cols) {
        if (col.name.toLowerCase().includes('user')) {
          const users = await db.collection(col.name)
            .find({}, { projection: { email: 1, role: 1, name: 1 } })
            .toArray();
          
          console.log(`   👥 "${col.name}" — ${users.length} users:`);
          users.forEach(u => {
            console.log(`      → ${u.email || '?'} | ${u.role || '?'} | ${u.name || '?'}`);
          });
        }
      }
    }
    
    await client.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
