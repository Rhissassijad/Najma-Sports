const { summaries } = require("../utils/feedAccess");
const { optionalDiscipline } = require("../utils/individualSports");
const FeedPost = require("../models/FeedPost");
const User = require("../models/User");
const Community = require("../models/Community");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const {
  allSports: ALLOWED_SPORT_TAGS,
  normalizeSport,
} = require("../utils/sports");

function canManagePost(post, userId) {
  return post?.author && String(post.author) === String(userId);
}

function resolveOptionalUserId(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id ? String(decoded.id) : null;
  } catch (_error) {
    return null;
  }
}

function nonCommunityPostsFilter() {
  return {
    $or: [{ community: null }, { community: { $exists: false } }],
  };
}

exports.getFeedPosts = async (req, res) => {
  try {
    const userId = resolveOptionalUserId(req);
    let filter = nonCommunityPostsFilter();

    if (userId) {
      const memberCommunityIds = await Community.distinct("_id", {
        members: userId,
      });
      if (memberCommunityIds.length > 0) {
        filter = {
          $or: [
            ...nonCommunityPostsFilter().$or,
            { community: { $in: memberCommunityIds } },
          ],
        };
      }
    }

    const posts = await FeedPost.find(filter)
      .sort({ createdAt: -1 })
      .limit(250)
      .populate("author", "firstName lastName name email")
      .populate("community", "name");

    res.json(await summaries(posts, userId));
  } catch (error) {
    res.status(500).json({ message: "Failed to load feed posts." });
  }
};

exports.createFeedPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      text,
      sportTag,
      location,
      isMatchResult,
      hasMedia,
      hasLocation,
      communityId,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const author = await User.findById(userId);
    if (!author) {
      return res.status(404).json({ message: "User not found." });
    }

    const trimmedText = String(text || "").trim();
    const normalizedSportTag = normalizeSport(sportTag);
    const trimmedLocation = String(location || "").trim();

    if (!trimmedText) {
      return res.status(400).json({ message: "Post text is required." });
    }

    if (!normalizedSportTag) {
      return res.status(400).json({ message: "Sport tag is required." });
    }

    if (!ALLOWED_SPORT_TAGS.includes(normalizedSportTag)) {
      return res.status(400).json({ message: "Invalid sport tag." });
    }

    let resolvedCommunityId = null;
    const normalizedCommunityId = String(communityId || "").trim();
    if (normalizedCommunityId) {
      if (!mongoose.Types.ObjectId.isValid(normalizedCommunityId)) {
        return res.status(400).json({ message: "Invalid community id." });
      }

      const community = await Community.findById(normalizedCommunityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found." });
      }

      const isMember = Array.isArray(community.members)
        ? community.members.some(
            (memberId) => String(memberId) === String(userId),
          )
        : false;

      if (!isMember) {
        return res.status(403).json({
          message: "You must join this community before posting in it.",
        });
      }

      resolvedCommunityId = community._id;
    }

    const post = await FeedPost.create({
      author: userId,
      text: trimmedText,
      sportTag: normalizedSportTag,
      discipline: optionalDiscipline(normalizedSportTag, req.body.discipline),
      location: trimmedLocation,
      isMatchResult: Boolean(isMatchResult),
      hasMedia: Boolean(hasMedia),
      hasLocation: Boolean(hasLocation),
      community: resolvedCommunityId,
    });

    const populatedPost = await FeedPost.findById(post._id)
      .populate("author", "firstName lastName name email")
      .populate("community", "name");

    res.status(201).json((await summaries([populatedPost], userId))[0]);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to create feed post.",
    });
  }
};

exports.updateFeedPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const postId = req.params?.postId;
    const { text, sportTag, location, isMatchResult, hasMedia, hasLocation } =
      req.body;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const post = await FeedPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (!canManagePost(post, userId)) {
      return res
        .status(403)
        .json({ message: "You can only modify your own posts." });
    }

    if (text !== undefined) {
      const trimmedText = String(text || "").trim();
      if (!trimmedText) {
        return res.status(400).json({ message: "Post text is required." });
      }
      post.text = trimmedText;
    }

    if (sportTag !== undefined) {
      const normalizedSportTag = normalizeSport(sportTag);
      if (!ALLOWED_SPORT_TAGS.includes(normalizedSportTag)) {
        return res.status(400).json({ message: "Invalid sport tag." });
      }
      if (post.sportTag !== normalizedSportTag) post.discipline = "";
      post.sportTag = normalizedSportTag;
    }

    if (req.body.discipline !== undefined)
      post.discipline = optionalDiscipline(post.sportTag, req.body.discipline);
    if (location !== undefined) {
      post.location = String(location || "").trim();
    }

    if (isMatchResult !== undefined) {
      post.isMatchResult = Boolean(isMatchResult);
    }

    if (hasMedia !== undefined) {
      post.hasMedia = Boolean(hasMedia);
    }

    if (hasLocation !== undefined) {
      post.hasLocation = Boolean(hasLocation);
    }

    await post.save();

    const populatedPost = await FeedPost.findById(post._id)
      .populate("author", "firstName lastName name email")
      .populate("community", "name");
    res.json((await summaries([populatedPost], userId))[0]);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to update feed post.",
    });
  }
};

exports.deleteFeedPost = require("./feedInteractionController").deletePost;
