import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  Upload,
  Printer,
  FolderOpen,
  Save,
  Trash2,
  Plus,
  Edit3,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Truck,
  Phone,
  User,
  Download,
  X,
  RefreshCw,
  Layers,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  ListFilter,
  CheckSquare,
  Square,
  ArrowLeft,
  Menu,
  FileText,
  Check,
  Send,
  Bot
} from 'lucide-react';

// Master Item Catalog definitions matching reference PDF
const SECTION_1_ITEMS = [
  "BRINJAL", "RAW MANGO", "GREEN BRINJAL", "CAULIFLOWER", "GREEN CHILLI", "ROUND CHILLI",
  "BELT AVARAI", "TOMATO", "RADISH", "RAW BANANA", "KV BANANA", "NEE BANANA",
  "POOVAM BANANA", "RED BANANA", "ELAKI BANANA", "BITTER GOURD", "MINT", "CORIANDER",
  "METHI", "PALAK", "MP MIX", "RED GOVA", "BANANA LEAVES", "RED ROSE", "KUMKI",
  "MIXING FLOWER", "YELLOW FLOWER", "ORANGE FLOWER", "ORANGE ROSE", "YELLOW ROSE",
  "PINK ROSE", "WHITE KUMKI", "MM FLOWER", "MALLI", "MULLAI", "MALLI MALAI 1.5 FEET"
];

const SECTION_2_ITEMS = [
  "LEMON", "KOVAIKAI", "AMLA", "ANNAR", "SEPPAI", "SENNAI", "PIDI KARANAI",
  "GARLIC", "GINGER", "GAWAR", "SNAKE GOURD", "DOODHI", "BAJII CHILLI",
  "GROUND NUT", "BABY POTATO", "GREEN PEAS", "BEANS", "LADIES FINGER",
  "DRUMSTICK", "PERANADAI", "PANA KIZHANGU", "SWEET LEMON", "CUSTARD APPLE",
  "SAPPOTA", "NEELAM", "MALLI MALAI 1 FEET", "ROSE MALAI 1.5 FEET",
  "VELAMPALAM", "KELAKAI", "ARUGAM PULL LOSE", "ARUGAM PULL MALAI",
  "VETRIALL", "BETAL LEAVES", "PERIKAI"
];

const ALL_ITEMS = [...SECTION_1_ITEMS, ...SECTION_2_ITEMS];

interface ItemRowData {
  totalOrder: number;
  finalRecv: number;
  kgs: number;
  dhineshQty: number;
  balaQty: number;
  gopiQty: number;
}

interface StationSlip {
  id: string;
  stationName: string;
  tapeType: string;
  slipDate: string;
  driverName: string;
  driverPhone: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  totalBoxes: number;
  items: { itemName: string; boxCount: number; weightKgs: number }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'consolidator' | 'items_list' | 'saved_files'>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [packingDate, setPackingDate] = useState<string>('');
  const [salesDate, setSalesDate] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (orderDate) {
      const d = new Date(orderDate);
      const pD = new Date(d);
      pD.setDate(d.getDate() + 1);
      const sD = new Date(d);
      sD.setDate(d.getDate() + 2);
      setPackingDate(pD.toISOString().split('T')[0]);
      setSalesDate(sD.toISOString().split('T')[0]);
    }
  }, [orderDate]);

  const [itemData, setItemData] = useState<Record<string, ItemRowData>>(() => {
    const initial: Record<string, ItemRowData> = {};
    ALL_ITEMS.forEach(name => {
      initial[name] = {
        totalOrder: 0,
        finalRecv: 0,
        kgs: 0,
        dhineshQty: 0,
        balaQty: 0,
        gopiQty: 0
      };
    });
    return initial;
  });

  const [slips, setSlips] = useState<StationSlip[]>([]);
  const [savedRecords, setSavedRecords] = useState<{ id: string; date: string; name: string }[]>([]);

  // Modals state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isSlipsModalOpen, setIsSlipsModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  // Bulk Edit State
  const [bulkSelectedItems, setBulkSelectedItems] = useState<string[]>([]);
  const [bulkTargetField, setBulkTargetField] = useState<'finalRecv' | 'kgs'>('finalRecv');
  const [bulkMode, setBulkMode] = useState<'set' | 'add'>('set');
  const [bulkValue, setBulkValue] = useState<number>(0);

  // WhatsApp Inputs
  const [dhineshText, setDhineshText] = useState('');
  const [balaText, setBalaText] = useState('');
  const [gopiText, setGopiText] = useState('');
  const [isParsingWhatsApp, setIsParsingWhatsApp] = useState(false);

  // OCR Inputs
  const [ocrImages, setOcrImages] = useState<{ base64: string; mimeType: string; name: string }[]>([]);
  const [isParsingOCR, setIsParsingOCR] = useState(false);

  // Gemini Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hello! I am your Gemini Dispatch Assistant. Ask me to parse orders, adjust quantities, or check reconciliation in plain English.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAIAssistantOpen]);

  useEffect(() => {
    const loaded = localStorage.getItem('dispatch_records');
    if (loaded) {
      try {
        setSavedRecords(JSON.parse(loaded));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const updateItemValue = (itemName: string, field: keyof ItemRowData, val: number) => {
    setItemData(prev => {
      const current = prev[itemName] || {
        totalOrder: 0, finalRecv: 0, kgs: 0,
        dhineshQty: 0, balaQty: 0, gopiQty: 0
      };
      const updated = { ...current, [field]: val };
      if (['dhineshQty', 'balaQty', 'gopiQty'].includes(field)) {
        updated.totalOrder = updated.dhineshQty + updated.balaQty + updated.gopiQty;
      }
      return { ...prev, [itemName]: updated };
    });
  };

  const handleApplyBulkEdit = () => {
    if (bulkSelectedItems.length === 0) {
      alert('Please select at least one item for bulk editing.');
      return;
    }
    setItemData(prev => {
      const next = { ...prev };
      bulkSelectedItems.forEach(itemName => {
        const curr = next[itemName] || {
          totalOrder: 0, finalRecv: 0, kgs: 0,
          dhineshQty: 0, balaQty: 0, gopiQty: 0
        };
        const currentVal = Number(curr[bulkTargetField] || 0);
        const newVal = bulkMode === 'set' ? bulkValue : currentVal + bulkValue;
        next[itemName] = { ...curr, [bulkTargetField]: Math.max(0, newVal) };
      });
      return next;
    });
    setIsBulkEditModalOpen(false);
    setBulkSelectedItems([]);
    alert(`Successfully updated ${bulkTargetField} for ${bulkSelectedItems.length} items.`);
  };

  const loadSampleWhatsApp = () => {
    setDhineshText(`Dhinesh Order (${orderDate}):
- Brinjal: S2 M5 (7 boxes)
- Tomato: 15 boxes
- Banana Leaves: 400ps (12 boxes)
- Raw Mango: 5 boxes`);
    setBalaText(`Bala Order (${orderDate}):
- Green Chilli: 8 boxes
- Bitter Gourd: 6 boxes
- Lemon: 20 boxes
- Ladies Finger: 10 boxes`);
    setGopiText(`Gopi Order (${orderDate}):
- Cauliflower: 12 boxes
- Drumstick: 8 boxes
- Onion Small: 000
- Malli: 5 kgs`);
  };

  const handleParseWhatsApp = async () => {
    setIsParsingWhatsApp(true);
    try {
      const res = await fetch('/api/parse-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dhineshText, balaText, gopiText, orderDate })
      });
      const data = await res.json();
      if (data && data.buyers) {
        setItemData(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            next[k] = { ...next[k], dhineshQty: 0, balaQty: 0, gopiQty: 0, totalOrder: 0 };
          });

          const applyBuyer = (buyerObj: any, prefix: 'dhinesh' | 'bala' | 'gopi') => {
            if (!buyerObj || !buyerObj.items) return;
            Object.entries(buyerObj.items).forEach(([itemName, details]: [string, any]) => {
              const upperName = itemName.toUpperCase();
              if (!next[upperName]) {
                next[upperName] = { totalOrder: 0, finalRecv: 0, kgs: 0, dhineshQty: 0, balaQty: 0, gopiQty: 0 };
              }
              const q = Number(details.qty || 0);
              if (prefix === 'dhinesh') {
                next[upperName].dhineshQty = q;
              } else if (prefix === 'bala') {
                next[upperName].balaQty = q;
              } else if (prefix === 'gopi') {
                next[upperName].gopiQty = q;
              }
              next[upperName].totalOrder = next[upperName].dhineshQty + next[upperName].balaQty + next[upperName].gopiQty;
            });
          };

          applyBuyer(data.buyers.dhinesh, 'dhinesh');
          applyBuyer(data.buyers.bala, 'bala');
          applyBuyer(data.buyers.gopi, 'gopi');

          return next;
        });
        setIsWhatsAppModalOpen(false);
      } else {
        alert('Failed to parse orders properly.');
      }
    } catch (e: any) {
      alert('Error parsing WhatsApp: ' + e.message);
    } finally {
      setIsParsingWhatsApp(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        setOcrImages(prev => [...prev, { base64: base64String, mimeType: file.type, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleParseOCR = async () => {
    if (ocrImages.length === 0) {
      alert('Please upload at least one packing slip image.');
      return;
    }
    setIsParsingOCR(true);
    try {
      const res = await fetch('/api/parse-packing-slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: ocrImages })
      });
      const parsedSlips = await res.json();
      if (Array.isArray(parsedSlips)) {
        const newSlips: StationSlip[] = parsedSlips.map((s, idx) => ({
          id: 'slip_' + Date.now() + '_' + idx,
          stationName: s.stationName || 'MAA Normal Green',
          tapeType: s.tapeType || 'Normal',
          slipDate: s.slipDate || orderDate,
          driverName: s.driverName || 'Unknown Driver',
          driverPhone: s.driverPhone || '+91 98400 00000',
          grossWeight: Number(s.grossWeight || 0),
          tareWeight: Number(s.tareWeight || 0),
          netWeight: Number(s.netWeight || 0),
          totalBoxes: Number(s.totalBoxes || 0),
          items: s.items || []
        }));

        setSlips(prev => [...prev, ...newSlips]);

        setItemData(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            next[k] = { ...next[k], finalRecv: 0, kgs: 0 };
          });

          const allActiveSlips = [...slips, ...newSlips];
          allActiveSlips.forEach(slip => {
            slip.items.forEach(it => {
              const upper = it.itemName.toUpperCase();
              if (!next[upper]) {
                next[upper] = {
                  totalOrder: 0, finalRecv: 0, kgs: 0,
                  dhineshQty: 0, balaQty: 0, gopiQty: 0
                };
              }
              next[upper].finalRecv += Number(it.boxCount || 0);
              next[upper].kgs += Number(it.weightKgs || 0);
            });
          });

          return next;
        });

        setIsOCRModalOpen(false);
        setOcrImages([]);
      } else {
        alert('Failed to parse packing slips.');
      }
    } catch (e: any) {
      alert('Error in OCR parsing: ' + e.message);
    } finally {
      setIsParsingOCR(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userText = chatInput.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages(prev => [...prev, { role: 'user', text: userText, timestamp: timeStr }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: userText,
          currentState: { orderDate, slipsCount: slips.length }
        })
      });
      const data = await res.json();
      const replyText = data.message || 'Processed successfully.';
      
      if (data.updates && data.updates.itemModifications) {
        data.updates.itemModifications.forEach((mod: any) => {
          updateItemValue(mod.itemName, mod.field, mod.value);
        });
      }

      setChatMessages(prev => [...prev, { role: 'assistant', text: replyText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Error: ' + e.message, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDeleteSlip = (id: string) => {
    const updatedSlips = slips.filter(s => s.id !== id);
    setSlips(updatedSlips);
    setItemData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], finalRecv: 0, kgs: 0 };
      });
      updatedSlips.forEach(slip => {
        slip.items.forEach(it => {
          const upper = it.itemName.toUpperCase();
          if (next[upper]) {
            next[upper].finalRecv += Number(it.boxCount || 0);
            next[upper].kgs += Number(it.weightKgs || 0);
          }
        });
      });
      return next;
    });
  };

  const handleSaveRecord = () => {
    const recordId = 'rec_' + orderDate;
    const title = `Dispatch Report - ${orderDate}`;
    const newRecord = { id: recordId, date: orderDate, name: title, itemData, slips };
    const existing = savedRecords.filter(r => r.id !== recordId);
    const updated = [newRecord, ...existing];
    setSavedRecords(updated);
    localStorage.setItem('dispatch_records', JSON.stringify(updated));
    localStorage.setItem(recordId, JSON.stringify(newRecord));
    alert('Daily dispatch record saved successfully!');
  };

  const handleLoadRecord = (id: string) => {
    const raw = localStorage.getItem(id);
    if (raw) {
      const rec = JSON.parse(raw);
      setOrderDate(rec.date);
      setItemData(rec.itemData);
      setSlips(rec.slips || []);
      setCurrentView('consolidator');
    }
  };

  const handleFinalizeSubmit = () => {
    setIsSubmitted(true);
    handleSaveRecord();
    alert('Dispatch report successfully finalized and submitted!');
  };

  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `OVERALL FOR SALES\n`;
    csvContent += `ORDER DATE:,${orderDate},PACKING DATE:,${packingDate},SALES DATE:,${salesDate}\n\n`;
    csvContent += "SL.NO,SECTION,ITEMS,TOTAL ORDER,FINAL RECV,KGS,DHINESH QTY,DHINESH NOTE,BALA QTY,BALA NOTE,GOPI QTY,GOPI NOTE\n";

    const addRows = (items: string[], sectionName: string) => {
      items.forEach((name, idx) => {
        const row = itemData[name] || { totalOrder: 0, finalRecv: 0, kgs: 0, dhineshQty: 0, balaQty: 0, gopiQty: 0 };
        const kgsInt = row.kgs ? Math.round(row.kgs) : '';
        csvContent += `${idx + 1},"${sectionName}","${name}",${row.totalOrder || 0},${row.finalRecv || 0},${kgsInt},${row.dhineshQty || 0},,${row.balaQty || 0},,,${row.gopiQty || 0},\n`;
      });
    };

    addRows(SECTION_1_ITEMS, "Section 1");
    addRows(SECTION_2_ITEMS, "Section 2");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Overall_For_Sales_${orderDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalBoxesReceived = Object.values(itemData).reduce((sum, row) => sum + (Number(row.finalRecv) || 0), 0);
  const totalWeightKgs = Object.values(itemData).reduce((sum, row) => sum + (Number(row.kgs) || 0), 0);
  const activeItemsCount = Object.values(itemData).filter(row => (Number(row.totalOrder) > 0 || Number(row.finalRecv) > 0)).length;

  const expectedStations = ['MAA Normal Green', 'MAA Normal Blue', 'MAA Yellow Tape', 'TCY Normal', 'BANG Normal', 'COCHIN Normal'];
  const presentStations = slips.map(s => s.stationName);
  const missingStations = expectedStations.filter(st => !presentStations.some(p => p.toLowerCase().includes(st.toLowerCase().split(' ')[0])));

  const differenceSummaryItems = [...SECTION_2_ITEMS].map((name, idx) => {
    const item = itemData[name] || { totalOrder: 0, finalRecv: 0, kgs: 0 };
    const diff = item.finalRecv - item.totalOrder;
    return {
      slNo: idx + 1,
      itemName: name,
      totalOrder: item.totalOrder,
      finalRecv: item.finalRecv,
      difference: diff,
      remark: diff > 0 ? 'EXTRA' : diff < 0 ? 'LOW / SHORTAGE' : 'MATCHED'
    };
  }).filter(row => row.totalOrder > 0 && row.difference !== 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Top Header & Navigation Bar */}
      <header className="print:hidden bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentView !== 'dashboard' && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded transition border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight">OVERALL FOR SALES</h1>
              <p className="text-[11px] text-slate-400">Daily Produce & Export Dispatch Consolidator</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded shadow transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>AI WhatsApp Parser</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded shadow transition"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1.5 z-50 text-xs text-slate-200">
                  <button
                    onClick={() => { setCurrentView('dashboard'); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-400" />
                    <span>Dashboard Hub</span>
                  </button>
                  <button
                    onClick={() => { setCurrentView('consolidator'); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Consolidator Sheet</span>
                  </button>
                  <button
                    onClick={() => { setCurrentView('items_list'); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <ListFilter className="w-4 h-4 text-amber-400" />
                    <span>Items Details List</span>
                  </button>
                  <button
                    onClick={() => { setIsBulkEditModalOpen(true); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4 text-purple-400" />
                    <span>Bulk Edit Items</span>
                  </button>
                  <button
                    onClick={() => { setIsAIAssistantOpen(true); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4 text-pink-400" />
                    <span>Gemini AI Chat Assistant</span>
                  </button>
                  <button
                    onClick={() => { setCurrentView('saved_files'); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4 text-cyan-400" />
                    <span>Saved Files ({savedRecords.length})</span>
                  </button>
                  <div className="border-t border-slate-700 my-1"></div>
                  <button
                    onClick={() => { handleSaveRecord(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2 text-emerald-400 font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Current File</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs border border-slate-700">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              <span>Order:</span>
              <input
                type="date"
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
                className="bg-transparent text-white font-medium ml-1 outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {missingStations.length > 0 && currentView === 'consolidator' && (
          <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>Warning:</strong> Expected station slips not yet uploaded: {missingStations.join(', ')}</span>
            </div>
            <button onClick={() => setIsOCRModalOpen(true)} className="underline hover:text-white font-medium">Upload Now</button>
          </div>
        )}
      </header>

      {/* ================= VIEW 1: DASHBOARD HUB ================= */}
      {currentView === 'dashboard' && (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
              <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Export Dispatch Management</span>
              <h2 className="text-xl md:text-2xl font-black">OVERALL FOR SALES</h2>
              <p className="text-slate-300 text-xs max-w-xl">
                Consolidate wholesale vegetable, fruit, and flower orders against airport cargo packing slips with Gemini AI assistance.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 w-full md:w-auto">
              <button
                onClick={() => setCurrentView('consolidator')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Open Dispatch Consolidator Sheet</span>
              </button>
              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-xl shadow flex items-center justify-center gap-2 text-xs transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI WhatsApp Order Parser</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Catalog Items</div>
                <div className="text-lg font-bold text-slate-800">{ALL_ITEMS.length}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-600">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Station Slips</div>
                <div className="text-lg font-bold text-slate-800">{slips.length}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-purple-100 p-2.5 rounded-lg text-purple-600">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Saved Files</div>
                <div className="text-lg font-bold text-slate-800">{savedRecords.length}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-lg text-amber-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Order Date</div>
                <div className="text-xs font-bold text-slate-800">{orderDate}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Quick Actions & Tools</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="font-bold text-emerald-900 text-xs">AI WhatsApp Order Parser</h4>
                <p className="text-[11px] text-emerald-700">Paste buyer messages from Dhinesh, Bala, Gopi.</p>
              </button>

              <button
                onClick={() => setIsOCRModalOpen(true)}
                className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="font-bold text-blue-900 text-xs">AI Packing Slips OCR</h4>
                <p className="text-[11px] text-blue-700">Upload airport station slips for automated extraction.</p>
              </button>

              <button
                onClick={() => setIsBulkEditModalOpen(true)}
                className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <Edit3 className="w-5 h-5 text-purple-600" />
                  <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="font-bold text-purple-900 text-xs">Bulk Edit Items</h4>
                <p className="text-[11px] text-purple-700">Select multiple items and update quantities in batch.</p>
              </button>

              <button
                onClick={() => setIsAIAssistantOpen(true)}
                className="p-3.5 rounded-xl border border-pink-200 bg-pink-50/50 hover:bg-pink-50 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <Bot className="w-5 h-5 text-pink-600" />
                  <ChevronRight className="w-4 h-4 text-pink-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="font-bold text-pink-900 text-xs">Gemini AI Assistant</h4>
                <p className="text-[11px] text-pink-700">Multi-turn conversational assistant for data adjustments.</p>
              </button>

              <button
                onClick={() => setCurrentView('items_list')}
                className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <ListFilter className="w-5 h-5 text-amber-600" />
                  <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="font-bold text-amber-900 text-xs">Items Details List</h4>
                <p className="text-[11px] text-amber-700">Browse all catalog items with separate breakdown.</p>
              </button>

              <button
                onClick={() => setCurrentView('saved_files')}
                className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/50 hover:bg-cyan-50 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <FolderOpen className="w-5 h-5 text-cyan-600" />
                  <ChevronRight className="w-4 h-4 text-cyan-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="font-bold text-cyan-900 text-xs">Saved Files Manager</h4>
                <p className="text-[11px] text-cyan-700">Open, edit, and review past daily dispatch reports.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: ITEMS DETAILS SEPARATE LIST ================= */}
      {currentView === 'items_list' && (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-1 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
              <h2 className="text-lg font-bold text-slate-800">Master Items Details & Separate Breakdown</h2>
              <p className="text-xs text-slate-500">Comprehensive overview of all 70 items across Section 1 and Section 2.</p>
            </div>
            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition"
            >
              <Edit3 className="w-4 h-4" />
              <span>Bulk Edit Items</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white px-5 py-2.5 font-bold text-xs uppercase tracking-wider flex justify-between">
              <span>Section 1: Vegetables, Bananas & Flowers (Items 1 - 36)</span>
              <span>{SECTION_1_ITEMS.length} Items</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {SECTION_1_ITEMS.map((name, idx) => {
                const row = itemData[name] || { totalOrder: 0, finalRecv: 0, kgs: 0 };
                return (
                  <div key={name} className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400 w-6">#{idx + 1}</span>
                      <span className="font-bold text-slate-800 uppercase">{name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-600">
                      <div>Total Order: <strong className="text-slate-900">{row.totalOrder}</strong></div>
                      <div>Final Recv: <strong className="text-blue-600">{row.finalRecv}</strong></div>
                      <div>Kgs: <strong className="text-emerald-600">{row.kgs ? Math.round(row.kgs) : '0'} kg</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white px-5 py-2.5 font-bold text-xs uppercase tracking-wider flex justify-between">
              <span>Section 2: Special Vegetables, Fruits & Garlands (Items 1 - 34)</span>
              <span>{SECTION_2_ITEMS.length} Items</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {SECTION_2_ITEMS.map((name, idx) => {
                const row = itemData[name] || { totalOrder: 0, finalRecv: 0, kgs: 0 };
                return (
                  <div key={name} className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400 w-6">#{idx + 1}</span>
                      <span className="font-bold text-slate-800 uppercase">{name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-slate-600">
                      <div>Total Order: <strong className="text-slate-900">{row.totalOrder}</strong></div>
                      <div>Final Recv: <strong className="text-blue-600">{row.finalRecv}</strong></div>
                      <div>Kgs: <strong className="text-emerald-600">{row.kgs ? Math.round(row.kgs) : '0'} kg</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: SAVED FILES MANAGER ================= */}
      {currentView === 'saved_files' && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-1 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
              <h2 className="text-lg font-bold text-slate-800">Saved Dispatch Files</h2>
              <p className="text-xs text-slate-500">Manage, open, and edit your saved daily dispatch reports.</p>
            </div>
            <button
              onClick={handleSaveRecord}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Current Session</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {savedRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No saved dispatch files found. Click "Save Current Session" to store today's sheet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {savedRecords.map(rec => (
                  <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{rec.name}</div>
                      <div className="text-slate-500 text-[11px]">Dispatch Date: {rec.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadRecord(rec.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded transition flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Open Consolidator</span>
                      </button>
                      <button
                        onClick={() => {
                          const filtered = savedRecords.filter(r => r.id !== rec.id);
                          setSavedRecords(filtered);
                          localStorage.setItem('dispatch_records', JSON.stringify(filtered));
                          localStorage.removeItem(rec.id);
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 4: CONSOLIDATOR SHEET (PDF Format with Buyer Subcolumns QTY | [Blank]) ================= */}
      {currentView === 'consolidator' && (
        <main className="max-w-[210mm] mx-auto bg-white shadow-xl my-6 print:my-0 print:shadow-none animate-in fade-in duration-200">
          
          {/* SUMMARY CARD SECTION & ACTIONS AT THE TOP (Including AI WhatsApp Order Parse) */}
          <div className="print:hidden p-5 bg-slate-900 text-white border-b border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-base font-bold">Dispatch Summary Overview</h3>
                <p className="text-xs text-slate-400">Live aggregate statistics for order date {orderDate}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" /> AI WhatsApp Order Parse
                </button>
                {isSubmitted ? (
                  <div className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow">
                    <CheckCircle className="w-4 h-4" /> Submitted & Finalized
                  </div>
                ) : (
                  <button
                    onClick={handleFinalizeSubmit}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Submit & Finalize Dispatch
                  </button>
                )}
                <button
                  onClick={handleDownloadCSV}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex items-center gap-3">
                <div className="bg-blue-500/20 p-2.5 rounded-lg text-blue-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Total Boxes Received</div>
                  <div className="text-lg font-black text-white">{totalBoxesReceived} <span className="text-[11px] font-normal text-slate-400">boxes</span></div>
                </div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2.5 rounded-lg text-emerald-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Total Weight (Kgs)</div>
                  <div className="text-lg font-black text-white">{Math.round(totalWeightKgs)} <span className="text-[11px] font-normal text-slate-400">kgs</span></div>
                </div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex items-center gap-3">
                <div className="bg-purple-500/20 p-2.5 rounded-lg text-purple-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Active Items Count</div>
                  <div className="text-lg font-black text-white">{activeItemsCount} <span className="text-[11px] font-normal text-slate-400">items</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= PAGE 1 ================= */}
          <div className="p-6 md:p-8 page-container print:page-break-after-always min-h-[297mm] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="text-center mb-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-wider">OVERALL FOR SALES</h2>
                <div className="text-xs font-bold text-slate-800 mt-1 bg-slate-100 py-1 px-3 inline-block rounded border border-slate-300">
                  ORDER DATE: {orderDate} | PACKING DATE: {packingDate} | SALES DATE: {salesDate}
                </div>
              </div>

              <div className="mb-2 text-[11px] font-bold text-slate-800 bg-blue-50 px-3 py-1 border-l-4 border-[#2F75B5] flex justify-between items-center print:hidden">
                <span>SECTION 1: VEGETABLES, BANANAS & FLOWERS (ITEMS 1 - 36)</span>
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="text-[10px] bg-purple-600 text-white font-semibold px-2 py-0.5 rounded hover:bg-purple-500 transition flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Bulk Edit
                </button>
              </div>

              {/* TABLE FOR PAGE 1 WITH BUYER SUBCOLUMNS (QTY | [Blank]) */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-[1.5px] border-black text-[11px]">
                  <thead>
                    <tr className="bg-[#2F75B5] text-white text-center font-bold">
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-9" rowSpan={2}>SL.NO</th>
                      <th className="border-[1.5px] border-black py-1.5 px-2 text-left" rowSpan={2}>ITEMS</th>
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-14" rowSpan={2}>TOTAL ORDER</th>
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-14" rowSpan={2}>FINAL RECV.</th>
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-14" rowSpan={2}>KGS</th>
                      <th className="border-[1.5px] border-black py-1 px-1 bg-[#255f96]" colSpan={2}>DHINESH</th>
                      <th className="border-[1.5px] border-black py-1 px-1 bg-[#1e4e79]" colSpan={2}>BALA</th>
                      <th className="border-[1.5px] border-black py-1 px-1 bg-[#183d5d]" colSpan={2}>GOPI</th>
                    </tr>
                    <tr className="bg-[#418ab3] text-white text-center font-semibold text-[10px]">
                      <th className="border-[1.5px] border-black py-0.5 w-10">QTY</th>
                      <th className="border-[1.5px] border-black py-0.5 w-8"></th>
                      <th className="border-[1.5px] border-black py-0.5 w-10">QTY</th>
                      <th className="border-[1.5px] border-black py-0.5 w-8"></th>
                      <th className="border-[1.5px] border-black py-0.5 w-10">QTY</th>
                      <th className="border-[1.5px] border-black py-0.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTION_1_ITEMS.map((name, index) => {
                      const row = itemData[name] || { totalOrder: 0, finalRecv: 0, kgs: 0, dhineshQty: 0, balaQty: 0, gopiQty: 0 };
                      const kgsInt = row.kgs ? Math.round(row.kgs) : '';
                      return (
                        <tr key={name} className="hover:bg-slate-50 h-[22px]">
                          <td className="border-[1.5px] border-black text-center font-medium py-0.5">{index + 1}</td>
                          <td className="border-[1.5px] border-black px-2 font-semibold uppercase py-0.5">{name}</td>
                          <td className="border-[1.5px] border-black text-center font-bold bg-slate-100 py-0.5">{row.totalOrder || ''}</td>
                          <td className="border-[1.5px] border-black text-center font-bold text-blue-800 bg-blue-50/50 py-0.5">{row.finalRecv || ''}</td>
                          <td className="border-[1.5px] border-black text-center font-bold text-emerald-800 bg-emerald-50/50 py-0.5">{kgsInt}</td>
                          
                          {/* Dhinesh Qty & Blank */}
                          <td className="border-[1.5px] border-black text-center p-0">
                            <input
                              type="number"
                              value={row.dhineshQty || ''}
                              onChange={e => updateItemValue(name, 'dhineshQty', Number(e.target.value))}
                              className="w-full text-center bg-transparent py-0.5 outline-none focus:bg-yellow-50 font-medium"
                            />
                          </td>
                          <td className="border-[1.5px] border-black text-center bg-slate-50/30"></td>

                          {/* Bala Qty & Blank */}
                          <td className="border-[1.5px] border-black text-center p-0">
                            <input
                              type="number"
                              value={row.balaQty || ''}
                              onChange={e => updateItemValue(name, 'balaQty', Number(e.target.value))}
                              className="w-full text-center bg-transparent py-0.5 outline-none focus:bg-yellow-50 font-medium"
                            />
                          </td>
                          <td className="border-[1.5px] border-black text-center bg-slate-50/30"></td>

                          {/* Gopi Qty & Blank */}
                          <td className="border-[1.5px] border-black text-center p-0">
                            <input
                              type="number"
                              value={row.gopiQty || ''}
                              onChange={e => updateItemValue(name, 'gopiQty', Number(e.target.value))}
                              className="w-full text-center bg-transparent py-0.5 outline-none focus:bg-yellow-50 font-medium"
                            />
                          </td>
                          <td className="border-[1.5px] border-black text-center bg-slate-50/30"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-400 mt-4 pt-2 border-t border-slate-200">
              Page 1 of 2 — Export Dispatch Consolidator
            </div>
          </div>

          <div className="print:page-break-before"></div>

          {/* ================= PAGE 2 ================= */}
          <div className="p-6 md:p-8 page-container min-h-[297mm] flex flex-col justify-between">
            <div>
              <div className="text-center mb-3">
                <h2 className="text-xl font-black text-slate-900 tracking-wider">OVERALL FOR SALES</h2>
                <div className="text-xs font-bold text-slate-800 mt-1 bg-slate-100 py-1 px-3 inline-block rounded border border-slate-300">
                  ORDER DATE: {orderDate} | PACKING DATE: {packingDate} | SALES DATE: {salesDate}
                </div>
              </div>

              <div className="mb-2 text-[11px] font-bold text-slate-800 bg-blue-50 px-3 py-1 border-l-4 border-[#2F75B5] flex justify-between items-center print:hidden">
                <span>SECTION 2: SPECIAL VEGETABLES, FRUITS & GARLANDS (ITEMS 1 - 34)</span>
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="text-[10px] bg-purple-600 text-white font-semibold px-2 py-0.5 rounded hover:bg-purple-500 transition flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Bulk Edit
                </button>
              </div>

              {/* TABLE FOR PAGE 2 WITH BUYER SUBCOLUMNS (QTY | [Blank]) */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse border-[1.5px] border-black text-[11px]">
                  <thead>
                    <tr className="bg-[#2F75B5] text-white text-center font-bold">
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-9" rowSpan={2}>SL.NO</th>
                      <th className="border-[1.5px] border-black py-1.5 px-2 text-left" rowSpan={2}>ITEMS</th>
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-14" rowSpan={2}>TOTAL ORDER</th>
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-14" rowSpan={2}>FINAL RECV.</th>
                      <th className="border-[1.5px] border-black py-1.5 px-1 w-14" rowSpan={2}>KGS</th>
                      <th className="border-[1.5px] border-black py-1 px-1 bg-[#255f96]" colSpan={2}>DHINESH</th>
                      <th className="border-[1.5px] border-black py-1 px-1 bg-[#1e4e79]" colSpan={2}>BALA</th>
                      <th className="border-[1.5px] border-black py-1 px-1 bg-[#183d5d]" colSpan={2}>GOPI</th>
                    </tr>
                    <tr className="bg-[#418ab3] text-white text-center font-semibold text-[10px]">
                      <th className="border-[1.5px] border-black py-0.5 w-10">QTY</th>
                      <th className="border-[1.5px] border-black py-0.5 w-8"></th>
                      <th className="border-[1.5px] border-black py-0.5 w-10">QTY</th>
                      <th className="border-[1.5px] border-black py-0.5 w-8"></th>
                      <th className="border-[1.5px] border-black py-0.5 w-10">QTY</th>
                      <th className="border-[1.5px] border-black py-0.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTION_2_ITEMS.map((name, index) => {
                      const row = itemData[name] || { totalOrder: 0, finalRecv: 0, kgs: 0, dhineshQty: 0, balaQty: 0, gopiQty: 0 };
                      const kgsInt = row.kgs ? Math.round(row.kgs) : '';
                      return (
                        <tr key={name} className="hover:bg-slate-50 h-[22px]">
                          <td className="border-[1.5px] border-black text-center font-medium py-0.5">{index + 1}</td>
                          <td className="border-[1.5px] border-black px-2 font-semibold uppercase py-0.5">{name}</td>
                          <td className="border-[1.5px] border-black text-center font-bold bg-slate-100 py-0.5">{row.totalOrder || ''}</td>
                          <td className="border-[1.5px] border-black text-center font-bold text-blue-800 bg-blue-50/50 py-0.5">{row.finalRecv || ''}</td>
                          <td className="border-[1.5px] border-black text-center font-bold text-emerald-800 bg-emerald-50/50 py-0.5">{kgsInt}</td>
                          
                          {/* Dhinesh Qty & Blank */}
                          <td className="border-[1.5px] border-black text-center p-0">
                            <input
                              type="number"
                              value={row.dhineshQty || ''}
                              onChange={e => updateItemValue(name, 'dhineshQty', Number(e.target.value))}
                              className="w-full text-center bg-transparent py-0.5 outline-none focus:bg-yellow-50 font-medium"
                            />
                          </td>
                          <td className="border-[1.5px] border-black text-center bg-slate-50/30"></td>

                          {/* Bala Qty & Blank */}
                          <td className="border-[1.5px] border-black text-center p-0">
                            <input
                              type="number"
                              value={row.balaQty || ''}
                              onChange={e => updateItemValue(name, 'balaQty', Number(e.target.value))}
                              className="w-full text-center bg-transparent py-0.5 outline-none focus:bg-yellow-50 font-medium"
                            />
                          </td>
                          <td className="border-[1.5px] border-black text-center bg-slate-50/30"></td>

                          {/* Gopi Qty & Blank */}
                          <td className="border-[1.5px] border-black text-center p-0">
                            <input
                              type="number"
                              value={row.gopiQty || ''}
                              onChange={e => updateItemValue(name, 'gopiQty', Number(e.target.value))}
                              className="w-full text-center bg-transparent py-0.5 outline-none focus:bg-yellow-50 font-medium"
                            />
                          </td>
                          <td className="border-[1.5px] border-black text-center bg-slate-50/30"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SHORTAGES & DIFFERENCE SUMMARY TABLE */}
              <div className="mt-4">
                <div className="bg-[#2F75B5] text-white text-xs font-bold px-3 py-1.5 flex justify-between items-center">
                  <span>SHORTAGES & DIFFERENCE SUMMARY (EXTRA + / LOW -)</span>
                  <span className="text-[10px] bg-blue-800 px-2 py-0.5 rounded">Formula: Final Recv - Total Order</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border-[1.5px] border-black text-[11px]">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 text-center font-bold">
                        <th className="border-[1.5px] border-black py-1 px-1 w-10">SL.NO</th>
                        <th className="border-[1.5px] border-black py-1 px-2 text-left">ITEM NAME</th>
                        <th className="border-[1.5px] border-black py-1 px-2 w-24">TOTAL ORDER</th>
                        <th className="border-[1.5px] border-black py-1 px-2 w-24">FINAL RECV.</th>
                        <th className="border-[1.5px] border-black py-1 px-2 w-24">DIFFERENCE</th>
                        <th className="border-[1.5px] border-black py-1 px-3 text-left">REMARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {differenceSummaryItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border-[1.5px] border-black text-center py-2 text-slate-500 italic">
                            No shortages or differences detected (all orders perfectly matched or unpacked).
                          </td>
                        </tr>
                      ) : (
                        differenceSummaryItems.map((row, idx) => (
                          <tr key={row.itemName} className="hover:bg-slate-50">
                            <td className="border-[1.5px] border-black text-center py-1">{idx + 1}</td>
                            <td className="border-[1.5px] border-black px-2 font-bold uppercase py-1">{row.itemName}</td>
                            <td className="border-[1.5px] border-black text-center py-1">{row.totalOrder}</td>
                            <td className="border-[1.5px] border-black text-center py-1">{row.finalRecv}</td>
                            <td className={`border-[1.5px] border-black text-center font-extrabold py-1 ${row.difference > 0 ? 'text-[#0B6623]' : 'text-[#B22222]'}`}>
                              {row.difference > 0 ? `+${row.difference}` : row.difference}
                            </td>
                            <td className={`border-[1.5px] border-black px-3 font-bold py-1 ${row.difference > 0 ? 'text-[#0B6623]' : 'text-[#B22222]'}`}>
                              {row.remark}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="print:hidden mt-6 flex justify-end gap-3">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2.5 rounded shadow transition"
              >
                <Download className="w-4 h-4" />
                <span>Download as CSV</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 rounded shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>

            <div className="text-right text-[10px] text-slate-400 mt-6 pt-2 border-t border-slate-200">
              Page 2 of 2 — Export Dispatch Consolidator
            </div>
          </div>

        </main>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Bulk Edit Modal Overlay */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-purple-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-lg">Bulk Edit Items (Received & Weights)</h3>
              </div>
              <button onClick={() => setIsBulkEditModalOpen(false)} className="text-purple-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-600">
                Select items from the checkbox list below, choose whether to update <strong>Final Received (boxes)</strong> or <strong>Kgs</strong>, and apply values in batch.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Field</label>
                  <select
                    value={bulkTargetField}
                    onChange={e => setBulkTargetField(e.target.value as 'finalRecv' | 'kgs')}
                    className="w-full text-xs p-2 border rounded border-slate-300 bg-white font-medium"
                  >
                    <option value="finalRecv">Final Received (Boxes)</option>
                    <option value="kgs">Weight (Kgs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operation Mode</label>
                  <select
                    value={bulkMode}
                    onChange={e => setBulkMode(e.target.value as 'set' | 'add')}
                    className="w-full text-xs p-2 border rounded border-slate-300 bg-white font-medium"
                  >
                    <option value="set">Set exact value</option>
                    <option value="add">Add / Increment value</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Value</label>
                  <input
                    type="number"
                    value={bulkValue}
                    onChange={e => setBulkValue(Number(e.target.value))}
                    className="w-full text-xs p-2 border rounded border-slate-300 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-slate-700">
                  Selected: <span className="text-purple-600">{bulkSelectedItems.length}</span> of {ALL_ITEMS.length} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkSelectedItems([...ALL_ITEMS])}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => setBulkSelectedItems([])}
                    className="text-slate-600 hover:underline font-semibold"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 max-h-60 overflow-y-auto space-y-1">
                {ALL_ITEMS.map(name => {
                  const isChecked = bulkSelectedItems.includes(name);
                  return (
                    <div
                      key={name}
                      onClick={() => {
                        if (isChecked) {
                          setBulkSelectedItems(bulkSelectedItems.filter(i => i !== name));
                        } else {
                          setBulkSelectedItems([...bulkSelectedItems, name]);
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer text-xs transition ${isChecked ? 'bg-purple-50 border border-purple-200' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-semibold text-slate-800 uppercase">{name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Current: {bulkTargetField === 'finalRecv' ? (itemData[name]?.finalRecv || 0) : Math.round(itemData[name]?.kgs || 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkEdit}
                disabled={bulkSelectedItems.length === 0}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-5 py-2 rounded shadow transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Apply Bulk Edit ({bulkSelectedItems.length} items)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Gemini AI Chat Assistant Modal */}
      {isAIAssistantOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col h-[600px]">
            <div className="bg-pink-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-pink-300" />
                <h3 className="font-bold text-lg">Gemini AI Chat Assistant</h3>
              </div>
              <button onClick={() => setIsAIAssistantOpen(false)} className="text-pink-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={chatScrollRef} className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-50">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none font-medium'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl w-fit border border-slate-200 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-600" />
                  <span>Gemini is reasoning...</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 shrink-0 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Ask Gemini to adjust quantities or check orders..."
                className="flex-1 text-xs px-3.5 py-2.5 border rounded-xl border-slate-300 focus:ring-2 focus:ring-pink-500 outline-none"
              />
              <button
                onClick={handleSendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-50 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. WhatsApp Parser Modal */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg">AI WhatsApp Order Parser</h3>
              </div>
              <button onClick={() => setIsWhatsAppModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-600">
                  Paste raw WhatsApp orders below. Gemini AI will automatically identify buyers, parse quantities & sizes, and populate the dispatch table.
                </p>
                <button
                  onClick={loadSampleWhatsApp}
                  className="text-xs bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 px-3 py-1.5 rounded border border-slate-300 transition"
                >
                  Load Sample WhatsApp
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dhinesh (+65 9812 3585)</label>
                  <textarea
                    rows={6}
                    value={dhineshText}
                    onChange={e => setDhineshText(e.target.value)}
                    placeholder="Paste Dhinesh order here..."
                    className="w-full text-xs p-2.5 border rounded border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bala (+91 80566 72224)</label>
                  <textarea
                    rows={6}
                    value={balaText}
                    onChange={e => setBalaText(e.target.value)}
                    placeholder="Paste Bala order here..."
                    className="w-full text-xs p-2.5 border rounded border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gopi (+65 8213 0750)</label>
                  <textarea
                    rows={6}
                    value={gopiText}
                    onChange={e => setGopiText(e.target.value)}
                    placeholder="Paste Gopi order here..."
                    className="w-full text-xs p-2.5 border rounded border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleParseWhatsApp}
                disabled={isParsingWhatsApp}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2 rounded shadow transition disabled:opacity-50"
              >
                {isParsingWhatsApp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isParsingWhatsApp ? 'Parsing Orders with Gemini...' : 'Parse & Populate Orders'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Packing Slip Vision OCR Modal */}
      {isOCRModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg">AI Packing Slip Vision OCR</h3>
              </div>
              <button onClick={() => setIsOCRModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Upload airport station cargo slips. Gemini Vision will extract station name, driver info, and item box/weight counts.
              </p>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition bg-slate-50">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handleImageUpload(e)}
                  className="hidden"
                  id="slip-file-input"
                />
                <label htmlFor="slip-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-blue-500" />
                  <span className="text-xs font-bold text-slate-700">Click to upload packing slip images</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, WEBP accepted</span>
                </label>
              </div>

              {ocrImages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Uploaded Slips ({ocrImages.length}):</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                    {ocrImages.map((img, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded text-xs">
                        <span className="font-medium text-slate-700 truncate">{img.name}</span>
                        <button
                          onClick={() => setOcrImages(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsOCRModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleParseOCR}
                disabled={isParsingOCR || ocrImages.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2 rounded shadow transition disabled:opacity-50"
              >
                {isParsingOCR ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isParsingOCR ? 'Extracting with Gemini Vision...' : 'Run Vision OCR & Reconcile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Station Slips Manager Modal */}
      {isSlipsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg">Station Slips Breakdown & Driver Details</h3>
              </div>
              <button onClick={() => setIsSlipsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {slips.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No station packing slips uploaded yet. Use "AI Packing Slips OCR" to upload and parse slips.
                </div>
              ) : (
                slips.map(slip => (
                  <div key={slip.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">{slip.stationName}</span>
                          <span className="text-xs text-slate-500">Tape: {slip.tapeType} | Date: {slip.slipDate}</span>
                        </div>
                        <div className="text-xs text-slate-700 mt-1 flex items-center gap-4">
                          <span>Driver: <strong>{slip.driverName}</strong> ({slip.driverPhone})</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSlip(slip.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Slip</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-white p-2.5 rounded border border-slate-200 text-xs text-center font-semibold">
                      <div>Total Boxes: <span className="text-blue-600">{slip.totalBoxes}</span></div>
                      <div>Gross Wt: <span className="text-slate-700">{slip.grossWeight} kg</span></div>
                      <div>Tare Wt: <span className="text-slate-700">{slip.tareWeight} kg</span></div>
                      <div>Net Wt: <span className="text-emerald-700">{slip.netWeight} kg</span></div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-600">Items in this slip ({slip.items.length}):</span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-1">
                        {slip.items.map((it, idx) => (
                          <div key={idx} className="bg-white px-2.5 py-1 rounded border border-slate-200 text-xs flex justify-between">
                            <span className="font-medium text-slate-800">{it.itemName}</span>
                            <span className="text-slate-600">{it.boxCount} box / {it.weightKgs}kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsSlipsModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Rules */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:page-break-before {
            page-break-before: always;
            break-before: page;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          input {
            border: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
