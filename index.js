const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            'https://prueba.coparelampago.com', 
            'https://coparelampago.com',
            'https://www.coparelampago.com',
            'https://appcoparelampago.vercel.app',
            'http://localhost:5173', 
            'http://localhost:5174', 
            'http://192.168.0.13:5173'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://prueba.coparelampago.com', 
            'https://coparelampago.com',
            'https://www.coparelampago.com',
            'https://appcoparelampago.vercel.app',
            'http://localhost:5173', 
            'http://localhost:5174',
            'http://192.168.0.13:5173'
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No autorizado por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Socket-Id']
}));

// Middleware para adjuntar io al objeto req
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rutas
app.use("/upload", require("./routes/uploadRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/user", require("./routes/userRoutes"));

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("newAction", (actionData) => {
        io.emit("actionUpdate", actionData);
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

process.on("uncaughtException", (err) => {
    console.error("Unhandled Exception", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection", reason);
});

server.listen(port, "0.0.0.0", () => {
    console.log(`Corriendo en http://localhost:${port}`);
});
