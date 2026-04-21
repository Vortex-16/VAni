import fetch from 'node-fetch'; // fetch is native in Node 18+

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  const data = await response.json();
  const visionModels = data.data.filter((m: any) => m.id.includes("vision"));
  console.log("Vision Models:", visionModels.map((m: any) => m.id));
}
listModels();
