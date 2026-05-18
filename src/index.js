// Alternate method
// require('dotenv').config({path: "./env"});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
dotenv.config({ path: "./.env " });
import { app } from "./app.js";

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log("Server is running on port", process.env.PORT);
        });
    })
    .catch((err) => console.error("Error connecting to MongoDB:", err));

// Alternative approach - using IIFE
// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
//     app.on("error", (err) => {
//       console.log("ERR: ", err);
//       throw err;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log("Server is running on port ", process.env.PORT);
//     });
//   } catch (error) {
//     console.error("Error connecting to MongoDB:", error);
//     throw error;
//   }
// })();
