const Community = require("../models/Community");
const User = require("../models/User");
const mongoose = require("mongoose");

function toCommunityPayload(community, currentUserId) {
  const members = Array.isArray(community.members) ? community.members : [];
  const memberCount = members.length;
  const isMember = currentUserId ? members.some((memberId) => String(memberId) === String(currentUserId)) : false;

  return {
    _id: community._id,
    name: community.name,
    createdBy: community.createdBy,
    memberCount,
    isMember,
    createdAt: community.createdAt,
  };
}

exports.getCommunities = async (req, res) => {
  try {
    const currentUserId = req.user?.id || null;
    const communities = await Community.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("createdBy", "name email firstName lastName");

    res.json(communities.map((community) => toCommunityPayload(community, currentUserId)));
  } catch (error) {
    res.status(500).json({ message: "Failed to load communities." });
  }
};

exports.createCommunity = async (req, res) => {
  try {
    const userId = req.user?.id;
    const name = String(req.body?.name || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    if (!name) {
      return res.status(400).json({ message: "Community name is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const existing = await Community.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (existing) {
      return res.status(400).json({ message: "Community name already exists." });
    }

    const community = await Community.create({
      name,
      createdBy: userId,
      members: [userId],
    });

    const populated = await Community.findById(community._id).populate("createdBy", "name email firstName lastName");
    res.status(201).json(toCommunityPayload(populated, userId));
  } catch (error) {
    res.status(500).json({ message: "Failed to create community." });
  }
};

exports.joinCommunity = async (req, res) => {
  try {
    const userId = req.user?.id;
    const communityId = req.params?.communityId;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({ message: "Invalid community id." });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found." });
    }

    await Community.updateOne({ _id: communityId }, { $addToSet: { members: userId } });
    const updatedCommunity = await Community.findById(communityId).populate("createdBy", "name email firstName lastName");

    res.json(toCommunityPayload(updatedCommunity, userId));
  } catch (error) {
    res.status(500).json({ message: "Failed to join community." });
  }
};
