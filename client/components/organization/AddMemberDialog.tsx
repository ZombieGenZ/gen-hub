"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus, Mail } from "lucide-react";

interface AddMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (emails: string[]) => Promise<void>;
}

export function AddMemberDialog({
    open,
    onOpenChange,
    onSubmit,
}: AddMemberDialogProps) {
    const [emailInput, setEmailInput] = useState("");
    const [emails, setEmails] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    const addEmail = () => {
        const trimmed = emailInput.trim();
        if (!trimmed) return;
        if (!isValidEmail(trimmed)) {
            setError("Email không hợp lệ");
            return;
        }
        if (emails.includes(trimmed)) {
            setError("Email đã được thêm");
            return;
        }
        setEmails((prev) => [...prev, trimmed]);
        setEmailInput("");
        setError(null);
    };

    const removeEmail = (email: string) => {
        setEmails((prev) => prev.filter((e) => e !== email));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addEmail();
        }
    };

    const handleSubmit = async () => {
        const allEmails = [...emails];
        if (emailInput.trim() && isValidEmail(emailInput.trim())) {
            if (!allEmails.includes(emailInput.trim())) {
                allEmails.push(emailInput.trim());
            }
        }

        if (allEmails.length === 0) {
            setError("Vui lòng nhập ít nhất một email");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await onSubmit(allEmails);
            onOpenChange(false);
            setEmails([]);
            setEmailInput("");
        } catch (err: any) {
            setError(err.message || "Không thể gửi lời mời");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setEmails([]);
            setEmailInput("");
            setError(null);
        }
        onOpenChange(isOpen);
    };

    const pendingCount = emails.length + (emailInput.trim() && isValidEmail(emailInput.trim()) ? 1 : 0);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mời thành viên</DialogTitle>
                    <DialogDescription>
                        Gửi lời mời qua email để thêm thành viên vào tổ chức
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-5">
                    {/* Email Input */}
                    <div className="space-y-2">
                        <Label htmlFor="invite-email" className="text-sm font-medium">
                            Email
                        </Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="invite-email"
                                    placeholder="email@example.com"
                                    value={emailInput}
                                    onChange={(e) => {
                                        setEmailInput(e.target.value);
                                        setError(null);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    className="pl-10"
                                    autoFocus
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={addEmail}
                                disabled={!emailInput.trim()}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Nhấn Enter hoặc dấu phẩy để thêm nhiều email
                        </p>
                    </div>

                    {/* Email Tags */}
                    {emails.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {emails.map((email) => (
                                <Badge
                                    key={email}
                                    variant="secondary"
                                    className="gap-1 pr-1 text-xs"
                                >
                                    {email}
                                    <button
                                        onClick={() => removeEmail(email)}
                                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => handleClose(false)}
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={pendingCount === 0 || loading}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Gửi lời mời ({pendingCount})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
