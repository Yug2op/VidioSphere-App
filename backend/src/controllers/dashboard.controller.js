import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Comment } from "../models/comment.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {

    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user?._id;

    const totalVideos = await Video.countDocuments({ owner: userId });

    if (totalVideos === null || totalVideos === undefined) {
        throw new ApiError(
            500,
            "Somthing Went wrong while displaying total videos."
        )
    }

    const totalSubscribers = await Subscription.countDocuments({ channel: userId });

    if (totalSubscribers === null || totalSubscribers === undefined) {
        throw new ApiError(
            500,
            "Somthing Went wrong while displaying total subscribers."
        )
    }

    const totalVideoLikes = await Like.countDocuments({
        video: {
            $in: await Video.find({ owner: userId }).distinct("_id")
        }
    });

    if (totalVideoLikes === null || totalVideoLikes === undefined) {
        throw new ApiError(
            500,
            "Somthing Went wrong while displaying total likes."
        )
    }

    const totalTweetLikes = await Tweet.aggregate([
        { $match: { owner: userId } },
        { $project: { totalLikes: { $size: "$likedBy" } } },
        { $group: { _id: null, totalTweetLikes: { $sum: "$totalLikes" } } }
    ]);
    
    const totalTweetLikesCount = totalTweetLikes[0]?.totalTweetLikes || 0;
    
    
    if (totalTweetLikes === null || totalTweetLikes === undefined) {
        throw new ApiError(
            500,
            "Somthing Went wrong while displaying total tweet likes."
        )
    }

    const totalCommentLikes = await Like.countDocuments({
        comment: {
            $in: await Comment.find({ owner: userId }).distinct("_id")
        }
    });

    if (totalCommentLikes === null || totalCommentLikes === undefined) {
        throw new ApiError(
            500,
            "Somthing Went wrong while displaying total comments likes."
        )
    }

    const totalViews = await Video.aggregate([
        {
            $match: { owner: userId }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" },
            },
        },
    ]);

    if (totalViews === null || totalViews === undefined) {
        throw new ApiError(
            500,
            "Something went wrong while displaying total views"
        );
    }

    res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos,
                totalSubscribers,
                totalVideoLikes,
                totalTweetLikesCount,
                totalCommentLikes,
                totalViews: totalViews[0]?.totalViews || 0,
            },
            "Channel stats fetched successfully"
        )
    );


})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get the logged-in user's ID
    const { username } = req.params;

    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(404, "User not found");
    }


    // Fetch videos and populate owner details
    const videos = await Video.find({ owner: user._id })
        .populate({
            path: "owner",
            select: "-password -refreshToken" // Exclude password explicitly
        })
        .sort({ createdAt: -1 });

    // Check if videos exist
    if (!videos || videos.length === 0) {
        throw new ApiError(404, "No videos found for this channel");
    }

    return res.json(
        new ApiResponse(
            200,
            videos,
            "Channel videos fetched successfully.")
    );
});


export {
    getChannelStats,
    getChannelVideos
}