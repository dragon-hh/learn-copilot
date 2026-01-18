import { GoogleGenAI, Type } from "@google/genai";
import { getModelConfig } from "./storage";

export const generateAIContent = async (
    prompt: string, 
    schema?: any
): Promise<string> => {
    const config = getModelConfig();
    const apiKey = config.apiKey || process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API Key is missing. Please configure it in Settings.");
    }

    // --- STRATEGY: GEMINI ---
    if (config.modelName.includes('gemini')) {
        const ai = new GoogleGenAI({ apiKey });
        
        const generateConfig: any = {};
        if (schema) {
            generateConfig.responseMimeType = "application/json";
            generateConfig.responseSchema = schema;
        }

        const response = await ai.models.generateContent({
            model: config.modelName,
            contents: prompt,
            config: generateConfig
        });

        return response.text || "";
    }

    // --- STRATEGY: OPENAI COMPATIBLE (DeepSeek, NVIDIA NIM, vLLM, etc) ---
    else {
        // Default endpoints if not provided
        let baseUrl = config.baseUrl;
        if (!baseUrl) {
            if (config.modelName.includes('deepseek')) {
                baseUrl = 'https://api.deepseek.com';
            } else {
                // Fallback for generic custom
                baseUrl = 'https://api.openai.com/v1'; 
            }
        }
        
        // Robust URL Construction
        let endpoint = baseUrl;
        // 1. Remove trailing slash
        if (endpoint.endsWith('/')) {
            endpoint = endpoint.slice(0, -1);
        }
        // 2. Append /chat/completions ONLY if not already present
        if (!endpoint.endsWith('/chat/completions')) {
             endpoint += '/chat/completions';
        }

        // 3. Prepend CORS Proxy if configured
        let finalUrl = endpoint;
        if (config.corsProxy) {
            finalUrl = config.corsProxy + endpoint;
        }

        console.log(`[AI] Requesting: ${finalUrl} | Model: ${config.modelName}`);

        let finalPrompt = prompt;
        let responseFormat: any = undefined;

        if (schema) {
            finalPrompt += `\n\nIMPORTANT: Provide your response in valid JSON format. Do not use Markdown code blocks (like \`\`\`json). Just return the raw JSON string.`;
            
            // NOTE: Only enable response_format for providers known to support it strictly.
            if (config.modelName === 'deepseek-chat' || config.modelName === 'deepseek-reasoner') {
                 responseFormat = { type: "json_object" };
            }
        }

        try {
            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelName,
                    messages: [
                        { role: "user", content: finalPrompt }
                    ],
                    response_format: responseFormat,
                    stream: false,
                    temperature: 0.7,
                    max_tokens: 4096 
                })
            });

            // Handle non-200 errors first
            if (!response.ok) {
                const errText = await response.text();
                console.error("[AI] Error Response Body:", errText);
                throw new Error(`AI Request Failed: ${response.status} ${response.statusText} - ${errText.substring(0, 200)}...`);
            }

            // Read raw text first to handle cases where 200 OK returns HTML (common with proxies)
            const rawText = await response.text();
            
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error("[AI] JSON Parse Error. Raw Text:", rawText);
                // Detect common Proxy HTML responses
                if (rawText.includes("<!DOCTYPE html>") || rawText.includes("cors-anywhere")) {
                    throw new Error(`Proxy Error: Received HTML instead of JSON. The CORS proxy might require activation or is blocked. Raw: ${rawText.substring(0, 50)}...`);
                }
                throw new Error(`Invalid JSON response from API. Raw response: ${rawText.substring(0, 100)}...`);
            }

            // Support both standard content and reasoning_content (for R1 models)
            const choice = data.choices?.[0]?.message;
            const content = choice?.content || choice?.reasoning_content || "";
            
            if (!content && !choice) {
                 throw new Error(`Empty response content. Full data: ${JSON.stringify(data).substring(0, 200)}`);
            }

            // Clean up Markdown code blocks
            const cleanContent = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
            return cleanContent;

        } catch (error: any) {
            console.error("[AI] Network or Parsing Error:", error);
            
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                 throw new Error(
                     `网络请求失败 (Failed to fetch)。\n` +
                     `请检查 CORS 代理设置或本地 Vite 代理配置。`
                 );
            }
            throw error;
        }
    }
};

// Re-export Type for convenience in other files
export { Type };