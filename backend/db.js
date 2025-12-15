import mysql from "mysql2/promise";
import "dotenv/config";
import { BACKEND_CONFIG } from "../config.js";

const pool = mysql.createPool({
  host: BACKEND_CONFIG.DATABASE.host,
  user: BACKEND_CONFIG.DATABASE.user,
  password: BACKEND_CONFIG.DATABASE.password,
  database: BACKEND_CONFIG.DATABASE.database,
  port: BACKEND_CONFIG.DATABASE.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: BACKEND_CONFIG.DATABASE.ssl
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