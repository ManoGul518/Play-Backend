import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (!videoId) {
        throw new ApiError(400, "VideoId Id is required");
    } else if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }

    const comments = await Comment.find({
        video: videoId,
    })
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                comments,
                "Video comments fetched successfully"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    const user = req.user._id;
    const trimmedContent = content?.trim();

    if (!videoId) {
        throw new ApiError(400, "Video Id is required");
    } else if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    } else if (!(content && trimmedContent)) {
        throw new ApiError(400, "Content is required");
    }

    const newComment = await Comment.create({
        content: trimmedContent,
        video: videoId,
        owner: req.user._id,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newComment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const trimmedContent = content?.trim();

    if (!commentId) {
        throw new ApiError(400, "Comment Id is required");
    } else if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id");
    } else if (!(content && trimmedContent)) {
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    } else if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(400, "Not authorized to update this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content: trimmedContent,
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Comment Id is required");
    } else if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    } else if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
