import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getLenders, saveLender, deleteLender, Lender, getNoticeTypes, createNoticeType, deleteNoticeType, NoticeType } from '../api';
import { User, Phone, MapPin, Mail, Trash2, Plus, Building, ArrowLeft, FileText, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

interface LenderRegistryProps {
    onBack?: () => void;
}

type SettingsTab = 'lenders' | 'noticeTypes';

export const LenderRegistry: React.FC<LenderRegistryProps> = ({ onBack }) => {
    const [activeSection, setActiveSection] = useState<SettingsTab>('lenders');
    const [lenders, setLenders] = useState<Lender[]>([]);
    const [noticeTypes, setNoticeTypes] = useState<NoticeType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingLender, setEditingLender] = useState<Partial<Lender> | null>(null);
    const [editingNoticeType, setEditingNoticeType] = useState<Partial<NoticeType> | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [lenderData, typeData] = await Promise.all([
                getLenders(),
                getNoticeTypes()
            ]);
            setLenders(lenderData);
            setNoticeTypes(typeData);
        } catch (error) {
            toast.error("Failed to load settings data");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLender = async () => {
        if (!editingLender?.name) {
            toast.error("Lender name is required");
            return;
        }
        try {
            await saveLender(editingLender);
            toast.success("Lender profile saved");
            setEditingLender(null);
            loadData();
        } catch (error) {
            toast.error("Failed to save lender");
        }
    };

    const handleDeleteLender = async (id: string) => {
        if (confirm("Are you sure you want to delete this lender?")) {
            await deleteLender(id);
            toast.success("Lender deleted");
            loadData();
        }
    };

    const handleSaveNoticeType = async () => {
        if (!editingNoticeType?.title || !editingNoticeType?.id) {
            toast.error("Title and ID are required");
            return;
        }
        try {
            await createNoticeType(editingNoticeType);
            toast.success("Notice type saved");
            setEditingNoticeType(null);
            loadData();
        } catch (error) {
            toast.error("Failed to save notice type");
        }
    };

    const handleDeleteNoticeType = async (id: string) => {
        if (confirm("Are you sure you want to delete this notice type?")) {
            await deleteNoticeType(id);
            toast.success("Notice type deleted");
            loadData();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-4">
                {onBack && (
                     <Button variant="ghost" onClick={onBack} className="w-fit p-0 h-auto hover:bg-transparent text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Themes
                    </Button>
                )}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">System Settings</h2>
                        <p className="text-gray-600 dark:text-gray-400">Manage institution profiles and global notice configurations.</p>
                    </div>
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <Button 
                            variant={activeSection === 'lenders' ? 'default' : 'ghost'}
                            onClick={() => setActiveSection('lenders')}
                            className={`rounded-lg px-4 h-9 text-sm font-semibold transition-all ${activeSection === 'lenders' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : ''}`}
                        >
                            Lenders
                        </Button>
                        <Button 
                            variant={activeSection === 'noticeTypes' ? 'default' : 'ghost'}
                            onClick={() => setActiveSection('noticeTypes')}
                            className={`rounded-lg px-4 h-9 text-sm font-semibold transition-all ${activeSection === 'noticeTypes' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : ''}`}
                        >
                            Notice Types
                        </Button>
                    </div>
                </div>
            </header>

            {activeSection === 'lenders' ? (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => setEditingLender({ name: '', address: '', phone: '', email: '' })} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-xl h-11 px-6">
                            <Plus className="mr-2 h-4 w-4" /> Add Lender
                        </Button>
                    </div>

                    {editingLender && (
                        <Card className="border-blue-200/50 bg-blue-50/30 dark:bg-blue-900/10">
                            <CardHeader>
                                <CardTitle>{editingLender.id ? 'Edit Lender' : 'New Lender Profile'}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Institution Name</Label>
                                        <Input 
                                            value={editingLender.name} 
                                            onChange={e => setEditingLender({...editingLender, name: e.target.value})}
                                            placeholder="e.g. State Bank of India"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contact Phone</Label>
                                        <Input 
                                            value={editingLender.phone} 
                                            onChange={e => setEditingLender({...editingLender, phone: e.target.value})}
                                            placeholder="+91..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input 
                                        value={editingLender.email} 
                                        onChange={e => setEditingLender({...editingLender, email: e.target.value})}
                                        placeholder="contact@bank.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Registered Office Address</Label>
                                    <textarea 
                                        className="w-full min-h-[80px] p-2 rounded-md border bg-background"
                                        value={editingLender.address} 
                                        onChange={e => setEditingLender({...editingLender, address: e.target.value})}
                                        placeholder="Full mailing address..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <Button variant="outline" onClick={() => setEditingLender(null)}>Cancel</Button>
                                    <Button onClick={handleSaveLender} className="bg-blue-600 text-white">Save Profile</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lenders.map(lender => (
                            <Card key={lender.id} className="group hover:border-blue-500/50 transition-colors">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                            <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <CardTitle className="text-lg">{lender.name}</CardTitle>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                                        onClick={() => handleDeleteLender(lender.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-start gap-2 text-gray-500">
                                        <MapPin className="h-4 w-4 mt-0.5" />
                                        <span className="line-clamp-2">{lender.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Phone className="h-4 w-4" />
                                        <span>{lender.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Mail className="h-4 w-4" />
                                        <span>{lender.email}</span>
                                    </div>
                                    <Button 
                                        variant="secondary" 
                                        className="w-full mt-2"
                                        onClick={() => setEditingLender(lender)}
                                    >
                                        Edit Profile
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => setEditingNoticeType({ id: '', title: '', description: '' })} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-xl h-11 px-6">
                            <Plus className="mr-2 h-4 w-4" /> Add Notice Type
                        </Button>
                    </div>

                    {editingNoticeType && (
                        <Card className="border-blue-200/50 bg-blue-50/30 dark:bg-blue-900/10">
                            <CardHeader>
                                <CardTitle>{editingNoticeType.id ? 'Edit Notice Type' : 'New Notice Type'}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type ID (Slug)</Label>
                                        <Input 
                                            value={editingNoticeType.id} 
                                            onChange={e => setEditingNoticeType({...editingNoticeType, id: e.target.value})}
                                            placeholder="e.g. LRN"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Display Title</Label>
                                        <Input 
                                            value={editingNoticeType.title} 
                                            onChange={e => setEditingNoticeType({...editingNoticeType, title: e.target.value})}
                                            placeholder="e.g. Legal Recovery Notice"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <textarea 
                                        className="w-full min-h-[80px] p-2 rounded-md border bg-background"
                                        value={editingNoticeType.description} 
                                        onChange={e => setEditingNoticeType({...editingNoticeType, description: e.target.value})}
                                        placeholder="Purpose of this notice type..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <Button variant="outline" onClick={() => setEditingNoticeType(null)}>Cancel</Button>
                                    <Button onClick={handleSaveNoticeType} className="bg-blue-600 text-white">Save Type</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {noticeTypes.map(type => (
                            <Card key={type.id} className="group hover:border-blue-500/50 transition-colors">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{type.title}</CardTitle>
                                            <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-blue-600">{type.id}</code>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                                        onClick={() => handleDeleteNoticeType(type.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <p className="text-gray-500 line-clamp-3 min-h-[60px]">
                                        {type.description}
                                    </p>
                                    <Button 
                                        variant="secondary" 
                                        className="w-full mt-2"
                                        onClick={() => setEditingNoticeType(type)}
                                    >
                                        Edit Details
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
            {loading && (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading settings...</p>
                </div>
            )}
        </div>
    );
};
