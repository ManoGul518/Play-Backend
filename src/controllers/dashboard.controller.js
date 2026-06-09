import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const [totalVideos, totalSubscribers, totalLikesResult, totalViewsResult] =
        await Promise.all([
            Video.countDocuments({ owner: req.user._id }),
            Subscription.countDocuments({ channel: req.user._id }),
            Like.aggregate([
                {
                    $lookup: {
                        from: "videos",
                        localField: "video",
                        foreignField: "_id",
                        as: "videoDetails",
                    },
                },
                {
                    $unwind: "$videoDetails",
                },
                {
                    $match: {
                        "videoDetails.owner": new mongoose.Types.ObjectId(
                            req.user._id
                        ),
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalLikes: { $sum: 1 },
                    },
                },
            ]),
            Video.aggregate([
                {
                    $match: {
                        owner: new mongoose.Types.ObjectId(req.user._id),
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: "$views" },
                    },
                },
            ]),
        ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos,
                totalSubscribers,
                totalLikes: totalLikesResult[0]?.totalLikes || 0,
                totalViews: totalViewsResult[0]?.totalViews || 0,
            },
            "Channel stats fetched successfully"
        )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const videos = await Video.find({ owner: req.user._id }).sort({
        createdAt: -1,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
