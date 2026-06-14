import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const trimmedDescription = description?.trim();

    if (!(name && description && trimmedDescription)) {
        throw new ApiError(400, "All fields are required");
    }

    const newPlaylist = await Playlist.create({
        name,
        description,
        owner: req.user._id,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, newPlaylist, "Playlist created successfully")
        );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id");
    }

    const userPlaylists = await Playlist.find({
        owner: userId,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userPlaylists,
                "User playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    } else if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    } // Easy debugging

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    } else if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to update this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId },
        },
        { returnDocument: "after" }
    ).populate("videos");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video added to the playlist successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    } else if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    } // Easy debugging

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    } else if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to update this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId },
        },
        { returnDocument: "after" }
    ).populate("videos");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    } else if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to update this playlist");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    const trimmedDescription = description?.trim();

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    } else if (!(name && description && trimmedDescription)) {
        throw new ApiError(400, "All fields are required");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    } else if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Not authorized to update this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            name,
            description,
        },
        { returnDocument: "after" }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
