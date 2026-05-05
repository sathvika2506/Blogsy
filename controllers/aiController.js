import OpenAI from "openai";

let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_openai_api_key_here") {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function callAI(systemPrompt, userContent, fallback) {
  if (!openai) return fallback;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI error:", err.message);
    return fallback;
  }
}

// POST /ai/summary
export async function generateSummary(req, res) {
  const { content } = req.body;
  if (!content?.trim()) return res.json({ result: "" });
  const result = await callAI(
    "You are a helpful writing assistant for a lifestyle blogging platform. Generate a concise 2-3 sentence TL;DR summary of the blog content. Keep it engaging and reader-friendly.",
    content,
    "Unable to generate summary. Please configure your OpenAI API key."
  );
  res.json({ result });
}

// POST /ai/tags
export async function generateTags(req, res) {
  const { title, content } = req.body;
  const result = await callAI(
    "You are a content tagging expert. Generate 4-6 relevant tags for this blog post. Return ONLY a comma-separated list of tags, lowercase, no hashtags.",
    `Title: ${title}\n\nContent: ${content?.slice(0, 1000)}`,
    "lifestyle, blog, writing, inspiration"
  );
  res.json({ result });
}

// POST /ai/titles
export async function generateTitles(req, res) {
  const { content } = req.body;
  const result = await callAI(
    "You are a creative content strategist for a lifestyle blog. Generate 3 catchy, engaging blog title suggestions based on the content. Return ONLY a numbered list, one per line.",
    content?.slice(0, 1000),
    "1. Your Story Matters\n2. A Journey Worth Sharing\n3. Thoughts from the Heart"
  );
  res.json({ result });
}

// POST /ai/improve
export async function improveContent(req, res) {
  const { content } = req.body;
  if (!content?.trim()) return res.json({ result: content });
  const result = await callAI(
    "You are a professional lifestyle blog editor. Improve the writing quality, flow, and engagement of this blog post. Keep the author's voice and message intact. Return the improved text only.",
    content,
    content
  );
  res.json({ result });
}

// POST /ai/ask
export async function askBlog(req, res) {
  const { content, question } = req.body;
  if (!question?.trim()) return res.json({ result: "Please enter a question." });
  const result = await callAI(
    "You are a helpful assistant. Answer questions based ONLY on the blog post content provided. If the answer isn't in the content, say so clearly.",
    `Blog content:\n${content}\n\nQuestion: ${question}`,
    "I need an OpenAI API key to answer questions about this blog."
  );
  res.json({ result });
}
