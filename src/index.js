// Alternate method
// require('dotenv').config({path: "./env"});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
dotenv.config({ path: "./.env" });
import { app } from "./app.js";

const PORT = process.env.PORT || 8000;

const requiredEnvVars = [
    "MONGO_URI",
    "PORT",
    "CORS_ORIGIN",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
    console.error(
        `Missing required environment variables: ${missingVars.join(", ")}`
    );
    process.exit(1);
}

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log("Server is running on port ", PORT);
        });
    })
    .catch((err) => console.error("Error connecting to MongoDB: ", err));
