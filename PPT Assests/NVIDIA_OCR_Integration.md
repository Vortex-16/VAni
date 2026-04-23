# Integrating Free NVIDIA OCR Models

NVIDIA provides high-accuracy vision models (such as Llama 3.2 11B/90B Vision Instruct and NVLM 1.0) for free through their NIM (NVIDIA Inference Microservices) API Catalog. You can easily use these to replace the current fallback vision models (like Gemini or Groq) in your backend.

## Step 1: Get Your Free NVIDIA API Key
1. Go to [build.nvidia.com](https://build.nvidia.com/) and create a free account.
2. In the API Catalog, search for a vision model. We recommend **Llama 3.2 90B Vision Instruct** or **NVLM 1.0 72B** for handwriting OCR.
3. Click on the model, click "Get API Key", and generate your key (starts with `nvapi-`).
4. Add the key to your `api-server/.env` file:
   ```env
   NVIDIA_API_KEY=nvapi-your-key-here
   ```

## Step 2: Update the API Server to Use NVIDIA
NVIDIA's endpoints are fully compatible with the standard OpenAI SDK format. In `PrescriptionService.ts`, you can add a fallback function for NVIDIA similar to how Groq is set up.

Add this method to the `PrescriptionService` class:

```typescript
private static async fallbackToNvidiaVision(
  imageBase64: string,
  apiKey: string,
): Promise<PrescriptionAnalysisResult> {
  const requestBody = {
    model: "meta/llama-3.2-90b-vision-instruct", // or "nvidia/nvlm-d-72b"
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_FALLBACK_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  };

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const resultText = data.choices[0]?.message?.content;
  
  const cleanedText = resultText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleanedText);

  // Map the output to your ExtractedMedicine interface...
  // (Follow the exact same mapping logic used in fallbackToGroqVision)
  
  // ...
}
```

## Step 3: Wire it Up
In the main `analyzePrescription` pipeline, check for the NVIDIA key:

```typescript
const nvidiaKey = process.env.NVIDIA_API_KEY;

// ... Inside the fallback block:
if (nvidiaKey) {
  console.log("[Pipeline] Local OCR failed. Trying NVIDIA Vision...");
  return await this.fallbackToNvidiaVision(cleanBase64, nvidiaKey);
}
```

### Why NVIDIA?
- **Cost**: The developer tier is completely free and provides thousands of requests.
- **Accuracy**: The massive Llama 3.2 90B Vision and NVLM-D-72B models are incredibly accurate at reading complex doctors' handwriting, often matching or outperforming smaller paid models.
- **Privacy**: If you scale up to production, you can download the NIM container from NVIDIA NGC and run the OCR entirely locally on your own GPUs.
