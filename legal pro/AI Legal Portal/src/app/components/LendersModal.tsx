import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "./ui/dialog";
import { LenderRegistry } from "./LenderRegistry";

interface LendersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LendersModal({ isOpen, onClose }: LendersModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) onClose();
        }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <LenderRegistry />
            </DialogContent>
        </Dialog>
    );
}
