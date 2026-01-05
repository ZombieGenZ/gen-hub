"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const transition = {
    type: "spring" as const,
    mass: 0.5,
    damping: 11.5,
    stiffness: 100,
    restDelta: 0.001,
    restSpeed: 0.001,
};

export const MenuItem = ({
    setActive,
    active,
    item,
    children,
}: {
    setActive: (item: string) => void;
    active: string | null;
    item: string;
    children?: React.ReactNode;
}) => {
    const isActive = active === item;
    return (
        <div onMouseEnter={() => setActive(item)} className="relative">
            <motion.p
                transition={{ duration: 0.2 }}
                className={`cursor-pointer text-sm font-medium transition-colors duration-200 relative group ${
                    isActive 
                        ? 'text-teal-600' 
                        : 'text-gray-700 hover:text-teal-600 dark:text-gray-300 dark:hover:text-teal-400'
                }`}
            >
                {item}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-teal-500 transition-all duration-200 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                }`} />
            </motion.p>
            {active !== null && active === item && children && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full left-1/2 transform -translate-x-1/2 pt-4"
                >
                    <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg shadow-gray-200/80 dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800">
                        <div className="w-max h-full p-6">
                            {children}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export const Menu = ({
    setActive,
    children,
}: {
    setActive: (item: string | null) => void;
    children: React.ReactNode;
}) => {
    return (
        <nav
            onMouseLeave={() => setActive(null)}
            className="relative flex items-center justify-center gap-8"
        >
            {children}
        </nav>
    );
};

export const ProductItem = ({
    title,
    description,
    href,
    src,
}: {
    title: string;
    description: string;
    href: string;
    src: string;
}) => {
    return (
        <Link href={href} className="flex space-x-2">
            <Image
                src={src}
                width={140}
                height={70}
                alt={title}
                className="flex-shrink-0 rounded-md shadow-2xl"
            />
            <div>
                <h4 className="text-xl font-bold mb-1 text-black dark:text-white">
                    {title}
                </h4>
                <p className="text-neutral-700 text-sm max-w-[10rem] dark:text-neutral-300">
                    {description}
                </p>
            </div>
        </Link>
    );
};

export const HoveredLink = ({ children, ...rest }: any) => {
    return (
        <Link
            {...rest}
            className="text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors duration-200 py-2 block font-normal"
        >
            {children}
        </Link>
    );
};
