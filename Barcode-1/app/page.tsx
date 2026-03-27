"use client"

import * as React from "react"
import { BarcodeTable, type BarcodeItem } from "@/components/barcode-table"
import { BarcodeStats } from "@/components/barcode-stats"
import { Upload, Trash2, RotateCcw, Edit2 } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

// Initial state now empty, fetched from API
const initialBarcodes: BarcodeItem[] = []

interface UserContext {
  role: 'admin' | 'lender';
  lenderName?: string;
}

export default function BarcodePage() {
  const [userContext, setUserContext] = React.useState<UserContext>({ role: 'admin' })
  const [barcodes, setBarcodes] = React.useState<BarcodeItem[]>([])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)
  const [isUsedLendersDialogOpen, setIsUsedLendersDialogOpen] = React.useState(false)
  const [isEditLenderDialogOpen, setIsEditLenderDialogOpen] = React.useState(false)
  const [isResetLenderDialogOpen, setIsResetLenderDialogOpen] = React.useState(false)
  const [lenderToReset, setLenderToReset] = React.useState("")
  const [resetConfirmationNumber, setResetConfirmationNumber] = React.useState("")
  const [editingOldLenderName, setEditingOldLenderName] = React.useState("")
  const [editingNewLenderName, setEditingNewLenderName] = React.useState("")
  const [uploadPreview, setUploadPreview] = React.useState<BarcodeItem[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch barcodes on mount and listen for reload requests
  React.useEffect(() => {
    fetchBarcodes()

    // 1. Listen for window messages (if used as iframe)
    const handleMessage = (event: MessageEvent) => {
      if ((event.data?.type === 'APP_RELOAD' || event.data?.type === 'RELOAD_APP') && event.data?.appId === 'barcode') {
        fetchBarcodes()
      } else if (event.data?.type === 'USER_CONTEXT') {
        setUserContext({
          role: event.data.role,
          lenderName: event.data.lenderName
        });
      }
    }

    // 2. Listen for BroadcastChannel (for cross-tab sync)
    const bc = new BroadcastChannel('barcode_sync');
    bc.onmessage = (event) => {
      if (event.data === 'refresh') {
        console.log("BroadcastChannel: Refreshing barcodes...");
        fetchBarcodes();
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request context from parent in case it was already sent
    window.parent.postMessage({ type: 'GET_USER_CONTEXT' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
      bc.close();
    };
  }, [])

  const fetchBarcodes = async () => {
    try {
      const res = await fetch('/api/barcodes')
      const data = await res.json()
      if (Array.isArray(data.barcodes)) { // Check if wrapped response or direct array
        setBarcodes(data.barcodes)
      } else if (Array.isArray(data)) {
        setBarcodes(data)
      }
    } catch (error) {
      console.error("Failed to fetch barcodes", error)
    }
  }

  const parseCSV = (csvText: string): BarcodeItem[] => {
    const lines = csvText.trim().split("\n")
    if (lines.length < 2) return []

    // Parse header to find column indices
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))
    const barcodeIndex = header.findIndex((h) => h.includes("barcode") || h.includes("code"))
    const phoneIndex = header.findIndex((h) => h.includes("phone") || h.includes("customer"))
    const bankIndex = header.findIndex((h) => h.includes("lender") || h.includes("bank"))
    const lanIndex = header.findIndex((h) => h.includes("lan") || h.includes("loan"))
    const dateIndex = header.findIndex((h) => h.includes("date") || h.includes("created"))

    if (barcodeIndex === -1) return []

    const newBarcodes: BarcodeItem[] = []
    const existingCodes = new Set(barcodes.map((b) => b.code))
    let nextId = barcodes.length + 1

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
      const code = values[barcodeIndex] || ""

      if (!code || existingCodes.has(code)) continue

      const lenderName = phoneIndex !== -1 ? values[phoneIndex] || "" : ""
      const bankName = bankIndex !== -1 ? values[bankIndex] || "" : ""
      const lan = lanIndex !== -1 ? values[lanIndex] || "" : ""
      const createdAt = dateIndex !== -1 ? values[dateIndex] || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

      newBarcodes.push({
        id: String(nextId++),
        code,
        lenderName,
        bankName,
        lan,
        createdAt,
        isUsed: lenderName.trim() !== "" || bankName.trim() !== "",
      })
      existingCodes.add(code)
    }

    return newBarcodes
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csvText = event.target?.result as string
      const parsedBarcodes = parseCSV(csvText)
      setUploadPreview(parsedBarcodes)
      setIsUploadDialogOpen(true)
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleConfirmUpload = async () => {
    if (uploadPreview.length > 0) {
      // POST to API
      try {
        await fetch('/api/barcodes', {
          method: 'POST',
          body: JSON.stringify({
            action: 'add',
            newBarcodes: uploadPreview
          })
        })
        fetchBarcodes() // Refresh
      } catch (e) {
        console.error("Upload failed", e)
      }
      setUploadPreview([])
      setIsUploadDialogOpen(false)
    }
  }

  const displayBarcodes = React.useMemo(() => {
    if (userContext.role === 'lender' && userContext.lenderName) {
      return barcodes.filter(b => b.bankName === userContext.lenderName);
    }
    return barcodes;
  }, [barcodes, userContext]);

  const stats = React.useMemo(() => {
    const total = displayBarcodes.length
    const used = displayBarcodes.filter((b) => b.isUsed).length
    const available = total - used
    return { total, used, available }
  }, [displayBarcodes])

  const usedLendersStats = React.useMemo(() => {
    const usedBarcodes = displayBarcodes.filter(b => b.isUsed);
    const lenderMap = new Map<string, number>();

    usedBarcodes.forEach(b => {
      const lenderName = b.bankName && b.bankName.trim() !== "" ? b.bankName : "Unknown Lender";
      lenderMap.set(lenderName, (lenderMap.get(lenderName) || 0) + 1);
    });

    return Array.from(lenderMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [displayBarcodes]);

  const handleMarkAsUsed = async (count: number, lenderName: string, lan: string, bankName: string) => {
    // Get all available (unused) barcodes
    const availableBarcodes = barcodes.filter((b) => !b.isUsed)
    // Select the first 'count' available barcodes to mark as used
    const barcodesToMark = availableBarcodes.slice(0, count)

    // Batch update via API
    try {
      const updates = barcodesToMark.map(b => ({ id: b.id, lenderName, lan, bankName }))
      await fetch('/api/barcodes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'markUsed',
          updates
        })
      })
      fetchBarcodes();
    } catch (e) {
      console.error("Batch update failed", e)
    }
    setSelectedIds(new Set())
  }

  const handleMarkSingleAsUsed = async (id: string, lenderName: string, lan: string, bankName: string) => {
    try {
      await fetch('/api/barcodes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'markUsed',
          barcodeId: id,
          lenderName,
          lan,
          bankName
        })
      })
      fetchBarcodes()
    } catch (e) { console.error("Update failed", e) }

    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }

  const handleResetBarcode = async (id: string) => {
    try {
      await fetch('/api/barcodes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset',
          barcodeId: id
        })
      })
      fetchBarcodes()
    } catch (e) { console.error("Reset failed", e) }
  }

  const handleResetComplete = async (id: string) => {
    try {
      await fetch('/api/barcodes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'completeReset',
          barcodeId: id
        })
      })
      fetchBarcodes()
      toast.success("Barcode reset successfully. It has been moved to the Available list.")
    } catch (e) {
      console.error("Reset completion failed", e)
    }
  }

  const handleCancelReset = async (id: string) => {
    try {
      await fetch('/api/barcodes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'cancelReset',
          barcodeId: id
        })
      })
      fetchBarcodes()
    } catch (e) {
      console.error("Reset cancellation failed", e)
    }
  }

  const handleResetByLenderClick = (lenderName: string) => {
    setLenderToReset(lenderName)
    setResetConfirmationNumber("")
    setIsResetLenderDialogOpen(true)
  }

  const handleResetByLenderConfirm = async () => {
    try {
      await fetch('/api/barcodes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resetByLender',
          targetLender: lenderToReset
        })
      })
      fetchBarcodes()
      toast.success(`Successfully reset all barcodes for ${lenderToReset}`)
      setIsResetLenderDialogOpen(false)
      setResetConfirmationNumber("")
      
      // Broadcast sync
      const bc = new BroadcastChannel('barcode_sync');
      bc.postMessage('refresh');
      bc.close();
    } catch (e) {
      console.error("Reset by lender failed", e)
      toast.error("Failed to reset barcodes")
    }
  }

  const handleEditLenderClick = (oldName: string) => {
    setEditingOldLenderName(oldName)
    setEditingNewLenderName(oldName === 'Unknown Lender' ? '' : oldName)
    setIsEditLenderDialogOpen(true)
  }

  const handleEditLenderSubmit = async () => {
    if (!editingNewLenderName.trim() || editingNewLenderName === editingOldLenderName) return;
    try {
      await fetch('/api/barcodes', {
        method: 'POST',
        body: JSON.stringify({
          action: 'editLenderName',
          oldLenderName: editingOldLenderName,
          newLenderName: editingNewLenderName.trim()
        })
      })
      fetchBarcodes()
      toast.success(`Successfully updated lender name to ${editingNewLenderName.trim()}`)
      setIsEditLenderDialogOpen(false)
      
      const bc = new BroadcastChannel('barcode_sync');
      bc.postMessage('refresh');
      bc.close();
    } catch (e) {
      console.error("Edit lender name failed", e)
      toast.error("Failed to update lender name")
    }
  }

  const downloadLenderCSV = (lenderName: string) => {
    const lenderBarcodes = barcodes.filter(b => 
      b.isUsed && (b.bankName === lenderName || (!b.bankName && lenderName === "Unknown Lender"))
    );

    const headers = ["Barcode", "LAN", "Lender Name", "Customer Phone Number", "Used Date"];
    const rows = lenderBarcodes.map(b => [
      b.code,
      b.lan || "",
      b.bankName || "Unknown Lender",
      b.lenderName || "",
      b.usedAt || b.createdAt || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `barcodes_${lenderName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col gap-6">
          {userContext.role === 'admin' && (
            <div className="flex justify-end">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                id="csv-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-md text-gray-700 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-700"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          )}

          <BarcodeStats
            total={stats.total}
            used={stats.used}
            available={stats.available}
            onUsedClick={() => setIsUsedLendersDialogOpen(true)}
          />

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white">
              Barcode Inventory
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select unused barcodes to mark them as used. Used barcodes cannot
              be selected.
            </p>
          </div>

          <BarcodeTable
            barcodes={displayBarcodes}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onMarkAsUsed={handleMarkAsUsed}
            onMarkSingleAsUsed={handleMarkSingleAsUsed}
            onResetBarcode={handleResetBarcode}
            onResetComplete={handleResetComplete}
            onCancelReset={handleCancelReset}
            userRole={userContext.role}
          />
        </div>
      </main>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Barcodes</DialogTitle>
            <DialogDescription>
              Preview the barcodes to be imported from your CSV file.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {uploadPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No valid barcodes found in the CSV file. Make sure it has a column named &quot;Barcode&quot; or &quot;Code&quot;.
              </p>
            ) : (
              <>
                <div className="text-sm text-muted-foreground dark:text-gray-300">
                  Found {uploadPreview.length} new barcode(s):
                  <ul className="mt-2 list-disc list-inside text-gray-600 dark:text-gray-400">
                    <li>{uploadPreview.filter((b) => b.isUsed).length} with customer phone number (will be marked as Used)</li>
                    <li>{uploadPreview.filter((b) => !b.isUsed).length} without customer phone number (will be marked as Available)</li>
                  </ul>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 dark:bg-gray-800/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Barcode</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Lender Name</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Customer Phone Number</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreview.map((b) => (
                        <tr key={b.id} className="border-t border-border dark:border-gray-700">
                          <td className="px-3 py-2 font-mono dark:text-gray-300">{b.code}</td>
                          <td className="px-3 py-2 text-muted-foreground dark:text-gray-400">{b.bankName || "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground dark:text-gray-400">{b.lenderName || "-"}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${b.isUsed ? "bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-300" : "bg-success/20 dark:bg-green-900/40 text-success dark:text-green-400"}`}>
                              {b.isUsed ? "Used" : "Available"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false)
                setUploadPreview([])
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={uploadPreview.length === 0}
            >
              Import {uploadPreview.length} Barcode(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUsedLendersDialogOpen} onOpenChange={setIsUsedLendersDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Used Barcodes by Lender</DialogTitle>
            <DialogDescription>
              Breakdown of how many barcodes each lender has used.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {usedLendersStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No barcodes have been used yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 dark:bg-gray-800/50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Lender Name</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Used Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usedLendersStats.map((lender) => (
                      <tr 
                        key={lender.name} 
                        className="border-t border-border dark:border-gray-700 hover:bg-muted/30 dark:hover:bg-gray-800/30 group"
                      >
                        <td 
                          className="px-4 py-3 font-medium dark:text-gray-300 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => downloadLenderCSV(lender.name)}
                          title={`Download CSV for ${lender.name}`}
                        >
                          <div className="flex items-center gap-2">
                            {lender.name}
                            <Upload className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="inline-flex items-center justify-center bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-medium">
                              {lender.count.toLocaleString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-600/10"
                              onClick={(e) => { e.stopPropagation(); handleEditLenderClick(lender.name); }}
                              title={`Edit name for ${lender.name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleResetByLenderClick(lender.name)}
                              title={`Reset all barcodes for ${lender.name}`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsUsedLendersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditLenderDialogOpen} onOpenChange={setIsEditLenderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lender Name</DialogTitle>
            <DialogDescription>
              Rename "{editingOldLenderName}" across all used barcodes. This action affects all {usedLendersStats.find(l => l.name === editingOldLenderName)?.count} barcodes instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="new-lender-name">New Lender Name</Label>
              <Input
                id="new-lender-name"
                autoFocus
                value={editingNewLenderName}
                onChange={(e) => setEditingNewLenderName(e.target.value)}
                placeholder="Enter correct lender name"
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditLenderDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditLenderSubmit} 
              disabled={!editingNewLenderName.trim() || editingNewLenderName === editingOldLenderName}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetLenderDialogOpen} onOpenChange={(open) => {
        setIsResetLenderDialogOpen(open);
        if (!open) setResetConfirmationNumber("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset All Barcodes</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset ALL barcodes assigned to <strong>"{lenderToReset}"</strong>? 
              <br /><br />
              This will move {usedLendersStats.find(l => l.name === lenderToReset)?.count || 0} barcodes back to the "Available" pool. <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-confirm" className="text-destructive font-medium">
                Type <strong>{usedLendersStats.find(l => l.name === lenderToReset)?.count || 0}</strong> to confirm
              </Label>
              <Input
                id="reset-confirm"
                type="text"
                value={resetConfirmationNumber}
                onChange={(e) => setResetConfirmationNumber(e.target.value)}
                placeholder={`Type ${usedLendersStats.find(l => l.name === lenderToReset)?.count || 0}`}
                className="bg-secondary border-destructive/30 focus-visible:ring-destructive focus-visible:border-destructive"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setIsResetLenderDialogOpen(false)
              setResetConfirmationNumber("")
            }}>Cancel</Button>
            <Button 
              onClick={handleResetByLenderConfirm} 
              disabled={resetConfirmationNumber !== String(usedLendersStats.find(l => l.name === lenderToReset)?.count || 0)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Yes, Reset All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
