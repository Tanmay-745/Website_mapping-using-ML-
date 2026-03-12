import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Bot, Send, X, Loader2, AlertCircle } from "lucide-react";
import { generateNoticeContent, checkServerHealth } from "../api";
import { toast } from "sonner";

export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
        { role: "assistant", content: "Hello! I'm your AI Legal Assistant. How can I help you draft your notice today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isServerOnline, setIsServerOnline] = useState<boolean>(true);

    useEffect(() => {
        if (isOpen) {
            checkServerHealth().then(online => {
                setIsServerOnline(online);
                if (!online) {
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: "⚠️ **Warning**: The AI connection server seems to be offline. Please run `npm run start:proxy` in your terminal to enable AI features."
                    }]);
                }
            });
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            // Filter out system warnings/errors from history before sending
            const history = messages.filter(m =>
                m.role === "user" ||
                (m.role === "assistant" && !m.content.startsWith("⚠️") && !m.content.startsWith("❌"))
            );

            // Add current user message
            const fullHistory = [...history, { role: "user", content: userMessage }];

            // The local ML service returns an object { result: string, source: string }
            // generateNoticeContent now returns a string (the result), but we need the source too.
            // Let's check api.ts again - I updated the interface but not the return type of common usage.
            
            // Re-fetch with awareness of the new return structure
            const response = await fetch(`http://localhost:54321/functions/v1/server/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: userMessage, context: { type: "chat" }, messages: fullHistory }),
            });
            const data = await response.json();
            
            let assistantMessage = data.result || "No response";
            if (data.source) {
                assistantMessage += `\n\n*(Source Template: ${data.source})*`;
            }

            setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.message || "Failed to get response from AI";
            toast.error(errorMessage);
            setMessages((prev) => [...prev, { role: "assistant", content: `❌ Error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className={`rounded-2xl w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${isServerOnline
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        : "bg-gray-500 hover:bg-gray-600"
                        }`}
                >
                    <Bot className="w-8 h-8 text-white" />
                    {!isServerOnline && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
                    )}
                </Button>
            )}

            {isOpen && (
                <Card className="w-80 sm:w-96 h-[500px] flex flex-col shadow-2xl border-gray-200/50 animate-in slide-in-from-bottom-10 fade-in duration-300 bg-white/80 backdrop-blur-md">
                    <div className={`p-4 text-white rounded-t-xl flex justify-between items-center ${isServerOnline
                        ? "bg-gradient-to-br from-blue-600 to-purple-600"
                        : "bg-gray-600"
                        }`}>
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            <span className="font-semibold">AI Assistant {isServerOnline ? "" : "(Offline)"}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:bg-white/20 rounded-full w-8 h-8"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {!isServerOnline && (
                        <div className="bg-yellow-50 p-2 text-xs text-yellow-800 border-b border-yellow-100 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span>Run <code>npm run start:proxy</code> to fix connection.</span>
                        </div>
                    )}

                    <ScrollArea className="flex-1 p-4 bg-gray-50/50">
                        <div className="space-y-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === "user"
                                            ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-none"
                                            : "bg-white border border-gray-200 text-gray-700 rounded-bl-none"
                                            }`}
                                    >
                                        <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                        <span className="text-xs text-gray-500">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-3 border-t border-gray-100 bg-white/50 backdrop-blur-sm rounded-b-xl">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex gap-2"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isServerOnline ? "Ask me anything..." : "Server offline..."}
                                className="flex-1 bg-white/80 border-gray-200 focus:border-blue-500 rounded-xl"
                                disabled={isLoading}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim() || !isServerOnline} className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </Card>
            )}
        </div>
    );
}
