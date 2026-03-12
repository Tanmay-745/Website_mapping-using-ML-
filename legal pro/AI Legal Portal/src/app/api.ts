
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
    source?: string;
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
    email?: string;
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

export async function searchTemplates(lender: string, type: string): Promise<string[]> {
    try {
        const response = await fetch(`${LOCAL_API_BASE}/api/templates/search?lender=${encodeURIComponent(lender)}&type=${encodeURIComponent(type)}`);
        if (!response.ok) throw new Error("Search failed");
        return await response.json();
    } catch (error) {
        console.error("Error searching templates:", error);
        return [];
    }
}

export async function analyzeTemplate(templateName: string): Promise<{ placeholders: string[] }> {
    const response = await fetch(`${LOCAL_API_BASE}/api/templates/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName }),
    });
    if (!response.ok) throw new Error("Analysis failed");
    return await response.json();
}

export async function saveTemplateToFolder(lender: string, type: string, content: string): Promise<boolean> {
    const response = await fetch(`${LOCAL_API_BASE}/api/templates/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lender, type, content }),
    });
    return response.ok;
}

export async function mapVariablesML(placeholders: string[], sourceColumns: string[]): Promise<{ placeholder: string, suggested_column: string, confidence: number }[]> {
    try {
        const response = await fetch(`${LOCAL_API_BASE}/api/ml/map-variables`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ placeholders, source_columns: sourceColumns }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "ML Mapping failed");
        }
        return await response.json();
    } catch (error) {
        console.error("Error in ML Mapping:", error);
        throw error;
    }
}

export interface NoticeType {
    id: string;
    title: string;
    description: string;
    icon?: string;
    color?: string;
}

export async function getNoticeTypes(): Promise<NoticeType[]> {
    try {
        const response = await fetch(`${LOCAL_API_BASE}/api/notice-types?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to fetch notice types");
        return await response.json();
    } catch (error) {
        console.error("Error fetching notice types:", error);
        return [];
    }
}

export async function createNoticeType(noticeType: Partial<NoticeType>): Promise<NoticeType> {
    const response = await fetch(`${LOCAL_API_BASE}/api/notice-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeType),
    });
    if (!response.ok) throw new Error("Failed to create notice type");
    const data = await response.json();
    return data.noticeType;
}
