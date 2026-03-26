import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2,
  MapPin, Phone, Building, Briefcase,
  X, Image as ImageIcon, Type
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Advocate, getAdvocates, deleteAdvocate } from '../api';
import { toast } from 'sonner';
import { AdvocatesModal } from './AdvocatesModal';

export function AdvocateRegistry() {
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvocateId, setEditingAdvocateId] = useState<string | null>(null);

  const loadAdvocates = async () => {
    try {
      const data = await getAdvocates();
      setAdvocates(data);
    } catch (e) {
      toast.error("Failed to load advocates");
    }
  };

  useEffect(() => { loadAdvocates(); }, []);

  const filteredAdvocates = advocates.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.companyName && a.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEdit = (advocate: Advocate) => {
    // Note: We'll use the AdvocatesModal directly by setting it to the editing state
    // For now, AdvocateRegistry will just serve as a list view.
    // The actual "Edit" logic will be handled by AdvocatesModal.
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this advocate?")) {
      try {
        await deleteAdvocate(id);
        toast.success("Advocate deleted");
        loadAdvocates();
      } catch (e) {
        toast.error("Delete failed");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar Matching Image 5 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Advocates</h2>
          <div className="flex items-center gap-4 w-full max-w-2xl justify-end">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-gray-50 dark:bg-gray-900 border-gray-200"
              />
            </div>
            <Button
              onClick={() => {
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 h-11 px-6 rounded-xl"
            >
              <Plus className="w-5 h-5" />
              Create Advocate
            </Button>
          </div>
        </div>
      </div>

      {/* Grid View Matching Image 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdvocates.map((advocate) => (
          <Card key={advocate.id} className="p-6 bg-white dark:bg-gray-800 relative group overflow-hidden border-none shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 hover:shadow-md transition-all">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${advocate.companyName ? 'bg-emerald-500' : 'bg-blue-500'
              }`} />

            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {advocate.name}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    Phone: <span className="text-gray-900 dark:text-gray-300">{advocate.phone}</span>
                  </p>
                  {advocate.companyName && (
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Building className="w-3 h-3" /> {advocate.companyName}
                    </p>
                  )}
                  {advocate.city && (
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> {advocate.city}, {advocate.state}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingAdvocateId(advocate.id);
                  setIsModalOpen(true);
                }}
                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit Advocate"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => handleDelete(advocate.id)}
              className="absolute bottom-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>

      <AdvocatesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAdvocateId(null);
          loadAdvocates();
        }}
        initialEditingId={editingAdvocateId}
        initialView='form'
      />
    </div>
  );
}
