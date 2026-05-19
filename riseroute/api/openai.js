export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat:free",
          messages: [
            {
              role: "user",
              content: req.body.prompt,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenRouter failed",
      });
    }

    return res.status(200).json({
      text: data.choices?.[0]?.message?.content,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
}