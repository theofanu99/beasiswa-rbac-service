const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  connectionLimit: 10,
  connectTimeout: 10000,

  allowPublicKeyRetrieval: true
});

const prisma = new PrismaClient({
  adapter
});

module.exports = prisma;