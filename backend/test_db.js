const sql = require('mssql');
const config = require('./config.js');

async function testDatabase() {
    try {
        console.log('Connecting to database...');
        await sql.connect(config.dbConfig);
        
        console.log('Checking if stored procedure exists...');
        const result = await sql.query(`
            SELECT COUNT(*) as count 
            FROM sys.procedures 
            WHERE name = 'MA_ProjectArticles_SyncIntercompanyComponents'
        `);
        
        console.log('Procedure count:', result.recordset[0].count);
        
        if (result.recordset[0].count === 0) {
            console.log('❌ Stored procedure does not exist!');
        } else {
            console.log('✅ Stored procedure exists!');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sql.close();
    }
}

testDatabase();
