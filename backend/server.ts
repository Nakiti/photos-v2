import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./src/api/index.js";
import { socketManager } from "./libs/socket.manager.js";
import http from "http"

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ message: "Server is running" });
});

app.use('/api/v1', apiRoutes);

const httpServer = http.createServer(app);

socketManager.initialize(httpServer);

// --- 404 Handler ---
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ message: 'Not Found' });
});

export default httpServer;
