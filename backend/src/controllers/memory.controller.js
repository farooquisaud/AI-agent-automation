const AgentMemory = require("../models/agentMemory.model");

/* -----------------------------
   List Memories
----------------------------- */

async function listMemories(req, res) {
  try {
    const { agentId, search } = req.query;

    const filter = {};

    if (agentId) filter.agentId = agentId;

    if (search) {
      filter.content = {
        $regex: search,
        $options: "i"
      };
    }

    const memories = await AgentMemory
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("agentId", "name")
      .lean();

    res.json({
      ok: true,
      memories
    });

  } catch (err) {

    console.error("listMemories error", err);

    res.status(500).json({
      ok: false,
      error: "memory_fetch_failed"
    });

  }
}


/* -----------------------------
   Get Agent List
----------------------------- */

async function listAgents(req, res) {
  try {

    const agents = await AgentMemory.aggregate([
      {
        $group: {
          _id: "$agentId",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      ok: true,
      agents
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      ok: false
    });

  }
}


/* -----------------------------
   Delete Memory
----------------------------- */

async function deleteMemory(req, res) {
  try {

    const { id } = req.params;

    await AgentMemory.deleteOne({
      _id: id
    });

    res.json({
      ok: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      ok: false
    });

  }
}


/* -----------------------------
   Clear Agent Memory
----------------------------- */

async function clearAgentMemory(req, res) {
  try {

    const { agentId } = req.params;

    await AgentMemory.deleteMany({
      agentId
    });

    res.json({
      ok: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      ok: false
    });

  }
}

module.exports = {
  listMemories,
  listAgents,
  deleteMemory,
  clearAgentMemory
};