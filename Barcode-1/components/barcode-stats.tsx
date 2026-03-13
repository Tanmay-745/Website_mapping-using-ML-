"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Barcode, CheckCircle2, XCircle, Percent, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface BarcodeStatsProps {
  total: number
  used: number
  available: number
  onUsedClick?: () => void
}

export function BarcodeStats({ total, used, available, onUsedClick }: BarcodeStatsProps) {
  const usageRate = total > 0 ? Math.round((used / total) * 100) : 0

  const stats = [
    {
      label: "Total Barcodes",
      value: total.toLocaleString(),
      icon: Barcode,
      color: "text-foreground",
    },
    {
      label: "Available",
      value: available.toLocaleString(),
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      label: "Used",
      value: used.toLocaleString(),
      icon: XCircle,
      color: "text-muted-foreground",
      onClick: onUsedClick,
    },
    {
      label: "Usage Rate",
      value: `${usageRate}%`,
      icon: Percent,
      color: "text-warning",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`bg-white/70 dark:bg-gray-800/80 backdrop-blur-md border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 ${stat.onClick ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : ""
              }`}
            onClick={stat.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color} dark:text-white`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-white/50 dark:bg-gray-700/50 ${stat.color.replace('text-', 'text-opacity-80 ')}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {usageRate >= 90 && (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 backdrop-blur-md shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold tracking-wide">Warning: High Barcode Usage!</AlertTitle>
          <AlertDescription className="text-destructive/90 mt-1.5 flex items-center justify-between">
            <span>You have used {usageRate}% of your available barcodes. Please reset some barcodes or request India Post to provide more barcodes to avoid running out.</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
