import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Plus, User, FileText, Phone, MapPin, Pencil, Trash } from "lucide-react";
import { Label } from "./ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { TemplateEditor } from "./TemplateEditor";
import { getAdvocates, saveAdvocate, deleteAdvocate, Advocate } from "../api";

interface AdvocatesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AdvocatesModal({ isOpen, onClose }: AdvocatesModalProps) {
    const [view, setView] = useState<'list' | 'create'>('list');
    const [searchQuery, setSearchQuery] = useState("");
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const [advocates, setAdvocates] = useState<Advocate[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadAdvocates();
        }
    }, [isOpen]);

    const loadAdvocates = async () => {
        try {
            const data = await getAdvocates();
            console.log("Loaded advocates:", data);
            setAdvocates(data);
        } catch (error) {
            console.error("Failed to load advocates", error);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        companyName: "",
        city: "",
        pinCode: "",
        state: "",
        address: "",
        bio: "", // Rich text content
        signature: null as File | null,
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            let signatureBase64 = editingId ? (advocates.find(a => a.id === editingId)?.signature || "") : "";

            // If a new file is selected, override the existing signature
            if (formData.signature) {
                signatureBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(formData.signature as File);
                });
            } else if (signaturePreview === null && editingId) {
                // If preview is cleared explicitly, remove signature
                signatureBase64 = "";
            }

            const newAdvocate: Advocate = {
                id: editingId || undefined,
                name: formData.name,
                phone: formData.phone,
                companyName: formData.companyName,
                city: formData.city,
                pinCode: formData.pinCode,
                state: formData.state,
                address: formData.address,
                bio: formData.bio,
                signature: signatureBase64
            };

            await saveAdvocate(newAdvocate);
            await loadAdvocates();

            resetForm();
            setView('list');
        } catch (error) {
            console.error("Failed to save advocate", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            phone: "",
            companyName: "",
            city: "",
            pinCode: "",
            state: "",
            address: "",
            bio: "",
            signature: null,
        });
        setSignaturePreview(null);
        setEditingId(null);
    };

    const handleCancel = () => {
        resetForm();
        setView('list');
    };

    const handleEdit = (advocate: Advocate) => {
        setFormData({
            name: advocate.name,
            phone: advocate.phone,
            companyName: advocate.companyName,
            city: advocate.city,
            pinCode: advocate.pinCode,
            state: advocate.state,
            address: advocate.address,
            bio: advocate.bio,
            signature: null, // File input can't be pre-filled
        });
        setSignaturePreview(advocate.signature || null);
        setEditingId(advocate.id || null);
        setView('create');
    };

    const handleDelete = async (id: string) => {
        console.log("Attempting to delete advocate with ID:", id);
        if (window.confirm("Are you sure you want to delete this advocate?")) {
            // Optimistic update
            setAdvocates(prev => prev.filter(adv => adv.id !== id));

            try {
                await deleteAdvocate(id);
                // Silent reload to ensure consistency
                loadAdvocates();
                toast.success("Advocate deleted successfully");
            } catch (error) {
                console.error("Failed to delete advocate", error);
                alert("Failed to delete: " + (error as Error).message); // Use alert for visibility
                await loadAdvocates(); // Revert on error
                toast.error("Failed to delete advocate");
            }
        }
    };

    const filteredAdvocates = advocates.filter(adv =>
        adv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adv.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setView('list');
                resetForm();
            }
            onClose();
        }}>
            <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                {view === 'list' ? (
                    <>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 pr-8">
                                <DialogTitle className="text-xl font-bold text-gray-800">Advocates</DialogTitle>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Search by name"
                                            className="pl-9 h-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-green-700 hover:bg-green-800 text-white gap-2 whitespace-nowrap"
                                        onClick={() => {
                                            resetForm();
                                            setView('create');
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Advocate
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {filteredAdvocates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredAdvocates.map((adv) => (
                                    <div
                                        key={adv.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative bg-white hover:bg-gray-50 cursor-pointer group"
                                        onClick={() => handleEdit(adv)}
                                    >
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(adv);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log("Delete clicked for:", adv);
                                                    if (adv.id) {
                                                        handleDelete(adv.id);
                                                    } else {
                                                        console.error("Advocate has no ID:", adv);
                                                        toast.error("Cannot delete: Advocate ID is missing");
                                                    }
                                                }}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-start justify-between mb-2 pr-8">
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-900">{adv.name}</h3>
                                                <p className="text-sm text-gray-500">{adv.companyName}</p>
                                            </div>
                                            <div className="bg-gray-100 p-2 rounded-full">
                                                <User className="w-4 h-4 text-gray-600" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3 h-3" />
                                                <span>{adv.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3 h-3" />
                                                <span>{adv.city}, {adv.state}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="min-h-[200px] flex flex-col items-center justify-center text-gray-500">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <User className="w-8 h-8 text-gray-400" />
                                </div>
                                <p>No advocates found</p>
                                <p className="text-sm mt-1">Get started by creating a new advocate.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="border-b border-gray-100 pb-4">
                            <DialogTitle className="text-xl font-bold text-gray-800">
                                {editingId ? "Edit Advocate" : "Create Advocate"}
                            </DialogTitle>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="Enter name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone *</Label>
                                <Input
                                    id="phone"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Company Name *</Label>
                                <Input
                                    id="company"
                                    placeholder="Enter company name"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    placeholder="Enter city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pincode">PinCode *</Label>
                                <Input
                                    id="pincode"
                                    placeholder="Enter pincode"
                                    value={formData.pinCode}
                                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">Select State</Label>
                                <Select
                                    value={formData.state}
                                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                                >
                                    <SelectTrigger id="state">
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="maharashtra">Maharashtra</SelectItem>
                                        <SelectItem value="delhi">Delhi</SelectItem>
                                        <SelectItem value="karnataka">Karnataka</SelectItem>
                                        <SelectItem value="tamilnadu">Tamil Nadu</SelectItem>
                                        {/* Add more states as needed */}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address *</Label>
                            <Textarea
                                id="address"
                                placeholder="Enter full address"
                                className="min-h-[80px]"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Bio / Note</Label>
                            <p className="text-xs text-gray-500">Note: Images height should be less than 150px</p>
                            <div className="h-[300px] overflow-hidden rounded-md border border-input">
                                <TemplateEditor
                                    content={formData.bio}
                                    onChange={(content) => setFormData(prev => ({ ...prev, bio: content }))}
                                    variables={[]}
                                    onInsertVariable={() => { }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Signature (Image)</Label>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Input
                                            type="file"
                                            id="signature"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const url = URL.createObjectURL(file);
                                                    setSignaturePreview(url);
                                                    setFormData({ ...formData, signature: file });
                                                }
                                            }}
                                        />
                                        <Label
                                            htmlFor="signature"
                                            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                        >
                                            Choose file
                                        </Label>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {formData.signature ? (formData.signature as File).name : "No file chosen"}
                                    </span>
                                </div>
                                {signaturePreview && (
                                    <div className="mt-2 border rounded-md p-2 w-fit">
                                        <img
                                            src={signaturePreview}
                                            alt="Signature preview"
                                            className="max-h-32 object-contain"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 h-8 mt-1"
                                            onClick={() => {
                                                setSignaturePreview(null);
                                                setFormData({ ...formData, signature: null });
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={handleCancel}>
                                CANCEL
                            </Button>
                            <Button
                                className="bg-green-700 hover:bg-green-800 text-white"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
