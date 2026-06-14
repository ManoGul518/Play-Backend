import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    uploadOnCloudinary,
    removeFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;

    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Page and limit must be positive integers");
    }
    if (limitNumber > 100) {
        throw new ApiError(400, "Limit cannot exceed 100");
    }

    if (userId && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id");
    }

    const pipeline = [];

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    {
                        title: {
                            $regex: escapeRegex(query),
                            $options: "i",
                        },
                    },
                    {
                        description: {
                            $regex: escapeRegex(query),
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
        videoFile: {
            url: videoFile.secure_url,
            public_id: videoFile.public_id,
        },
        thumbnail: {
            url: thumbnail.secure_url,
            public_id: thumbnail.public_id,
        },
        title,
        description,
        owner: req.user._id,
        duration: videoDuration,
    });

    if (!newVideo) {
        await removeFromCloudinary(videoFile.public_id);
        await removeFromCloudinary(thumbnail.public_id);
        throw new ApiError(500, "Error publishing video");
    }

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
        { returnDocument: "after" }
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

        updateData.thumbnail = {
            url: thumbnail.secure_url,
            public_id: thumbnail.public_id,
        };
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
        returnDocument: "after",
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

    // Delete all associated likes and comments before deleting video
    await Promise.all([
        Like.deleteMany({ video: videoId }),
        Comment.deleteMany({ video: videoId }),
        Playlist.updateMany(
            { videos: videoId },
            { $pull: { videos: videoId } }
        ),
    ]);
    // Remove video and thumbnail from Cloudinary
    await Promise.all([
        removeFromCloudinary(video.videoFile.public_id),
        removeFromCloudinary(video.thumbnail.public_id),
    ]);
    // Finally, delete the video document
    await Video.findByIdAndDelete(videoId);
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
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
