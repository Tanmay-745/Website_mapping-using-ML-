
const API_BASE = "http://localhost:54321/functions/v1/server"; // Adjust based on your local Supabase setup or production URL

export interface GenerateRequest {
    prompt: string;
    context: any;
    apiKey?: string;
    type?: string;
    targetLanguage?: string;
    messages?: { role: "user" | "assistant" | "system"; content: string }[];
}

export interface GenerateResponse {
    result?: string;
    error?: string;
}

export async function checkServerHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/health`);
        return response.ok;
    } catch (error) {
        console.warn("Server health check failed:", error);
        return false;
    }
}

const LOCAL_API_BASE = "http://localhost:54321";

export interface Advocate {
    id?: string;
    name: string;
    phone: string;
    companyName: string;
    city: string;
    pinCode: string;
    state: string;
    address: string;
    bio: string;
    signature?: string; // Base64 or URL
}

export async function getAdvocates(): Promise<Advocate[]> {
    try {
        const response = await fetch(`${LOCAL_API_BASE}/api/advocates?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to fetch advocates");
        return await response.json();
    } catch (error) {
        console.error("Error fetching advocates:", error);
        return [];
    }
}

export async function saveAdvocate(advocate: Advocate): Promise<Advocate> {
    const response = await fetch(`${LOCAL_API_BASE}/api/advocates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(advocate),
    });
    if (!response.ok) throw new Error("Failed to save advocate");
    const data = await response.json();
    return data.advocate;
}

export async function deleteAdvocate(id: string): Promise<void> {
    const response = await fetch(`${LOCAL_API_BASE}/api/advocates?id=${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete advocate");
}

export async function generateNoticeContent(prompt: string, context: any, messages?: any[]): Promise<string> {
    try {
        const response = await fetch(`${API_BASE}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt, context, messages }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: GenerateResponse = await response.json();

        if (data.error) {
            throw new Error(`Server Error: ${data.error}`);
        }

        if (!data.result) {
            throw new Error("No result returned from server");
        }

        return data.result;
    } catch (error) {
        console.error("Failed to generate notice content:", error);
        // Re-throw with a more user-friendly message if possible, or just the error
        if (error instanceof TypeError && error.message === "Failed to fetch") {
            throw new Error("Cannot connect to server. Please ensure 'npm run start:proxy' is running.");
        }
        throw error;
    }
}
