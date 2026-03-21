import React, { useRef } from "react";
import ReactBarcode from "react-barcode";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeDialogProps {
    open: boolean;
    onClose: () => void;
    barcode: string;
    productName: string;
}

export function BarcodeDialog({
    open,
    onClose,
    barcode,
    productName,
}: BarcodeDialogProps) {
    const barcodeRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        const svg = barcodeRef.current?.querySelector("svg");
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new window.Image();
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const a = document.createElement("a");
            a.download = `barcode-${barcode}.png`;
            a.href = canvas.toDataURL("image/png");
            a.click();
        };
        img.src = url;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mã vạch sản phẩm</DialogTitle>
                    <DialogDescription>{productName}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-6">
                    <div
                        ref={barcodeRef}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 w-full flex justify-center"
                    >
                        {barcode ? (
                            <ReactBarcode
                                value={barcode}
                                width={1.8}
                                height={80}
                                fontSize={16}
                                margin={10}
                                background="#ffffff"
                                lineColor="#000000"
                            />
                        ) : (
                            <p className="text-sm text-gray-400 py-8">Không có mã vạch</p>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">
                        Quét mã vạch này bằng máy quét để tra cứu nhanh sản phẩm
                    </p>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleDownload} disabled={!barcode}>
                        Tải xuống PNG
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Đóng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
