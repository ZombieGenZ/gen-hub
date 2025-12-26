'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    Position,
    MarkerType,
    Panel,
    Handle,
    NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Palette,
    Save,
    Loader2,
    Eye,
    EyeOff,
    RefreshCw,
    FileImage,
    FileText,
    Key,
    Link as LinkIcon,
    Info,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

// Types
interface TableField {
    name: string;
    type: string;
    isId: boolean;
    isRequired: boolean;
    isUnique: boolean;
    isList: boolean;
    hasDefaultValue: boolean;
}

interface TableSchema {
    name: string;
    displayName: string;
    fields: TableField[];
}

interface Relation {
    id: string;
    sourceTable: string;
    sourceField: string;
    targetTable: string;
    targetField: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface TableNodeData {
    label: string;
    fields: TableField[];
    color: string;
    onColorChange: (color: string) => void;
    [key: string]: unknown;
}

type TableNode = Node<TableNodeData, 'tableNode'>;

// Default color for tables
const DEFAULT_COLOR = '#14B8A6'; // teal

// Available colors for color picker
const AVAILABLE_COLORS = [
    '#14B8A6', // teal (default)
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f43f5e', // rose
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
];

// Custom Table Node Component - Memoized for performance
const TableNodeComponent = ({ data }: { data: { label: string; fields: TableField[]; color: string; onColorChange: (color: string) => void } }) => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    return (
        <div
            className="rounded-lg shadow-xl overflow-hidden min-w-[200px] relative"
            style={{
                border: `2px solid ${data.color}`,
                background: 'var(--background-secondary)',
            }}
        >
            {/* Source Handle (right side) */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2 !h-2 !bg-teal-500 !border-0"
            />
            {/* Target Handle (left side) */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2 !h-2 !bg-teal-500 !border-0"
            />
            {/* Table Header */}
            <div
                className="px-3 py-2 font-semibold text-white flex items-center justify-between gap-2"
                style={{ background: data.color }}
            >
                <span className="truncate">{data.label}</span>
                <button
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowColorPicker(!showColorPicker);
                    }}
                    className="p-1 rounded hover:bg-white/20 transition-colors nodrag nopan cursor-pointer export-hide"
                    title="Change color"
                >
                    <Palette className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Color Picker Popup */}
            {showColorPicker && (
                <div
                    className="absolute top-full left-0 mt-1 p-2 bg-[#1a1a2e] rounded-lg shadow-xl border border-[#2a2a3e] z-50 flex gap-1 flex-wrap w-[140px] nodrag nopan"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {AVAILABLE_COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                data.onColorChange(color);
                                setShowColorPicker(false);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-6 h-6 rounded-md border-2 border-transparent hover:border-white transition-all cursor-pointer"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            )}

            {/* Fields */}
            <div className="divide-y divide-[var(--border-primary)]">
                {data.fields.map((field) => (
                    <div
                        key={field.name}
                        className="px-3 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-[var(--background-tertiary)]"
                    >
                        <div className="flex items-center gap-1.5 min-w-0">
                            {field.isId && (
                                <span title="Primary Key"><Key className="w-3 h-3 text-yellow-500 flex-shrink-0" /></span>
                            )}
                            {field.name.endsWith('_id') && !field.isId && (
                                <span title="Foreign Key"><LinkIcon className="w-3 h-3 text-blue-400 flex-shrink-0" /></span>
                            )}
                            <span className={`truncate ${field.isRequired ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                                {field.name}
                            </span>
                            {field.isRequired && !field.isId && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-mono flex-shrink-0" title="NOT NULL">
                                    NN
                                </span>
                            )}
                            {field.isUnique && !field.isId && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono flex-shrink-0" title="UNIQUE">
                                    UQ
                                </span>
                            )}
                        </div>
                        <span className="text-[var(--text-muted)] flex-shrink-0 font-mono text-[10px]">
                            {field.type}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Memoize the component but allow color updates
const TableNode = memo(TableNodeComponent, (prevProps, nextProps) => {
    // Only re-render if color, label, or fields changed
    return (
        prevProps.data.color === nextProps.data.color &&
        prevProps.data.label === nextProps.data.label &&
        prevProps.data.fields === nextProps.data.fields
    );
});

// Calculate estimated node height based on field count - OUTSIDE component for performance
const calculateNodeHeight = (fieldCount: number): number => {
    const headerHeight = 40; // Header height
    const fieldHeight = 28; // Each field row height
    const padding = 8; // Top/bottom padding
    return headerHeight + (fieldCount * fieldHeight) + padding;
};

// Auto-layout algorithm - OUTSIDE component for performance
const calculateAutoLayout = (
    tables: TableSchema[],
    savedPositions: Record<string, { x: number; y: number }> | null
): Record<string, { x: number; y: number }> => {
    const positions: Record<string, { x: number; y: number }> = {};

    // If we have saved positions for ALL tables, use them
    if (savedPositions && Object.keys(savedPositions).length >= tables.length) {
        return savedPositions;
    }

    // Constants for layout
    const nodeWidth = 280;
    const horizontalGap = 100;
    const verticalGap = 80; // Increased spacing between rows
    const startX = 50;
    const startY = 50;
    const maxColumns = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(tables.length * 1.5))));

    // Sort tables by field count (larger tables first for better layout)
    const sortedTables = [...tables].sort((a, b) => b.fields.length - a.fields.length);

    // Track column heights
    const columnHeights: number[] = new Array(maxColumns).fill(startY);

    sortedTables.forEach((table) => {
        // Use saved position if available for this specific table
        if (savedPositions && savedPositions[table.name]) {
            positions[table.name] = savedPositions[table.name];
            return;
        }

        // Find the column with minimum height (greedy approach)
        let minColumnIndex = 0;
        let minHeight = columnHeights[0];
        for (let i = 1; i < maxColumns; i++) {
            if (columnHeights[i] < minHeight) {
                minHeight = columnHeights[i];
                minColumnIndex = i;
            }
        }

        // Calculate position
        const x = startX + minColumnIndex * (nodeWidth + horizontalGap);
        const y = columnHeights[minColumnIndex];

        positions[table.name] = { x, y };

        // Update column height
        const nodeHeight = calculateNodeHeight(table.fields.length);
        columnHeights[minColumnIndex] = y + nodeHeight + verticalGap;
    });

    return positions;
};

export default function DiagramPage() {
    const { t } = useLanguage();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<TableNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showRelations, setShowRelations] = useState(true);
    const [showLegend, setShowLegend] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);
    const [tableColors, setTableColors] = useState<Record<string, string>>({});
    const [schema, setSchema] = useState<{ tables: TableSchema[]; relations: Relation[] } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Memoize nodeTypes to prevent recreation on every render
    const nodeTypes = useMemo(() => ({
        tableNode: TableNode,
    }), []);

    // Load diagram data
    const loadDiagram = useCallback(async () => {
        setIsLoading(true);
        try {
            const [schemaData, configData] = await Promise.all([
                adminApi.getDiagramSchema(),
                adminApi.getDiagramConfig(),
            ]);

            setSchema(schemaData);
            setShowRelations(configData.show_relations ?? true);
            setTableColors(configData.table_colors || {});

            // Calculate positions using auto-layout algorithm
            const positions = calculateAutoLayout(
                schemaData.tables,
                configData.node_positions as Record<string, { x: number; y: number }> | null
            );

            // Create nodes from tables
            const newNodes: Node[] = schemaData.tables.map((table: TableSchema) => {
                const position = positions[table.name] || { x: 50, y: 50 };
                const color = configData.table_colors?.[table.name] || DEFAULT_COLOR;

                return {
                    id: table.name,
                    type: 'tableNode',
                    position,
                    draggable: true,
                    selectable: true,
                    data: {
                        label: table.displayName,
                        fields: table.fields,
                        color,
                        onColorChange: (newColor: string) => {
                            setTableColors((prev) => ({ ...prev, [table.name]: newColor }));
                            setHasChanges(true);
                        },
                    },
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                };
            });

            // Create edges from relations - simplified without handles
            const newEdges: Edge[] = schemaData.relations.map((rel: Relation) => ({
                id: rel.id,
                source: rel.sourceTable,
                target: rel.targetTable,
                type: 'smoothstep',
                animated: false,
                style: {
                    stroke: '#14B8A6',
                    strokeWidth: 1.5,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#14B8A6',
                },
                label: rel.type === 'one-to-one' ? '1:1' : rel.type === 'one-to-many' ? '1:N' : 'N:N',
                labelStyle: {
                    fill: 'var(--text-secondary)',
                    fontSize: 10,
                },
                labelBgStyle: {
                    fill: 'var(--background-primary)',
                },
            }));

            setNodes(newNodes as TableNode[]);
            setEdges(newEdges);
        } catch (error) {
            console.error('Failed to load diagram:', error);
        } finally {
            setIsLoading(false);
        }
    }, [setNodes, setEdges]);

    useEffect(() => {
        loadDiagram();
    }, [loadDiagram]);

    // Compute display edges with hover glow effect
    const displayEdges = useMemo((): Edge[] => {
        if (!showRelations) return [];
        return edges.map((edge): Edge => {
            const isHighlighted = hoveredNode !== null && (edge.source === hoveredNode || edge.target === hoveredNode);
            return {
                ...edge,
                style: {
                    ...edge.style,
                    stroke: isHighlighted ? '#22d3ee' : '#14B8A6',
                    strokeWidth: isHighlighted ? 3 : 1.5,
                    filter: isHighlighted ? 'drop-shadow(0 0 6px #22d3ee)' : 'none',
                },
                animated: isHighlighted ? true : false,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isHighlighted ? '#22d3ee' : '#14B8A6',
                },
                zIndex: isHighlighted ? 1000 : 0,
            };
        });
    }, [edges, showRelations, hoveredNode]);

    // Node hover handlers
    const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
        setHoveredNode(node.id);
    }, []);

    const onNodeMouseLeave = useCallback(() => {
        setHoveredNode(null);
    }, []);

    // Update node colors when tableColors changes
    useEffect(() => {
        if (Object.keys(tableColors).length > 0) {
            setNodes((nds) =>
                nds.map((node) => {
                    if (tableColors[node.id]) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                color: tableColors[node.id],
                            },
                        };
                    }
                    return node;
                })
            );
        }
    }, [tableColors, setNodes]);

    // Track node position changes
    const handleNodesChange = useCallback(
        (changes: NodeChange<TableNode>[]) => {
            onNodesChange(changes);
            const hasPositionChange = changes.some((change) => change.type === 'position' && (change as { dragging?: boolean }).dragging === false);
            if (hasPositionChange) {
                setHasChanges(true);
            }
        },
        [onNodesChange]
    );

    // Toggle relations visibility
    const handleToggleRelations = useCallback(() => {
        setShowRelations((prev) => !prev);
        setHasChanges(true);
    }, []);

    // Save configuration
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const node_positions: Record<string, { x: number; y: number }> = {};
            nodes.forEach((node) => {
                node_positions[node.id] = { x: node.position.x, y: node.position.y };
            });

            await adminApi.saveDiagramConfig({
                node_positions,
                table_colors: tableColors,
                show_relations: showRelations,
            });

            setHasChanges(false);
        } catch (error) {
            console.error('Failed to save diagram config:', error);
        } finally {
            setIsSaving(false);
        }
    }, [nodes, tableColors, showRelations]);

    // Export as PNG - Full diagram
    const handleExportPNG = useCallback(async () => {
        if (!reactFlowWrapper.current) return;

        const flowElement = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
        if (!flowElement) return;

        try {
            // Calculate bounding box of all nodes
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach((node) => {
                const nodeHeight = calculateNodeHeight(node.data.fields?.length || 5);
                minX = Math.min(minX, node.position.x);
                minY = Math.min(minY, node.position.y);
                maxX = Math.max(maxX, node.position.x + 280); // nodeWidth
                maxY = Math.max(maxY, node.position.y + nodeHeight);
            });

            const padding = 50;
            const width = Math.max(1200, maxX - minX + padding * 2);
            const height = Math.max(800, maxY - minY + padding * 2);

            const dataUrl = await toPng(flowElement, {
                backgroundColor: '#0a0a0f',
                width: width,
                height: height,
                filter: (node) => {
                    // Hide elements with 'export-hide' class
                    if (node instanceof Element && node.classList.contains('export-hide')) {
                        return false;
                    }
                    return true;
                },
                style: {
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: `translate(${-minX + padding}px, ${-minY + padding}px)`,
                },
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const link = document.createElement('a');
            link.download = `GEN-HUB-diagram-${timestamp}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export PNG:', error);
        }
    }, [nodes]);

    // Export as PDF - Full diagram
    const handleExportPDF = useCallback(async () => {
        if (!reactFlowWrapper.current) return;

        const flowElement = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
        if (!flowElement) return;

        try {
            // Calculate bounding box of all nodes
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach((node) => {
                const nodeHeight = calculateNodeHeight(node.data.fields?.length || 5);
                minX = Math.min(minX, node.position.x);
                minY = Math.min(minY, node.position.y);
                maxX = Math.max(maxX, node.position.x + 280);
                maxY = Math.max(maxY, node.position.y + nodeHeight);
            });

            const padding = 50;
            const width = Math.max(1200, maxX - minX + padding * 2);
            const height = Math.max(800, maxY - minY + padding * 2);

            const dataUrl = await toPng(flowElement, {
                backgroundColor: '#0a0a0f',
                width: width,
                height: height,
                filter: (node) => {
                    // Hide elements with 'export-hide' class
                    if (node instanceof Element && node.classList.contains('export-hide')) {
                        return false;
                    }
                    return true;
                },
                style: {
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: `translate(${-minX + padding}px, ${-minY + padding}px)`,
                },
            });

            const pdf = new jsPDF({
                orientation: width > height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [width, height],
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
            pdf.save(`GEN-HUB-diagram-${timestamp}.pdf`);
        } catch (error) {
            console.error('Failed to export PDF:', error);
        }
    }, [nodes]);

    if (isLoading) {
        return (
            <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>{t('diagram.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-4 flex-shrink-0 gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{t('diagram.title')}</h1>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                        {schema?.tables.length || 0} {t('diagram.tables')} • {schema?.relations.length || 0} {t('diagram.relations')}
                    </p>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    {/* Toggle Legend */}
                    <button
                        onClick={() => setShowLegend(prev => !prev)}
                        className="btn btn-secondary p-2 sm:p-2.5"
                        title={showLegend ? t('diagram.hideLegend') : t('diagram.showLegend')}
                    >
                        <Info className="w-4 h-4" />
                    </button>

                    {/* Toggle Relations */}
                    <button
                        onClick={handleToggleRelations}
                        className={`btn ${showRelations ? 'btn-secondary' : 'btn-primary'} p-2 sm:p-2.5`}
                        title={showRelations ? t('diagram.hideLines') : t('diagram.showLines')}
                    >
                        {showRelations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="hidden lg:inline ml-1">{showRelations ? t('diagram.hideLines') : t('diagram.showLines')}</span>
                    </button>

                    {/* Refresh */}
                    <button onClick={loadDiagram} className="btn btn-secondary p-2 sm:p-2.5" title={t('diagram.refresh')}>
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    {/* Export PNG */}
                    <button onClick={handleExportPNG} className="btn btn-secondary p-2 sm:p-2.5" title="Export PNG">
                        <FileImage className="w-4 h-4" />
                        <span className="hidden lg:inline ml-1">{t('diagram.exportPng')}</span>
                    </button>

                    {/* Export PDF */}
                    <button onClick={handleExportPDF} className="btn btn-secondary p-2 sm:p-2.5" title="Export PDF">
                        <FileText className="w-4 h-4" />
                        <span className="hidden lg:inline ml-1">{t('diagram.exportPdf')}</span>
                    </button>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`btn ${hasChanges ? 'btn-primary' : 'btn-secondary'} disabled:opacity-50 p-2 sm:p-2.5`}
                        title={t('diagram.save')}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span className="hidden sm:inline">{t('diagram.save')}</span>
                    </button>
                </div>
            </div>

            {/* Diagram */}
            <div
                ref={reactFlowWrapper}
                className="flex-1 rounded-xl overflow-hidden border border-[var(--border-primary)]"
                style={{ background: 'var(--background-primary)' }}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={displayEdges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.1}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="var(--border-primary)" gap={20} />
                    <Controls
                        className="!bg-[var(--background-secondary)] !border-[var(--border-primary)] !shadow-xl [&_button]:!bg-[var(--background-tertiary)] [&_button]:!border-[var(--border-primary)] [&_button_svg]:!fill-[var(--text-primary)] [&_button:hover]:!bg-[var(--accent-primary)]"
                    />
                    <MiniMap
                        nodeColor={(node) => (node.data as TableNodeData)?.color || 'var(--accent-primary)'}
                        maskColor="rgba(0, 0, 0, 0.8)"
                        style={{
                            backgroundColor: 'var(--background-secondary)',
                            border: '1px solid var(--border-primary)',
                        }}
                    />

                    {/* Legend Panel */}
                    {showLegend && (
                        <Panel position="bottom-left" className="!m-4">
                            <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-3 text-xs">
                                <div className="font-semibold text-[var(--text-primary)] mb-2">{t('diagram.legend.title')}</div>
                                <div className="space-y-1.5">
                                    {/* Keys */}
                                    <div className="flex items-center gap-2">
                                        <Key className="w-3 h-3 text-yellow-500" />
                                        <span className="text-[var(--text-secondary)]">{t('diagram.legend.primaryKey')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <LinkIcon className="w-3 h-3 text-blue-400" />
                                        <span className="text-[var(--text-secondary)]">{t('diagram.legend.foreignKey')}</span>
                                    </div>

                                    {/* Constraints */}
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-primary)]">
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">NN</span>
                                        <span className="text-[var(--text-secondary)]">{t('diagram.legend.notNull')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">UQ</span>
                                        <span className="text-[var(--text-secondary)]">{t('diagram.legend.unique')}</span>
                                    </div>

                                    {/* Relations */}
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-primary)]">
                                        <div className="w-6 h-0.5 bg-[#14B8A6]" />
                                        <span className="text-[var(--text-secondary)]">{t('diagram.legend.relations')}</span>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    )}
                </ReactFlow>
            </div>
        </div>
    );
}
