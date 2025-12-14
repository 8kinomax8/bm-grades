import mysql from "mysql2/promise";
import "dotenv/config";

const pool = mysql.createPool({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  port: process.env.RDS_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false } // MySQL RDS nécessite TLS implicite
});

export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("✅ Database connected successfully (MySQL 8)");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.code, error.message);
    return false;
  }
}

export default pool;