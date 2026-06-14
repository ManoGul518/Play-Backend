import { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const user = req.user._id;
    const trimmedContent = content?.trim();

    if (!(content && trimmedContent)) {
        throw new ApiError(400, "Content is required");
    }

    const newTweet = await Tweet.create({
        content: trimmedContent,
        owner: user,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newTweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User Id");
    }

    const tweets = await Tweet.find({
        owner: userId,
    }).sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;
    const trimmedContent = content?.trim();

    if (!(tweetId && trimmedContent)) {
        throw new ApiError(400, "Tweet and content required");
    } else if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    } else if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            content: trimmedContent,
        },
        { returnDocument: "after" }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, "Tweet Id is required");
    } else if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet Id");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    } else if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to delete this tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    // Single Query Method (Cons: Hard to debug, harder to know why nothing was deleted.)
    // await Tweet.deleteOne({
    //     _id: tweetId,
    //     owner: req.user._id,
    // });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
