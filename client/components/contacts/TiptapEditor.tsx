"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
    BoldIcon,
    ItalicIcon,
    ListBulletIcon,
    CodeBracketIcon,
    LinkIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
    editable?: boolean;
}

export function TiptapEditor({
    content,
    onChange,
    placeholder = "Nhập nội dung...",
    onSubmit,
    editable = true,
}: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
                emptyEditorClass: "is-editor-empty",
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-primary hover:underline",
                },
            }),
        ],
        content,
        editable,
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3 text-slate-800",
            },
            handleKeyDown: (view, event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    onSubmit?.();
                    return true;
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        immediatelyRender: false,
    });

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col border border-slate-200 bg-white" style={{ borderRadius: "12px" }}>
            {/* Toolbar */}
            {editable && (
                <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50 rounded-t-[12px]">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive("bold")}
                        icon={BoldIcon}
                        title="In đậm (Ctrl+B)"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        icon={ItalicIcon}
                        title="In nghiêng (Ctrl+I)"
                    />
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive("bulletList")}
                        icon={ListBulletIcon}
                        title="Danh sách"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        isActive={editor.isActive("codeBlock")}
                        icon={CodeBracketIcon}
                        title="Code Block"
                    />
                    <ToolbarButton
                        onClick={() => {
                            const previousUrl = editor.getAttributes("link").href;
                            const url = window.prompt("URL", previousUrl);
                            if (url === null) return;
                            if (url === "") {
                                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                                return;
                            }
                            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                        }}
                        isActive={editor.isActive("link")}
                        icon={LinkIcon}
                        title="Chèn Link"
                    />
                    <div className="ml-auto flex items-center gap-1">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo()}
                            icon={ArrowUturnLeftIcon}
                            title="Hoàn tác (Ctrl+Z)"
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                            icon={ArrowUturnRightIcon}
                            title="Làm lại (Ctrl+Shift+Z)"
                        />
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <div className="relative">
                <EditorContent editor={editor} />
            </div>

            <style jsx global>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #94a3b8;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}

function ToolbarButton({
    onClick,
    isActive,
    disabled,
    icon: Icon,
    title,
}: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    icon: any;
    title?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "p-1.5 rounded-lg transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-200",
                isActive && "bg-slate-200 text-primary font-medium",
                disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
            )}
            type="button"
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}
