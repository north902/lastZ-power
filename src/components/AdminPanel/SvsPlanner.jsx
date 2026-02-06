import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import {
    MousePointer2,
    Plus,
    Trash2,
    Download,
    Layers,
    ZoomIn,
    ZoomOut,
    Maximize,
    Map as MapIcon,
    ShieldAlert,
    Sword,
    Home,
    Navigation
} from 'lucide-react';


const HEX_RADIUS = 25;
const RESTRICTED_ICE_RADIUS = 17; // 邊長 18 = 半徑 17 (禁區)
const BLACK_SOIL_RADIUS = 35;     // 邊長 36 = 半徑 35 (土色區域)
const MAP_RADIUS = 55;            // 總地圖範圍 (雪地)

// 建築物模板：2x3x2 蜂巢群組 (大六角形)
const HQ_SHAPE = [
    { q: 0, r: 0 },   // 中心
    { q: 1, r: -1 },  // 右上
    { q: 1, r: 0 },   // 右
    { q: 0, r: 1 },   // 右下
    { q: -1, r: 1 },  // 左下
    { q: -1, r: 0 },  // 左
    { q: 0, r: -1 },  // 左上
];

// 哨塔/大砲形狀
const CANNON_SHAPE = [
    { q: 0, r: 0 },
    { q: 0, r: -1 },
    { q: 0, r: 1 },
];

// 固定砲台形狀：邊長 4 (半徑 3)
const BATTERY_RADIUS = 3;
const generateBatteryShape = () => {
    const shape = [];
    for (let q = -3; q <= 3; q++) {
        for (let r = -3; r <= 3; r++) {
            const s = -q - r;
            if (Math.abs(q) <= 3 && Math.abs(r) <= 3 && Math.abs(s) <= 3) {
                shape.push({ q, r });
            }
        }
    }
    return shape;
};
const BATTERY_SHAPE = generateBatteryShape();

export const SvsPlanner = () => {
    const [cells, setCells] = useState({});
    const [selectedTool, setSelectedTool] = useState('brush');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [zoom, setZoom] = useState(0.8);
    const [offset, setOffset] = useState({ x: 300, y: 300 });
    const [showCoords, setShowCoords] = useState(true);
    const [viewSize, setViewSize] = useState({ w: 800, h: 600 });

    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // 初始化與重置地圖
    const initDefaultMap = () => {
        const newCells = {};

        // 定義三個固定砲台的位置與資訊 (中心移至 16 格處，確保外緣剛好只露出 2 格)
        const basicBatteries = [
            { id: '1', name: '1號砲台', center: { q: -16, r: 16 }, label: '1' }, // 左下角
            { id: '2', name: '2號砲台', center: { q: 0, r: -16 }, label: '2' },  // 左上角
            { id: '3', name: '3號砲台', center: { q: 16, r: 0 }, label: '3' },   // 中右角
        ];

        basicBatteries.forEach(bat => {
            const pk = `battery_${bat.id}`;
            BATTERY_SHAPE.forEach(offset => {
                const q = bat.center.q + offset.q;
                const r = bat.center.r + offset.r;
                newCells[`${q},${r}`] = {
                    type: 'battery',
                    color: 'rgba(153, 27, 27, 0.7)', // 深紅色背景
                    parent: pk,
                    isCenter: offset.q === 0 && offset.r === 0,
                    label: offset.q === 0 && offset.r === 0 ? bat.label : null
                };
            });
        });

        setCells(newCells);
    };

    useEffect(() => {
        if (Object.keys(cells).length === 0) {
            initDefaultMap();
        }
    }, []);

    const resetMap = () => {
        if (!window.confirm('確定要清除所有標記並重置地圖嗎？')) return;
        initDefaultMap();
    };

    // 處理滾輪縮放而不觸發頁面滾動
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            setZoom(z => Math.min(3, Math.max(0.2, z + delta)));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // 轉換網格座標為畫布像素座標 (純幾何計算，不包含位移)
    const hexToPixel = (q, r) => {
        const x = HEX_RADIUS * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
        const y = HEX_RADIUS * (3 / 2) * r;
        return { x, y };
    };

    // 轉換像素座標為網格座標 (用於點擊檢測)
    const pixelToHex = (mouseX, mouseY) => {
        // 先扣除平移量並還原縮放比例
        const x = (mouseX - offset.x) / zoom;
        const y = (mouseY - offset.y) / zoom;

        const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / HEX_RADIUS;
        const r = (2 / 3 * y) / HEX_RADIUS;
        return roundHex(q, r);
    };

    // 監聽容器尺寸變化
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setViewSize({
                    w: containerRef.current.clientWidth,
                    h: containerRef.current.clientHeight
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const roundHex = (fracQ, fracR) => {
        let q = Math.round(fracQ);
        let r = Math.round(fracR);
        let s = Math.round(-fracQ - fracR);
        const qDiff = Math.abs(q - fracQ);
        const rDiff = Math.abs(r - fracR);
        const sDiff = Math.abs(s - (-fracQ - fracR));
        if (qDiff > rDiff && qDiff > sDiff) q = -r - s;
        else if (rDiff > sDiff) r = -q - s;
        return { q, r };
    };

    const handleMouseDown = (e) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) { // 中鍵或 Alt+左鍵 拖拽
            isDragging.current = true;
            lastPos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging.current) {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastPos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const applyAction = (q, r) => {
        setCells(prev => {
            const key = `${q},${r}`;
            let newCells = { ...prev };

            if (selectedTool === 'brush') {
                newCells[key] = { type: 'color', color: selectedColor };
            } else if (selectedTool === 'eraser') {
                const target = newCells[key];
                if (target?.parent) {
                    const pKey = target.parent;
                    Object.keys(newCells).forEach(k => {
                        if (newCells[k].parent === pKey) delete newCells[k];
                    });
                } else {
                    delete newCells[key];
                }
            } else if (selectedTool === 'hq' || selectedTool === 'cannon') {
                const shape = selectedTool === 'hq' ? HQ_SHAPE : CANNON_SHAPE;

                // 檢查是否與現有建築重疊，以及是否進入禁區
                const isInvalid = shape.some(offset => {
                    const tQ = q + offset.q;
                    const tR = r + offset.r;
                    const tKey = `${tQ},${tR}`;
                    const targetCell = newCells[tKey];

                    // 1. 建築物重疊規則 (顏色標記除外)
                    if (targetCell && targetCell.type !== 'color') return true;

                    // 2. 禁區限制規則 (不能蓋在冰層內，冰層半徑為 RESTRICTED_ICE_RADIUS)
                    const dist = Math.max(Math.abs(tQ), Math.abs(tR), Math.abs(-tQ - tR));
                    if (dist <= RESTRICTED_ICE_RADIUS) return true;

                    return false;
                });

                if (isInvalid) return prev;

                const parentKey = key;
                shape.forEach(offset => {
                    const targetQ = q + offset.q;
                    const targetR = r + offset.r;
                    newCells[`${targetQ},${targetR}`] = {
                        type: selectedTool,
                        color: selectedColor,
                        parent: parentKey,
                        isCenter: offset.q === 0 && offset.r === 0
                    };
                });
            }
            return newCells;
        });
    };

    const renderHex = (q, r) => {
        const { x, y } = hexToPixel(q, r);
        const key = `${q},${r}`;
        const cell = cells[key];

        // 判斷地形
        const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
        const isInIceZone = dist <= RESTRICTED_ICE_RADIUS;
        const isIceBorder = dist === RESTRICTED_ICE_RADIUS;
        const isInBlackSoil = dist <= BLACK_SOIL_RADIUS;
        const isSoilBorder = dist === BLACK_SOIL_RADIUS;

        // 計算頂點
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle_rad = Math.PI / 180 * (60 * i + 30);
            points.push(`${x + HEX_RADIUS * Math.cos(angle_rad)},${y + HEX_RADIUS * Math.sin(angle_rad)}`);
        }

        // 地形背景色 (雪季主題)
        let terrainFill = 'rgba(248, 250, 252, 0.3)';   // 預設雪地 (Outlands)
        let terrainStroke = 'rgba(186, 230, 253, 0.2)';

        if (isInIceZone) {
            terrainFill = 'rgba(30, 58, 138, 0.6)';    // 禁區：深藍色冰層
            terrainStroke = 'rgba(59, 130, 246, 0.3)';
        } else if (isInBlackSoil) {
            terrainFill = 'rgba(120, 113, 108, 0.4)';  // 黑土：淺棕灰土色
            terrainStroke = 'rgba(168, 162, 158, 0.2)';
        }

        return (
            <g
                key={key}
                className="group/hex transition-all duration-200"
            >
                <polygon
                    points={points.join(' ')}
                    onClick={() => applyAction(q, r)}
                    fill={cell?.color || terrainFill}
                    fillOpacity={cell?.type === 'color' ? 0.4 : 1}
                    stroke={isIceBorder ? '#06b6d4' : (isSoilBorder ? '#d97706' : (cell ? 'rgba(255,255,255,0.8)' : terrainStroke))}
                    strokeWidth={isIceBorder || isSoilBorder ? 3 : (cell?.isCenter ? 2.5 : 0.8)}
                    className="cursor-pointer transition-all duration-300 hover:fill-slate-400/30"
                />
                {showCoords && q % 4 === 0 && r % 4 === 0 && (
                    <text
                        x={x} y={y}
                        fontSize="5"
                        textAnchor="middle"
                        fill={isInIceZone ? "rgba(147, 197, 253, 0.3)" : (isInBlackSoil ? "rgba(68, 64, 60, 0.4)" : "rgba(14, 165, 233, 0.3)")}
                        className="pointer-events-none select-none font-mono"
                    >
                        {q},{r}
                    </text>
                )}
                {cell?.isCenter && (
                    <g transform={`translate(${x - 8}, ${y - 8})`} className="pointer-events-none">
                        {cell.type === 'hq' ? (
                            <Home size={16} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        ) : (
                            <Sword size={16} className="text-white animate-pulse" />
                        )}
                    </g>
                )}
            </g>
        );
    };

    const gridItems = useMemo(() => {
        const items = [];
        const range = MAP_RADIUS;

        for (let q = -range; q <= range; q++) {
            for (let r = -range; r <= range; r++) {
                const s = -q - r;
                if (Math.abs(s) <= range) {
                    items.push(<HexCell
                        key={`${q},${r}`}
                        q={q} r={r}
                        cell={cells[`${q},${r}`]}
                        showCoords={showCoords}
                        applyAction={applyAction}
                        hexToPixel={hexToPixel}
                    />);
                }
            }
        }
        return items;
    }, [cells, showCoords]);

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative">
            {/* 頂部工具列 */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <ToolBtn active={selectedTool === 'brush'} onClick={() => setSelectedTool('brush')} icon={<MousePointer2 size={18} />} label="筆刷" />
                        <ToolBtn active={selectedTool === 'hq'} onClick={() => setSelectedTool('hq')} icon={<Home size={18} />} label="放置總部" />
                        <ToolBtn active={selectedTool === 'cannon'} onClick={() => setSelectedTool('cannon')} icon={<Sword size={18} />} label="大砲/哨塔" />
                        <ToolBtn active={selectedTool === 'eraser'} onClick={() => setSelectedTool('eraser')} icon={<Trash2 size={18} />} label="橡皮擦" />
                    </div>

                    <div className="h-6 w-[1px] bg-slate-700" />

                    <div className="flex gap-2">
                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                            <button
                                key={color}
                                className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedColor === color ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setSelectedColor(color)}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowCoords(!showCoords)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showCoords ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Navigation size={14} /> 顯示座標
                    </button>

                    <div className="h-6 w-[1px] bg-slate-700" />

                    <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <ZoomOut size={16} />
                        </button>

                        <input
                            type="range"
                            min="0.1"
                            max="2.5"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />

                        <button
                            onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <ZoomIn size={16} />
                        </button>

                        <span className="text-[10px] font-mono text-blue-400 w-10 text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                    </div>

                    <button
                        onClick={resetMap}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-medium hover:bg-red-900/40 hover:text-red-400 transition-all border border-slate-700"
                    >
                        <Trash2 size={14} /> 重設地圖
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 hover:from-blue-500 transition-all">
                        <Download size={16} /> 匯出戰圖
                    </button>
                </div>
            </div>

            {/* 地圖主體 */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden cursor-move relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={() => isDragging.current = false}
                onMouseLeave={() => isDragging.current = false}
            >
                <svg
                    width="100%"
                    height="100%"
                    className="absolute inset-0"
                >
                    <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
                        {gridItems}
                    </g>
                </svg>

                {/* 右下角說明 */}
                <div className="absolute bottom-6 right-6 bg-slate-900/60 backdrop-blur border border-slate-700 p-4 rounded-xl pointer-events-none">
                    <h4 className="text-blue-400 font-bold text-xs mb-2 uppercase tracking-widest">操作指南</h4>
                    <ul className="text-[10px] text-slate-400 space-y-1">
                        <li>• <b>滑鼠左鍵</b>: 執行工具動作</li>
                        <li>• <b>滾輪</b>: 縮放地圖</li>
                        <li>• <b>Alt + 左鍵</b>: 拖拽移動地圖</li>
                        <li>• <b>橡皮擦</b>: 點擊建築任一格可拆除整座</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

const HexCell = memo(({ q, r, cell, showCoords, applyAction, hexToPixel }) => {
    const { x, y } = hexToPixel(q, r);

    // 判斷地形
    const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
    const isInIceZone = dist <= RESTRICTED_ICE_RADIUS;
    const isIceBorder = dist === RESTRICTED_ICE_RADIUS;
    const isInBlackSoil = dist <= BLACK_SOIL_RADIUS;
    const isSoilBorder = dist === BLACK_SOIL_RADIUS;

    // 計算頂點
    const points = useMemo(() => {
        const pts = [];
        for (let i = 0; i < 6; i++) {
            const angle_rad = Math.PI / 180 * (60 * i + 30);
            pts.push(`${x + HEX_RADIUS * Math.cos(angle_rad)},${y + HEX_RADIUS * Math.sin(angle_rad)}`);
        }
        return pts.join(' ');
    }, [x, y]);

    // 地形背景色 (雪季主題)
    let terrainFill = 'rgba(248, 250, 252, 0.3)';   // 預設雪地 (Outlands)
    let terrainStroke = 'rgba(186, 230, 253, 0.2)';

    if (isInIceZone) {
        terrainFill = 'rgba(30, 58, 138, 0.6)';    // 禁區：深藍色冰層
        terrainStroke = 'rgba(59, 130, 246, 0.3)';
    } else if (isInBlackSoil) {
        terrainFill = 'rgba(120, 113, 108, 0.4)';  // 黑土：淺棕灰土色
        terrainStroke = 'rgba(168, 162, 158, 0.2)';
    }

    return (
        <g className="group/hex transition-all duration-200">
            <polygon
                points={points}
                onClick={() => applyAction(q, r)}
                fill={cell?.color || terrainFill}
                fillOpacity={cell?.type === 'color' ? 0.4 : 1}
                stroke={isIceBorder ? '#06b6d4' : (isSoilBorder ? '#d97706' : (cell ? 'rgba(255,255,255,0.8)' : terrainStroke))}
                strokeWidth={isIceBorder || isSoilBorder ? 3 : (cell?.isCenter ? 2.5 : 0.8)}
                className="cursor-pointer transition-all duration-300 hover:fill-slate-400/30"
            />
            {showCoords && q % 4 === 0 && r % 4 === 0 && !cell?.label && (
                <text
                    x={x} y={y}
                    fontSize="5"
                    textAnchor="middle"
                    fill={isInIceZone ? "rgba(147, 197, 253, 0.3)" : (isInBlackSoil ? "rgba(68, 64, 60, 0.4)" : "rgba(14, 165, 233, 0.3)")}
                    className="pointer-events-none select-none font-mono"
                >
                    {q},{r}
                </text>
            )}
            {cell?.label && (
                <text
                    x={x} y={y + 5}
                    fontSize="14"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="white"
                    className="pointer-events-none select-none drop-shadow-md"
                >
                    {cell.label}
                </text>
            )}
            {cell?.isCenter && (
                <g transform={`translate(${x - 8}, ${y - 8})`} className="pointer-events-none">
                    {cell.type === 'hq' ? (
                        <Home size={16} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                    ) : (
                        <Sword size={16} className="text-white animate-pulse" />
                    )}
                </g>
            )}
        </g>
    );
});

const ToolBtn = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        title={label}
        className={`p-2.5 rounded-md flex flex-col items-center gap-1 transition-all ${active ? 'bg-blue-600 text-white shadow-inner' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
    >
        {icon}
    </button>
);
