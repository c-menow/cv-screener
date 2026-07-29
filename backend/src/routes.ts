import { Router } from "express";
import { query } from "./rag/query";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ error: "Missing message in request body." });
    }

    const { answer, sources } = await query(message, history || []);
    res.json({ answer, sources });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Something went wrong processing your question." });
  }
});

export default router;
