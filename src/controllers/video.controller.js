import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (userId && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id");
    }

    const pipeline = [];

    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    {
                        title: {
                            $regex: query,
                            $options: "i",
                        },
                    },
                    {
                        description: {
                            $regex: query,
                            $options: "i",
                        },
                    },
                ],
            },
        });
    }
    if (userId) {
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        });
    }
    if (sortBy) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1,
            },
        });
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1,
            },
        });
    }
    if (pageNumber > 0 && limitNumber > 0) {
        pipeline.push(
            {
                $skip: (pageNumber - 1) * limitNumber,
            },
            {
                $limit: limitNumber,
            }
        );
    }

    const videos = await Video.aggregate(pipeline);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const videoFilePath = req.files?.videoFile?.[0].path;
    const thumbnailPath = req.files?.thumbnail?.[0].path;

    if (!(title && description)) {
        throw new ApiError(400, "Title and description are required");
    }

    if (!(videoFilePath && thumbnailPath)) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    const videoFile = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailPath);

    if (!(videoFile && thumbnail)) {
        throw new ApiError(500, "Failed to upload video or thumbnail");
    }

    const videoDuration = videoFile.duration || 0;

    const newVideo = await Video.create({
        videoFile: videoFile.secure_url,
        thumbnail: thumbnail.secure_url,
        title,
        description,
        owner: req.user._id,
        duration: videoDuration,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: { views: 1 },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailPath = req.files?.thumbnail?.[0].path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to update this video");
    }

    let updateData = {};

    if (thumbnailPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailPath);

        if (!thumbnail) {
            throw new ApiError(500, "Failed to upload thumbnail");
        }

        updateData.thumbnail = thumbnail.secure_url;
    }
    if (title) {
        updateData.title = title;
    }
    if (description) {
        updateData.description = description;
    }
    
    if (Object.keys(updateData).length === 0) {
        throw new ApiError(
            400,
            "At least one of title, description or thumbnail is required to update"
        );
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, updateData, {
        new: true,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to delete this video");
    }

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to update this video");
    }

    if (!video.isPublished) {
        video.isPublished = true;
        await video.save({ validateBeforeSave: false });
    } else {
        video.isPublished = false;
        await video.save({ validateBeforeSave: false });
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video publish status updated successfully"
            )
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
