"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, CheckCircle2, XCircle, Barcode, Filter, RotateCcw, Clock, Download } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type StatusFilter = "all" | "available" | "used"

const RESET_COOLDOWN_MS = 60 * 1000 // 1 minute in milliseconds

function ResetCountdown({
  resetAt,
  onComplete,
}: {
  resetAt: number
  onComplete: () => void
}) {
  const [remaining, setRemaining] = React.useState(() => {
    const elapsed = Date.now() - resetAt
    return Math.max(0, RESET_COOLDOWN_MS - elapsed)
  })

  React.useEffect(() => {
    if (remaining <= 0) {
      onComplete()
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - resetAt
      const newRemaining = Math.max(0, RESET_COOLDOWN_MS - elapsed)
      setRemaining(newRemaining)

      if (newRemaining <= 0) {
        onComplete()
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [resetAt, remaining, onComplete])

  const seconds = Math.ceil(remaining / 1000)

  return (
    <Badge
      variant="secondary"
      className="bg-warning/20 text-warning gap-1"
    >
      <Clock className="h-3 w-3" />
      {seconds}s
    </Badge>
  )
}

export interface BarcodeItem {
  id: string
  code: string
  lenderName: string
  bankName?: string
  createdAt: string
  isUsed: boolean
  lan?: string
  usedAt?: string // Date when the barcode was marked as used
  resetAt?: number // Timestamp when reset was initiated
}

interface BarcodeTableProps {
  barcodes: BarcodeItem[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onMarkAsUsed: (count: number, lenderName: string, lan: string, bankName: string) => void
  onMarkSingleAsUsed: (id: string, lenderName: string, lan: string, bankName: string) => void
  onResetBarcode: (id: string) => void
  onResetComplete: (id: string) => void
  onCancelReset: (id: string) => void
  userRole?: 'admin' | 'lender'
}

export function BarcodeTable({
  barcodes,
  selectedIds,
  onSelectionChange,
  onMarkAsUsed,
  onMarkSingleAsUsed,
  onResetBarcode,
  onResetComplete,
  onCancelReset,
  userRole = 'admin',
}: BarcodeTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [markCount, setMarkCount] = React.useState("")
  const [bulkLenderName, setBulkLenderName] = React.useState("")
  const [bulkBankName, setBulkBankName] = React.useState("")
  const [bulkLan, setBulkLan] = React.useState("")
  const [isSingleDialogOpen, setIsSingleDialogOpen] = React.useState(false)
  const [singleBarcodeId, setSingleBarcodeId] = React.useState<string | null>(null)
  const [singleLenderName, setSingleLenderName] = React.useState("")
  const [singleBankName, setSingleBankName] = React.useState("")
  const [singleLan, setSingleLan] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 50

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, barcodes])

  const filteredBarcodes = React.useMemo(() => {
    let filtered = barcodes

    // Apply status filter
    if (statusFilter === "available") {
      filtered = filtered.filter((b) => !b.isUsed)
    } else if (statusFilter === "used") {
      filtered = filtered.filter((b) => b.isUsed)
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.code.toLowerCase().includes(query) ||
          b.lenderName.toLowerCase().includes(query) ||
          (b.bankName && b.bankName.toLowerCase().includes(query)) ||
          (b.lan && b.lan.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [barcodes, searchQuery, statusFilter])

  const paginatedBarcodes = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredBarcodes.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredBarcodes, currentPage])

  const totalPages = Math.ceil(filteredBarcodes.length / itemsPerPage)

  const unusedBarcodes = React.useMemo(
    () => filteredBarcodes.filter((b) => !b.isUsed),
    [filteredBarcodes]
  )

  const allUnusedSelected =
    unusedBarcodes.length > 0 &&
    unusedBarcodes.every((b) => selectedIds.has(b.id))

  const someUnusedSelected =
    unusedBarcodes.some((b) => selectedIds.has(b.id)) && !allUnusedSelected

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelection = new Set(selectedIds)
      unusedBarcodes.forEach((b) => newSelection.add(b.id))
      onSelectionChange(newSelection)
    } else {
      const newSelection = new Set(selectedIds)
      unusedBarcodes.forEach((b) => newSelection.delete(b.id))
      onSelectionChange(newSelection)
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(id)
    } else {
      newSelection.delete(id)
    }
    onSelectionChange(newSelection)
  }

  const handleSingleAvailableClick = (id: string) => {
    setSingleBarcodeId(id)
    setSingleLenderName("")
    setSingleBankName("")
    setSingleLan("")
    setIsSingleDialogOpen(true)
  }

  const handleConfirmSingle = () => {
    if (singleBarcodeId && singleLenderName.trim() && singleBankName.trim()) {
      onMarkSingleAsUsed(singleBarcodeId, singleLenderName.trim(), singleLan.trim(), singleBankName.trim())
      setIsSingleDialogOpen(false)
      setSingleBarcodeId(null)
      setSingleLenderName("")
      setSingleBankName("")
      setSingleLan("")
    }
  }

  const downloadExcel = (barcodesToExport: BarcodeItem[], lenderName: string, lan: string, bankName: string) => {
    // Create CSV content (Excel compatible)
    const headers = ["Barcode", "Lender Name", "Customer Phone Number", "LAN", "Date of Create"]
    const rows = barcodesToExport.map((b) => [
      b.code,
      bankName,
      lenderName,
      lan,
      b.createdAt,
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `barcodes_${bankName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleConfirmBulk = () => {
    const count = Number(markCount)
    if (count > 0 && count <= unusedBarcodes.length && bulkLenderName.trim() && bulkBankName.trim()) {
      // Get the barcodes that will be marked
      const barcodesToMark = unusedBarcodes.slice(0, count)
      // Download Excel first
      downloadExcel(barcodesToMark, bulkLenderName.trim(), bulkLan.trim(), bulkBankName.trim())
      // Then mark as used
      onMarkAsUsed(count, bulkLenderName.trim(), bulkLan.trim(), bulkBankName.trim())
      setIsDialogOpen(false)
      setMarkCount("")
      setBulkLenderName("")
      setBulkBankName("")
      setBulkLan("")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter barcodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary dark:bg-gray-800 border-border dark:border-gray-700 dark:text-white"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[150px] bg-secondary dark:bg-gray-800 border-border dark:border-gray-700 dark:text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="used">Used</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
          <Button
            onClick={() => {
              setMarkCount("")
              setIsDialogOpen(true)
            }}
            disabled={unusedBarcodes.length === 0}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark as Used
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/20 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/80 backdrop-blur-md overflow-hidden shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-white/50 dark:hover:bg-gray-700/50 border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allUnusedSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all unused barcodes"
                  data-state={
                    someUnusedSelected
                      ? "indeterminate"
                      : allUnusedSelected
                        ? "checked"
                        : "unchecked"
                  }
                />
              </TableHead>
              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Barcode</TableHead>
              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Lender Name</TableHead>
              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Customer Phone Number</TableHead>
              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">LAN</TableHead>
              <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Date</TableHead>
              <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBarcodes.map((barcode) => (
              <TableRow
                key={barcode.id}
                className={`border-border dark:border-gray-700/50 ${barcode.isUsed
                  ? "opacity-50 bg-muted/20 dark:bg-gray-800/40"
                  : selectedIds.has(barcode.id)
                    ? "bg-accent/50 dark:bg-gray-700/50"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                data-state={selectedIds.has(barcode.id) ? "selected" : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(barcode.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(barcode.id, !!checked)
                    }
                    disabled={barcode.isUsed}
                    aria-label={`Select barcode ${barcode.code}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                    <code className="font-mono text-sm dark:text-gray-200">{barcode.code}</code>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground dark:text-gray-400">
                  {barcode.isUsed ? barcode.bankName || "-" : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground dark:text-gray-400">
                  {barcode.isUsed ? barcode.lenderName : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground dark:text-gray-400">
                  {barcode.isUsed ? barcode.lan || "-" : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground dark:text-gray-400">
                  {barcode.isUsed ? (barcode.usedAt || barcode.createdAt) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {barcode.isUsed && barcode.resetAt && Date.now() - barcode.resetAt < RESET_COOLDOWN_MS ? (
                    <div className="flex items-center justify-end gap-2">
                      <ResetCountdown
                        resetAt={barcode.resetAt}
                        onComplete={() => onResetComplete(barcode.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full"
                        onClick={() => onCancelReset(barcode.id)}
                        title="Cancel Reset"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    ) : (barcode.isUsed && userRole === 'admin') ? (
                      <button
                        type="button"
                        onClick={() => onResetBarcode(barcode.id)}
                        className="inline-flex items-center"
                      >
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground gap-1 cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </Badge>
                      </button>
                    ) : barcode.isUsed ? (
                       <Badge variant="outline" className="opacity-70">Used</Badge>
                    ) : (
                    <button
                      type="button"
                      onClick={() => handleSingleAvailableClick(barcode.id)}
                      className="inline-flex items-center"
                    >
                      <Badge className="bg-success text-success-foreground gap-1 cursor-pointer hover:bg-success/80 transition-colors">
                        <CheckCircle2 className="h-3 w-3" />
                        Available
                      </Badge>
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredBarcodes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground dark:text-gray-500"
                >
                  No barcodes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/50 mt-2">
        <div className="pl-2">
          Showing {filteredBarcodes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
          {Math.min(currentPage * itemsPerPage, filteredBarcodes.length)} of {filteredBarcodes.length} entries
        </div>
        <div className="flex items-center gap-2 pr-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            Previous
          </Button>
          <div className="px-4 font-medium text-gray-700 dark:text-gray-300">
            Page {currentPage} of {Math.max(1, totalPages)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || totalPages === 0}
            className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Barcodes as Used</DialogTitle>
            <DialogDescription>
              Enter the number of barcodes and customer phone number. An Excel file will be downloaded with the barcode details.
              There are currently {unusedBarcodes.length} available barcodes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="count">Number of barcodes</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max={unusedBarcodes.length}
                value={markCount}
                onChange={(e) => setMarkCount(e.target.value)}
                placeholder={`1 - ${unusedBarcodes.length}`}
                className="bg-secondary border-border"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bulkBankName">Lender Name</Label>
              <Input
                id="bulkBankName"
                type="text"
                value={bulkBankName}
                onChange={(e) => setBulkBankName(e.target.value)}
                placeholder="Enter lender name"
                className="bg-secondary border-border"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bulkLenderName">Customer Phone Number</Label>
              <Input
                id="bulkLenderName"
                type="text"
                value={bulkLenderName}
                onChange={(e) => setBulkLenderName(e.target.value)}
                placeholder="Enter customer phone number"
                className="bg-secondary border-border"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bulkLan">LAN (Loan Account Number)</Label>
              <Input
                id="bulkLan"
                type="text"
                value={bulkLan}
                onChange={(e) => setBulkLan(e.target.value)}
                placeholder="Enter LANs separated by commas"
                className="bg-secondary border-border"
              />
            </div>
            {markCount && Number(markCount) > unusedBarcodes.length && (
              <p className="text-sm text-destructive">
                Cannot exceed {unusedBarcodes.length} available barcodes.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setMarkCount("")
                setBulkLenderName("")
                setBulkBankName("")
                setBulkLan("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulk}
              disabled={
                !markCount ||
                Number(markCount) < 1 ||
                Number(markCount) > unusedBarcodes.length ||
                !bulkLenderName.trim() ||
                !bulkBankName.trim()
              }
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download & Mark Used
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSingleDialogOpen} onOpenChange={setIsSingleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Customer Phone Number</DialogTitle>
            <DialogDescription>
              Enter the customer phone number for this barcode before marking it as used.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="singleBankName">Lender Name</Label>
              <Input
                id="singleBankName"
                type="text"
                value={singleBankName}
                onChange={(e) => setSingleBankName(e.target.value)}
                placeholder="Enter lender name"
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="singleLenderName">Customer Phone Number</Label>
              <Input
                id="singleLenderName"
                type="text"
                value={singleLenderName}
                onChange={(e) => setSingleLenderName(e.target.value)}
                placeholder="Enter customer phone number"
                className="bg-secondary border-border"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="singleLan">LAN (Loan Account Number)</Label>
              <Input
                id="singleLan"
                type="text"
                value={singleLan}
                onChange={(e) => setSingleLan(e.target.value)}
                placeholder="Enter LANs separated by commas"
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsSingleDialogOpen(false)
                setSingleBarcodeId(null)
                setSingleLenderName("")
                setSingleBankName("")
                setSingleLan("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSingle}
              disabled={!singleLenderName.trim() || !singleBankName.trim()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
