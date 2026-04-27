import { X, MessageSquare, Mail, Phone, Users, Upload, Link as LinkIcon, FileText, Trash2, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { notifications } from '../services/api';

interface BulkNotificationModalProps {
    customerCount: number;
    bucketName: string;
    onClose: () => void;
    onSend: (type: string, message: string, attachmentUrl?: string, link?: string, campaignCode?: string) => Promise<void>;
}

export function BulkNotificationModal({ customerCount, bucketName, onClose, onSend }: BulkNotificationModalProps) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState<string | null>(null);
    const [link, setLink] = useState('');
    const [campaignCode, setCampaignCode] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAttachment(file);
        setIsUploading(true);
        try {
            const result = await notifications.uploadFile(file);
            setAttachmentUrl(result.url);
        } catch (error) {
            console.error("File upload failed", error);
            alert("Failed to upload file");
            setAttachment(null);
        } finally {
            setIsUploading(false);
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async (type: string) => {
        if (!message.trim()) {
            alert("Please enter a message content");
            return;
        }

        setSending(type);
        try {
            await onSend(type, message, attachmentUrl || undefined, link || undefined, campaignCode || undefined);
            onClose();
        } catch (error) {
            console.error("Failed to send bulk notification", error);
            alert("Failed to send bulk notification");
        } finally {
            setSending(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Send Bulk Notification</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Users size={14} />
                            <span>Sending to <span className="font-semibold text-gray-900 dark:text-gray-100">{customerCount}</span> customers in <span className="font-semibold text-blue-600 dark:text-blue-400">{bucketName}</span> bucket</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Create a Notice
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message here..."
                            className="w-full h-32 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-right">
                            {message.length} characters
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Attachment (PDF/Image)
                            </label>
 
                            {!attachment ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-600 dark:text-gray-400"
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                                    <span className="text-sm">Upload File</span>
                                </button>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{attachment.name}</span>
                                    </div>
                                    <button
                                        onClick={removeAttachment}
                                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="application/pdf,image/*"
                                className="hidden"
                            />
                        </div>

                        {/* External Link */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                External Link
                            </label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                                <input
                                    type="url"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="https://"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </div>

                        {/* Campaign Code */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Campaign Code
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                                <input
                                    type="text"
                                    value={campaignCode}
                                    onChange={(e) => setCampaignCode(e.target.value)}
                                    placeholder="e.g. SUMMER2024"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => handleSend('whatsapp')}
                            disabled={!!sending || isUploading}
                            className="flex flex-col items-center justify-center gap-2 p-4 border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                        >
                            <MessageSquare className="text-green-600 dark:text-green-400" size={24} />
                            <span className="text-sm font-medium text-green-900 dark:text-green-300">
                                {sending === 'whatsapp' ? 'Sending...' : 'WhatsApp'}
                            </span>
                        </button>

                        <button
                            onClick={() => handleSend('sms')}
                            disabled={!!sending || isUploading}
                            className="flex flex-col items-center justify-center gap-2 p-4 border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                        >
                            <Phone className="text-blue-600 dark:text-blue-400" size={24} />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                {sending === 'sms' ? 'Sending...' : 'SMS'}
                            </span>
                        </button>

                        <button
                            onClick={() => handleSend('email')}
                            disabled={!!sending || isUploading}
                            className="flex flex-col items-center justify-center gap-2 p-4 border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                        >
                            <MessageSquare className="text-purple-600 dark:text-purple-400" size={24} />
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                                {sending === 'email' ? 'Sending...' : 'Email'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
