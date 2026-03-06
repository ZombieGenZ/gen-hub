"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { DeleteOrganizationDialog } from "./DeleteOrganizationDialog";

interface OrgDangerTabProps {
    organizationName: string;
    onDelete: () => Promise<void>;
}

export function OrgDangerTab({ organizationName, onDelete }: OrgDangerTabProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-destructive/30 shadow-sm overflow-hidden">
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Xóa tổ chức</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Hành động này là vĩnh viễn và không thể hoàn tác.
                        </p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                        className="gap-2"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Xóa tổ chức
                    </Button>
                </div>
            </div>

            <DeleteOrganizationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                organizationName={organizationName}
                onConfirm={onDelete}
            />
        </div>
    );
}
