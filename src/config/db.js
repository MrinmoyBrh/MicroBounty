const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        const conn = await mongioise.connect(process.env.MONGO_URI);
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(`[Database Error] ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;