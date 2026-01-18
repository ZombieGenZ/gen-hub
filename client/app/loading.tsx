"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900">
            <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
                    <motion.div
                        className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                </div>
                <p className="text-white/60 text-sm">Đang tải...</p>
            </motion.div>
        </div>
    );
}
