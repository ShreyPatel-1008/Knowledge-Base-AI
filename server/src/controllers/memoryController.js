import { UserMemory } from "../models/UserMemory.js";

/**
 * GET /api/memories
 * Fetch all memories/preferences for the authenticated user
 */
export async function getMemories(req, res, next) {
  try {
    const memories = await UserMemory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      memories,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/memories
 * Manually add a memory or personal preference
 */
export async function createMemory(req, res, next) {
  try {
    const { content, category } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Memory content cannot be empty.",
      });
    }

    const memory = await UserMemory.create({
      userId: req.user._id,
      content: content.trim(),
      category: category || "preference",
    });

    return res.status(201).json({
      success: true,
      message: "Preference added to long-term memory.",
      memory,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/memories/:id
 * Delete a specific memory item
 */
export async function deleteMemory(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await UserMemory.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Memory not found or access denied.",
      });
    }

    return res.json({
      success: true,
      message: "Memory deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/memories
 * Clear all memories for the authenticated user
 */
export async function clearAllMemories(req, res, next) {
  try {
    const result = await UserMemory.deleteMany({ userId: req.user._id });
    return res.json({
      success: true,
      message: `Cleared ${result.deletedCount} memories.`,
    });
  } catch (err) {
    next(err);
  }
}
