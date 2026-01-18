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

    // --- STRATEGY: OPENAI COMPATIBLE (DeepSeek, gim4.7, etc) ---
    else {
        // Default endpoints if not provided
        let baseUrl = config.baseUrl;
        if (!baseUrl) {
            if (config.modelName.includes('deepseek')) {
                baseUrl = 'https://api.deepseek.com';
            } else {
                // Fallback or assume user provided URL for 'gim4.7'
                baseUrl = 'https://api.openai.com/v1'; 
            }
        }
        
        // Ensure /v1/chat/completions is usually appended if base is just the domain, 
        // but often users put the full path. We'll do a simple check.
        // For robustness, let's assume the user puts the base domain or we append standard path.
        // If the user inputs "https://api.deepseek.com", we append "/chat/completions".
        let endpoint = baseUrl;
        if (!endpoint.endsWith('/chat/completions')) {
            // Remove trailing slash if present
            if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
            // Append standard path if it looks like a base domain
            if (!endpoint.includes('/chat/completions')) {
                 endpoint += '/chat/completions';
            }
        }

        // For non-Gemini models, we cannot send the Google `Type` schema object directly.
        // We must instruct the model to return JSON in the system prompt or user prompt.
        let finalPrompt = prompt;
        let responseFormat: any = undefined;

        if (schema) {
            finalPrompt += `\n\nIMPORTANT: Provide your response in valid JSON format.`;
            // DeepSeek supports response_format: { type: 'json_object' }
            responseFormat = { type: "json_object" };
            
            // We should also try to describe the schema in text since we can't pass the object easily
            // Simplified approach: The prompts in prompts.ts already describe the structure fairly well.
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: config.modelName, // 'deepseek-chat' or 'gim4.7'
                messages: [
                    { role: "user", content: finalPrompt }
                ],
                response_format: responseFormat,
                stream: false
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`AI Request Failed: ${response.status} - ${err}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    }
};

// Re-export Type for convenience in other files
export { Type };