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
    initialEditingId?: string | null;
    initialView?: 'list' | 'form';
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep", "Delhi", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

const STATE_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool"],
  "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "Haryana": ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Dharamshala", "Solan"],
  "Jharkhand": ["Jamshedpur", "Dhanbad", "Ranchi", "Bokaro Steel City"],
  "Karnataka": ["Bangalore", "Hubli-Dharwad", "Mysore", "Gulbarga", "Belgaum"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Pimpri-Chinchwad", "Nashik", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Navi Mumbai"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Dimapur", "Kohima", "Tuensang"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj", "Bareilly", "Noida"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani"],
  "West Bengal": ["Kolkata", "Howrah", "Asansol", "Siliguri", "Durgapur"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Silvassa"],
  "Lakshadweep": ["Kavaratti"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Ladakh": ["Leh", "Kargil"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"]
};

export function AdvocatesModal({ 
  isOpen, 
  onClose, 
  initialEditingId = null,
  initialView = 'list'
}: AdvocatesModalProps) {
  const [view, setView] = useState<'list' | 'form'>(initialView);
    const [searchQuery, setSearchQuery] = useState("");
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const [advocates, setAdvocates] = useState<Advocate[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(initialEditingId);

    useEffect(() => {
        if (isOpen) {
            loadAdvocates();
            setView(initialView);
            setEditingId(initialEditingId);
        }
    }, [isOpen, initialView, initialEditingId]);

    useEffect(() => {
        if (isOpen && editingId && advocates.length > 0) {
            const advocate = advocates.find(a => a.id === editingId);
            if (advocate) {
                // Populate form without changing view (view is handled by the other effect)
                setFormData({
                    name: advocate.name,
                    phone: advocate.phone,
                    companyName: advocate.companyName || "",
                    city: advocate.city || "",
                    pincode: advocate.pincode || "",
                    state: advocate.state || "",
                    address: advocate.address || "",
                    bio: advocate.bio || "",
                    headerHtml: advocate.headerHtml || "",
                    signature: null,
                });
                setSignaturePreview(advocate.signature || null);
            }
        }
    }, [isOpen, editingId, advocates]);

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
        pincode: "",
        state: "",
        address: "",
        bio: "", // Rich text content/Bio
        headerHtml: "", // Custom HTML for PDF header
        signature: null as File | null,
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            let signatureBase64 = editingId ? (advocates.find(a => String(a.id) === String(editingId))?.signature || "") : "";

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
                pincode: formData.pincode,
                state: formData.state,
                address: formData.address,
                bio: formData.bio,
                headerHtml: formData.headerHtml,
                signature: signatureBase64
            } as Advocate;

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
            pincode: "",
            state: "",
            address: "",
            bio: "",
            headerHtml: "",
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
            companyName: advocate.companyName || "",
            city: advocate.city || "",
            pincode: advocate.pincode || "",
            state: advocate.state || "",
            address: advocate.address || "",
            bio: advocate.bio || "",
            headerHtml: advocate.headerHtml || "",
            signature: null, // File input can't be pre-filled
        });
        setSignaturePreview(advocate.signature || null);
        setEditingId(advocate.id || null);
        setView('form');
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this advocate?")) {
            try {
                await deleteAdvocate(id);
                loadAdvocates();
                toast.success("Advocate deleted successfully");
            } catch (error) {
                console.error("Failed to delete advocate", error);
                toast.error("Failed to delete advocate");
            }
        }
    };

    const filteredAdvocates = advocates.filter(adv =>
        adv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (adv.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
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
                                            setView('form');
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
                                <Select
                                    value={formData.city}
                                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                                    disabled={!formData.state}
                                >
                                    <SelectTrigger id="city">
                                        <SelectValue placeholder={formData.state ? "Select City" : "First Select State"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(STATE_CITIES[INDIAN_STATES.find(s => s.toLowerCase().replace(/\s+/g, '') === formData.state) || ""] || []).map((city) => (
                                            <SelectItem key={city} value={city}>
                                                {city}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pincode">PinCode *</Label>
                                <Input
                                    id="pincode"
                                    placeholder="Enter pincode"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">Select State</Label>
                                <Select
                                    value={formData.state}
                                    onValueChange={(value) => setFormData({ ...formData, state: value, city: "" })}
                                >
                                    <SelectTrigger id="state">
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INDIAN_STATES.map((state) => (
                                            <SelectItem key={state} value={state.toLowerCase().replace(/\s+/g, '')}>
                                                {state}
                                            </SelectItem>
                                        ))}
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
                            <p className="text-xs text-gray-500">Note: Images height should be less than 150px (This appears in some templates)</p>
                            <div className="h-[200px] overflow-hidden rounded-md border border-input">
                                <TemplateEditor
                                    content={formData.bio}
                                    onChange={(content) => setFormData(prev => ({ ...prev, bio: content }))}
                                    variables={[]}
                                    onInsertVariable={() => { }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="headerHtml">Notice Header (HTML)</Label>
                            <p className="text-xs text-gray-500">Custom HTML for the top of the PDF notice</p>
                            <Textarea
                                id="headerHtml"
                                placeholder="&lt;div style='text-align: center'&gt;...&lt;/div&gt;"
                                className="min-h-[100px] font-mono text-xs"
                                value={formData.headerHtml}
                                onChange={(e) => setFormData({ ...formData, headerHtml: e.target.value })}
                            />
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
