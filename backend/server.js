const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const xss = require("xss-clean");
const dotenv = require("dotenv");
const compression = require("compression");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");
const groupRoutes = require("./routes/groupRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const settlementRoutes = require("./routes/settlementRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Middleware
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const rateLimiter = require("./middleware/rateLimiter");

dotenv.config();

const app = express();

app.set("trust proxy", 1);

/*
========================================
CORS
========================================
*/
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
app.options("*", cors());

/*
========================================
SECURITY
========================================
*/
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/*
========================================
BODY PARSER
========================================
*/
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/*
========================================
MIDDLEWARE
========================================
*/
app.use(xss());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(rateLimiter);

/*
========================================
HEALTH CHECK
========================================
*/
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SettleUp API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend working properly",
  });
});

/*
========================================
API ROUTES
========================================
*/
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/dashboard", dashboardRoutes);

/*
========================================
404 + ERROR HANDLER
========================================
*/
app.use(notFound);
app.use(errorHandler);

/*
========================================
START SERVER
========================================
*/
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 SettleUp backend running on port ${PORT}`);
});

/*
========================================
PRISMA CONNECTION CHECK (OPTIONAL)
========================================
*/
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ Prisma connected successfully");
  } catch (error) {
    console.error("❌ Prisma connection failed:", error);
  }
}

connectDB();
require('./utils/keepAlive');