import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "Channel Id is required");
    } else if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel Id");
    }

    if (req.user._id.equals(channelId)) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id,
    });

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res
            .status(200)
            .json(
                new ApiResponse(200, null, "Channel unsubscribed successfully")
            );
    } else {
        await Subscription.create({
            channel: channelId,
            subscriber: req.user._id,
        });

        return res
            .status(200)
            .json(
                new ApiResponse(200, null, "Channel subscribed successfully")
            );
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel Id");
    }

    const channelSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
            },
        },
        {
            $unwind: "$subscriberDetails",
        },
        {
            $replaceRoot: {
                newRoot: "$subscriberDetails",
            },
        },
        {
            $project: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: "$avatar.url",
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelSubscribers,
                "Channel subscribers fetched successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid Subscriber Id");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
            },
        },
        {
            $unwind: "$channelDetails",
        },
        {
            $replaceRoot: {
                newRoot: "$channelDetails",
            },
        },
        {
            $project: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: "$avatar.url", 
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "Subscribed channels fetched successfully"
            )
        );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
