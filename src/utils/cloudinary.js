import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;
    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        // Remove the locally saved temporary file as upload is unsuccessful
        fs.unlinkSync(localFilePath);
        throw new ApiError(
            500,
            error.message || "Error while uploading file to cloudinary"
        );
    }
};

export const removeFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } catch (error) {
        throw new ApiError(
            500,
            error.message || "Error while removing file from cloudinary"
        );
    }
};
