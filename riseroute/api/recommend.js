export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { query, roles } = req.body;

    if (!query || !Array.isArray(roles)) {
      return res.status(400).json({
        error: "Query and roles are required",
      });
    }

    const roleContext = roles
      .map(
        (role) =>
          `ID: ${role.id}\nTitle: ${role.title}\nDescription: ${role.description}\nSkills: ${role.tags.join(", ")}`
      )
      .join("\n\n");

    const prompt = `
You are a career recommendation system.

Understand the user's natural-language career preference and recommend
the most relevant career tracks from the provided list.

USER QUERY:
${query}

AVAILABLE CAREER TRACKS:
${roleContext}

RULES:
1. Return ONLY valid JSON.
2. Use only IDs from the available career tracks.
3. Return between 1 and 3 relevant matches.
4. Sort matches by relevance.
5. Do not create new career-track IDs.
6. Score must be between 0 and 1.

OUTPUT FORMAT:
{
  "matches": [
    {
      "id": "aiml",
      "score": 0.95,
      "reason": "The user is interested in AI and machine learning."
    }
  ]
}
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            "https://rise-route-ai-career-navigator.vercel.app",
          "X-Title": "RiseRoute NLP Career Search",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error("OpenRouter API request failed");
    }

    const data = await response.json();

    const content =
      data.choices?.[0]?.message?.content || '{"matches": []}';

    const cleanedContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleanedContent);

    const validRoleIds = new Set(roles.map((role) => role.id));

    const safeMatches = Array.isArray(result.matches)
      ? result.matches.filter(
          (match) =>
            match &&
            validRoleIds.has(match.id) &&
            typeof match.score === "number"
        )
      : [];

    return res.status(200).json({
      matches: safeMatches.slice(0, 3),
    });
  } catch (error) {
    console.error("Recommendation API Error:", error);

    return res.status(500).json({
      error: "Failed to generate career recommendations",
      matches: [],
    });
  }
}