/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  QrCode, 
  Scan, 
  Sun, 
  Moon, 
  Download, 
  Copy, 
  Share2, 
  Link as LinkIcon, 
  Type, 
  Wifi, 
  Mail, 
  Phone, 
  MapPin,
  History,
  Trash2,
  Check,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Info,
  User,
  MessageCircle,
  FileText,
  AppWindow,
  Layers,
  ChevronRight,
  Palette,
  Sparkles,
  PlaneTakeoff,
  Layout,
  Shapes,
  Globe,
  Building,
  Briefcase,
  Shield,
  Plus,
  AlertCircle,
  RotateCcw,
  Camera,
  Upload,
  SwitchCamera,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import QRCodeStyling from 'qr-code-styling';
import { toPng, toBlob } from 'html-to-image';
import jsQR from 'jsqr';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---
type Tab = 'generator' | 'scanner' | 'history';
type QRType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'contact' | 'whatsapp' | 'pdf' | 'app' | 'location' | 'multi';
type QRFrame = 'none' | 'circle' | 'text-below' | 'box-bottom' | 'box-top' | 'bubble' | 'corners';
type QRPattern = 'square' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded';

interface QRHistoryItem {
  id: string;
  type: 'generated' | 'scanned';
  content: string;
  timestamp: number;
  label?: string;
}

interface QRTemplate {
  id: string;
  name: string;
  fgColor: string;
  bgColor: string;
  level: 'L' | 'M' | 'Q' | 'H';
  logoSize?: number;
}

// --- Hooks ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Constants ---

const QR_OPTIONS = [
  { id: 'url', label: 'URL', icon: LinkIcon, description: 'Link to any website or online resource.' },
  { id: 'text', label: 'Text', icon: Type, description: 'Plain text message or note.' },
  { id: 'wifi', label: 'WiFi', icon: Wifi, description: 'Connect to a wireless network automatically.' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Send an email with a predefined subject and body.' },
  { id: 'phone', label: 'Phone', icon: Phone, description: 'Dial a phone number instantly.' },
  { id: 'sms', label: 'SMS', icon: MessageSquare, description: 'Send a pre-filled text message.' },
  { id: 'contact', label: 'Contact', icon: User, description: 'Share contact details (vCard).' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, description: 'Start a WhatsApp chat with a specific number.' },
  { id: 'pdf', label: 'PDF', icon: FileText, description: 'Link to a PDF document hosted online.' },
  { id: 'app', label: 'App', icon: AppWindow, description: 'Link to an app on the App Store or Play Store.' },
  { id: 'location', label: 'Location', icon: MapPin, description: 'Coordinates that open in Google or Apple Maps.' },
  { id: 'multi', label: 'Multi URL', icon: Layers, description: 'A list of multiple links (e.g., Linktree-style).' },
] as const;

const QR_TEMPLATES: (QRTemplate & { logo?: string })[] = [
  { id: 'default', name: 'Default B&W', fgColor: '#000000', bgColor: '#ffffff', level: 'H' },
  { id: 'facebook', name: 'Facebook', fgColor: '#1877F2', bgColor: '#ffffff', level: 'H', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg', logoSize: 1 },
  { id: 'instagram', name: 'Instagram', fgColor: 'url(#instagram-gradient)', bgColor: '#ffffff', level: 'H', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg', logoSize: 1 },
  { id: 'whatsapp_template', name: 'WhatsApp', fgColor: '#25D366', bgColor: '#ffffff', level: 'H', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg', logoSize: 1 },
  { id: 'telegram_template', name: 'Telegram', fgColor: '#0088cc', bgColor: '#ffffff', level: 'H', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg', logoSize: 1 },
  { id: 'twitter_old', name: 'Twitter (Old)', fgColor: '#1DA1F2', bgColor: '#ffffff', level: 'H', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg', logoSize: 1 },
  { id: 'x_new', name: 'X (Twitter)', fgColor: '#000000', bgColor: '#ffffff', level: 'H', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg', logoSize: 1 },
  { id: 'rocket', name: 'Rocket', fgColor: 'url(#rocket-gradient)', bgColor: '#ffffff', level: 'H', logo: 'https://cdn-icons-png.flaticon.com/512/1042/1042339.png', logoSize: 1 },
  { id: 'shopping', name: 'Shopping', fgColor: '#fb7185', bgColor: '#1f2937', level: 'H', logo: 'https://cdn-icons-png.flaticon.com/512/1170/1170678.png', logoSize: 1 },
  { id: 'chat', name: 'Chat Style', fgColor: '#2563eb', bgColor: '#ffffff', level: 'H', logo: 'https://cdn-icons-png.flaticon.com/512/134/134914.png', logoSize: 1 },
  { 
    id: 'media', 
    name: 'Media Style', 
    fgColor: '#2563eb', 
    bgColor: '#ffffff', 
    level: 'H', 
    logo: 'https://cdn-icons-png.flaticon.com/512/1179/1179069.png',
    logoSize: 1
  },
  { id: 'youtube', name: 'YouTube', fgColor: '#FF0000', bgColor: '#ffffff', level: 'H', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg', logoSize: 1 },
  { id: 'hindu', name: 'Hindu Theme', fgColor: '#FF8C00', bgColor: '#ffffff', level: 'H', logo: 'om', logoSize: 1.2 },
  { id: 'tricolour', name: 'Indian Tricolour', fgColor: 'url(#indian-gradient)', bgColor: '#ffffff', level: 'H' },
  { id: 'info', name: 'Info Style', fgColor: '#000000', bgColor: '#ffffff', level: 'H', logo: 'https://cdn-icons-png.flaticon.com/512/1828/1828940.png', logoSize: 1 },
  { id: 'amber-black', name: 'Amber Black', fgColor: '#f59e0b', bgColor: '#000000', level: 'H' },
  { id: 'orange', name: 'Orange', fgColor: '#FF8C00', bgColor: '#ffffff', level: 'H' },
  { id: 'purple', name: 'Purple Gradient', fgColor: '#8A2BE2', bgColor: '#ffffff', level: 'H' },
  { id: 'green', name: 'Green Gradient', fgColor: '#008000', bgColor: '#ffffff', level: 'H' },
  { id: 'ocean', name: 'Ocean Blue', fgColor: '#0077be', bgColor: '#ffffff', level: 'H' },
  { id: 'midnight', name: 'Midnight', fgColor: '#191970', bgColor: '#ffffff', level: 'H' },
  { id: 'sunset', name: 'Sunset', fgColor: '#fd5e53', bgColor: '#ffffff', level: 'H' },
];

const QR_FRAMES: { id: QRFrame; label: string }[] = [
  { id: 'none', label: 'No Frame' },
  { id: 'circle', label: 'Circle' },
  { id: 'text-below', label: 'Text Below' },
  { id: 'box-bottom', label: 'Box Bottom' },
  { id: 'box-top', label: 'Box Top' },
  { id: 'bubble', label: 'Bubble' },
  { id: 'corners', label: 'Corners' },
];

const QR_PATTERNS: { id: QRPattern; label: string }[] = [
  { id: 'square', label: 'Classic' },
  { id: 'rounded', label: 'Smooth' },
  { id: 'classy-rounded', label: 'Organic' },
  { id: 'extra-rounded', label: 'Circles' },
];

// --- Components ---

const GlobalGradients = () => (
  <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
    <defs>
      <linearGradient id="indian-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FF9933" />
        <stop offset="40%" stopColor="#FF9933" />
        <stop offset="45%" stopColor="#000080" />
        <stop offset="55%" stopColor="#000080" />
        <stop offset="60%" stopColor="#128807" />
        <stop offset="100%" stopColor="#128807" />
      </linearGradient>
      <linearGradient id="rocket-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="25%" stopColor="#38bdf8" />
        <stop offset="75%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#fb923c" />
      </linearGradient>
      <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
      <linearGradient id="om-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C00" />
        <stop offset="100%" stopColor="#FF4500" />
      </linearGradient>
    </defs>
  </svg>
);

const Logo = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex items-center gap-3 group cursor-pointer" onClick={scrollToTop}>
      <div className="relative">
        {/* Main Icon Container with Gradient */}
        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center">
          <div className="relative">
            {/* Primary Tool Icon */}
            <PlaneTakeoff className="w-7 h-7 text-white" />
            
            {/* Secondary "Badge" Icon (QR instead of FileText) */}
            <div className="absolute -bottom-1 -right-1 bg-white rounded-md p-0.5 shadow-sm">
              <QrCode className="w-3 h-3 text-blue-600" />
            </div>
          </div>
        </div>
        
        {/* Decorative Accent Icon */}
        <div className="absolute -top-1.5 -right-1.5">
          <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        </div>
      </div>

      {/* Typography Style */}
      <span className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        QR<span className="text-blue-600">Pilot</span>
      </span>
    </div>
  );
};

const Header = React.memo(({ isDarkMode, toggleDarkMode, onInfoClick }: { isDarkMode: boolean; toggleDarkMode: () => void; onInfoClick: () => void }) => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 h-20 flex items-center justify-center">
    <div className="max-w-2xl lg:max-w-5xl w-full px-6 flex items-center justify-between">
      <Logo isDarkMode={isDarkMode} />
      <div className="flex items-center gap-3">
        <button 
          onClick={onInfoClick}
          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 active:scale-95 shadow-sm"
          aria-label="App Information"
        >
          <Info size={20} />
        </button>
        <button 
          onClick={toggleDarkMode}
          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 active:scale-95 shadow-sm"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  </header>
));

const InfoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl">
              <Info size={24} />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight dark:text-white">About QRPilot</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              QRPilot is a modern, all-in-one QR code generator and scanner designed for speed, privacy, and deep customization. Everything happens locally in your browser.
            </p>
            
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Main Features</h3>
              <ul className="grid grid-cols-1 gap-2">
                {[
                  'Advanced QR Generation (URL, WiFi, vCard)',
                  'Custom Templates & Styling',
                  'Real-time Camera Scanner',
                  'Image Upload Scanning',
                  'Scan & Generation History',
                  'High-resolution PNG Export'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Created with passion by <span className="font-bold text-slate-900 dark:text-white">Sahil Khatkar</span>
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-2">
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Footer = React.memo(({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (tab: Tab) => void }) => (
  <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 px-8 h-24 flex items-center justify-center pb-safe">
    <div className="max-w-2xl lg:max-w-5xl w-full flex items-center justify-around">
      <button 
        onClick={() => setActiveTab('generator')}
        className={cn(
          "flex flex-col items-center gap-1.5 transition-all group relative",
          activeTab === 'generator' ? "text-brand-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        )}
      >
        <div className={cn(
          "p-2 rounded-xl transition-all",
          activeTab === 'generator' ? "bg-brand-50 dark:bg-brand-900/20" : "group-hover:bg-slate-100 dark:group-hover:bg-slate-900"
        )}>
          <QrCode size={24} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">Generator</span>
        {activeTab === 'generator' && <motion.div layoutId="nav-pill" className="absolute -bottom-2 w-1 h-1 bg-brand-500 rounded-full" />}
      </button>
      <button 
        onClick={() => setActiveTab('scanner')}
        className={cn(
          "flex flex-col items-center gap-1.5 transition-all group relative",
          activeTab === 'scanner' ? "text-brand-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        )}
      >
        <div className={cn(
          "p-2 rounded-xl transition-all",
          activeTab === 'scanner' ? "bg-brand-50 dark:bg-brand-900/20" : "group-hover:bg-slate-100 dark:group-hover:bg-slate-900"
        )}>
          <Scan size={24} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">Scanner</span>
        {activeTab === 'scanner' && <motion.div layoutId="nav-pill" className="absolute -bottom-2 w-1 h-1 bg-brand-500 rounded-full" />}
      </button>
      <button 
        onClick={() => setActiveTab('history')}
        className={cn(
          "flex flex-col items-center gap-1.5 transition-all group relative",
          activeTab === 'history' ? "text-brand-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        )}
      >
        <div className={cn(
          "p-2 rounded-xl transition-all",
          activeTab === 'history' ? "bg-brand-50 dark:bg-brand-900/20" : "group-hover:bg-slate-100 dark:group-hover:bg-slate-900"
        )}>
          <History size={24} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        {activeTab === 'history' && <motion.div layoutId="nav-pill" className="absolute -bottom-2 w-1 h-1 bg-brand-500 rounded-full" />}
      </button>
    </div>
  </footer>
));

const QRRenderer = ({ 
  value, 
  size, 
  fgColor, 
  bgColor, 
  level, 
  logo, 
  logoSize = 1,
  pattern = 'square' as QRPattern,
  frame = 'none' as QRFrame,
  frameText = 'SCAN ME'
}: { 
  value: string; 
  size: number; 
  fgColor: string; 
  bgColor: string; 
  level: string; 
  logo?: string;
  logoSize?: number;
  pattern?: QRPattern;
  frame?: QRFrame;
  frameText?: string;
  key?: string | number;
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);

  // Debounce only colors and pattern to keep UI smooth, but keep value instant for accuracy
  const debouncedFgColor = useDebounce(fgColor, 150);
  const debouncedBgColor = useDebounce(bgColor, 150);
  const debouncedPattern = useDebounce(pattern, 150);

  useEffect(() => {
    if (typeof window === 'undefined' || !qrRef.current) return;

    const isGradient = debouncedFgColor.startsWith('url');
    const options: any = {
      width: size,
      height: size,
      type: 'svg',
      data: value || 'QRPilot',
      image: logo,
      dotsOptions: {
        color: isGradient ? undefined : debouncedFgColor,
        type: debouncedPattern,
        gradient: debouncedFgColor === 'url(#indian-gradient)' ? {
          type: 'linear',
          rotation: Math.PI / 2,
          colorStops: [
            { offset: 0, color: '#FF9933' },
            { offset: 0.4, color: '#FF9933' },
            { offset: 0.45, color: '#000080' },
            { offset: 0.55, color: '#000080' },
            { offset: 0.6, color: '#128807' },
            { offset: 1, color: '#128807' }
          ]
        } : debouncedFgColor === 'url(#rocket-gradient)' ? {
          type: 'linear',
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: '#fb923c' },
            { offset: 0.25, color: '#38bdf8' },
            { offset: 0.75, color: '#38bdf8' },
            { offset: 1, color: '#fb923c' }
          ]
        } : debouncedFgColor === 'url(#instagram-gradient)' ? {
          type: 'linear',
          rotation: -Math.PI / 4,
          colorStops: [
            { offset: 0, color: '#f09433' },
            { offset: 0.25, color: '#e6683c' },
            { offset: 0.5, color: '#dc2743' },
            { offset: 0.75, color: '#cc2366' },
            { offset: 1, color: '#bc1888' }
          ]
        } : undefined
      },
      backgroundOptions: {
        color: debouncedBgColor,
      },
      cornersSquareOptions: {
        type: 'square',
        color: isGradient ? undefined : debouncedFgColor,
      },
      cornersDotOptions: {
        type: 'square',
        color: isGradient ? undefined : debouncedFgColor,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 5,
        imageSize: 0.40 * (logoSize || 1)
      },
      qrOptions: {
        errorCorrectionLevel: 'H'
      }
    };

    if (!qrCodeInstance.current) {
      qrCodeInstance.current = new QRCodeStyling(options);
      qrCodeInstance.current.append(qrRef.current);
    } else {
      qrCodeInstance.current.update(options);
    }
  }, [value, size, debouncedFgColor, debouncedBgColor, level, logo, logoSize, debouncedPattern]);

  // Handle frame changes separately as they affect the container
  useEffect(() => {
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      if (qrCodeInstance.current) {
        qrCodeInstance.current.append(qrRef.current);
      }
    }
  }, [frame]);

  const renderFrame = () => {
    const isGradient = fgColor.startsWith('url');
    const displayColor = isGradient ? (fgColor.includes('indian') ? '#FF9933' : fgColor.includes('instagram') ? '#e6683c' : '#38bdf8') : fgColor;
    
    const frameStyle = {
      borderColor: displayColor,
      color: displayColor,
    };

    switch (frame) {
      case 'circle':
        return (
          <div className="relative p-12 rounded-full border-4 flex items-center justify-center bg-white shadow-inner" style={frameStyle}>
            <div ref={qrRef} className="flex items-center justify-center" style={{ minWidth: size, minHeight: size }} />
          </div>
        );
      case 'text-below':
        return (
          <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-3xl">
            <div ref={qrRef} style={{ minWidth: size, minHeight: size }} />
            <span className="font-black tracking-[0.2em] uppercase text-sm" style={{ color: displayColor }}>{frameText}</span>
          </div>
        );
      case 'box-bottom':
        return (
          <div className="flex flex-col items-center border-4 rounded-[2rem] overflow-hidden bg-white" style={frameStyle}>
            <div className="p-6">
              <div ref={qrRef} style={{ minWidth: size, minHeight: size }} />
            </div>
            <div className="w-full py-4 text-center text-white font-black tracking-[0.2em] uppercase text-xs" style={{ backgroundColor: displayColor }}>
              {frameText}
            </div>
          </div>
        );
      case 'box-top':
        return (
          <div className="flex flex-col items-center border-4 rounded-[2rem] overflow-hidden bg-white" style={frameStyle}>
            <div className="w-full py-4 text-center text-white font-black tracking-[0.2em] uppercase text-xs" style={{ backgroundColor: displayColor }}>
              {frameText}
            </div>
            <div className="p-6">
              <div ref={qrRef} style={{ minWidth: size, minHeight: size }} />
            </div>
          </div>
        );
      case 'bubble':
        return (
          <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-3xl">
            <div className="relative px-6 py-2 rounded-2xl text-white font-black tracking-[0.2em] uppercase text-[10px] mb-2 shadow-lg" style={{ backgroundColor: displayColor }}>
              {frameText}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px]" style={{ borderTopColor: displayColor }} />
            </div>
            <div ref={qrRef} style={{ minWidth: size, minHeight: size }} />
          </div>
        );
      case 'corners':
        return (
          <div className="relative p-8 bg-white rounded-3xl">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-2xl" style={frameStyle} />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-2xl" style={frameStyle} />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-2xl" style={frameStyle} />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-2xl" style={frameStyle} />
            <div className="flex flex-col items-center gap-4">
              <div ref={qrRef} style={{ minWidth: size, minHeight: size }} />
              <span className="font-black tracking-[0.2em] uppercase text-[10px]" style={{ color: displayColor }}>{frameText}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 bg-white rounded-3xl">
            <div ref={qrRef} style={{ minWidth: size, minHeight: size }} />
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center">
      {renderFrame()}
    </div>
  );
};

const Generator = React.memo(({ 
  onSave,
  state,
  setState
}: { 
  onSave: (content: string) => void;
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const {
    type,
    fieldData,
    selectedTemplate,
    frame,
    frameText,
    pattern,
    customFgColor,
    customBgColor
  } = state;

  const setType = (type: QRType) => setState((prev: any) => ({ ...prev, type }));
  const setSelectedTemplate = (selectedTemplate: QRTemplate) => setState((prev: any) => ({ ...prev, selectedTemplate }));
  const setFrame = (frame: QRFrame) => setState((prev: any) => ({ ...prev, frame }));
  const setFrameText = (frameText: string) => setState((prev: any) => ({ ...prev, frameText }));
  const setPattern = (pattern: QRPattern) => setState((prev: any) => ({ ...prev, pattern }));
  const setCustomFgColor = (customFgColor: string | null) => setState((prev: any) => ({ ...prev, customFgColor }));
  const setCustomBgColor = (customBgColor: string | null) => setState((prev: any) => ({ ...prev, customBgColor }));

  const [content, setContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const problematicFrames = ['box-bottom', 'box-top', 'bubble', 'corners'];

  // Validation Logic
  const validateField = (name: string, value: string, type: QRType) => {
    let error = '';
    if (!value && ['url', 'firstName', 'email', 'phone', 'ssid'].includes(name)) {
      error = 'Required field';
    } else if (value) {
      if (name === 'url' || name === 'android' || name === 'ios' || name === 'website') {
        // Improved URL validation to accept www. and other formats without protocol
        const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
        if (!urlPattern.test(value)) error = 'Invalid URL format';
      } else if (name === 'email') {
        if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) error = 'Invalid email format';
      } else if (name === 'phone') {
        if (!value.match(/^\+?[1-9]\d{1,14}$/)) error = 'Include country code (e.g. +91...)';
      }
    }
    return error;
  };

  const updateField = (key: string, value: any) => {
    setState((prev: any) => ({
      ...prev,
      fieldData: {
        ...prev.fieldData,
        [type]: { ...prev.fieldData[type], [key]: value }
      }
    }));

    const error = validateField(key, value, type);
    setValidationErrors(prev => ({ ...prev, [`${type}-${key}`]: error }));
  };

  // Generate QR Content String
  useEffect(() => {
    const data = fieldData?.[type];
    if (!data) return;
    
    let newContent = '';

    switch (type) {
      case 'url':
        let url = data.url || '';
        // If it looks like a URL but has no protocol, add https://
        if (url && !url.match(/^[a-zA-Z]+:\/\//) && (url.includes('.') || url.startsWith('localhost'))) {
          url = 'https://' + url;
        }
        newContent = url;
        break;
      case 'text':
        newContent = data.text || '';
        break;
      case 'wifi':
        newContent = `WIFI:T:${data.encryption || 'WPA'};S:${data.ssid || ''};P:${data.password || ''};H:${data.hidden || false};;`;
        break;
      case 'email':
        newContent = `mailto:${data.email || ''}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.message || '')}`;
        break;
      case 'phone':
        newContent = `tel:${data.phone || ''}`;
        break;
      case 'sms':
        newContent = `SMSTO:${data.phone || ''}:${data.message || ''}`;
        break;
      case 'whatsapp':
        newContent = `https://wa.me/${(data.phone || '').replace('+', '')}?text=${encodeURIComponent(data.message || '')}`;
        break;
      case 'contact':
        newContent = `BEGIN:VCARD\nVERSION:3.0\nN:${data.lastName || ''};${data.firstName || ''};;${data.prefix || ''};\nFN:${data.prefix || ''} ${data.firstName || ''} ${data.lastName || ''}\nORG:${data.organization || ''}\nTITLE:${data.jobTitle || ''}\nTEL;TYPE=CELL:${data.phone || ''}\nEMAIL:${data.email || ''}\nADR;TYPE=WORK:;;${data.address || ''}\nURL:${data.website || ''}\nEND:VCARD`;
        break;
      case 'pdf':
        newContent = data.url || '';
        break;
      case 'location':
        if (data.lat && data.lon) {
          newContent = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lon}`;
        } else {
          newContent = '';
        }
        break;
      case 'app':
        newContent = JSON.stringify({ type: 'app', name: data.name || '', android: data.android || '', ios: data.ios || '' });
        break;
      case 'multi':
        newContent = JSON.stringify({ type: 'multi', title: data.title || '', links: data.links || [] });
        break;
    }
    setContent(newContent);
  }, [fieldData, type]);

  // Force classic pattern for problematic frames
  useEffect(() => {
    if (problematicFrames.includes(frame)) {
      setPattern('square');
    }
  }, [frame]);

  const fgColor = customFgColor || selectedTemplate.fgColor;
  const bgColor = customBgColor || selectedTemplate.bgColor;

  // Reset custom colors when template changes
  useEffect(() => {
    setCustomFgColor(null);
    setCustomBgColor(null);
  }, [selectedTemplate]);

  const handleStartOver = () => {
    setState((prev: any) => ({
      ...prev,
      fieldData: {
        url: { url: '' },
        text: { text: '' },
        wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
        email: { email: '', subject: '', message: '' },
        phone: { phone: '' },
        sms: { phone: '', message: '' },
        contact: { prefix: '', firstName: '', lastName: '', organization: '', jobTitle: '', phone: '', email: '', address: '', website: '' },
        whatsapp: { phone: '', message: '' },
        pdf: { url: '' },
        location: { lat: '', lon: '' },
        app: { name: '', android: '', ios: '' },
        multi: { title: '', links: [{ label: '', url: '' }] },
      },
      frame: 'none',
      frameText: 'SCAN ME',
      pattern: 'square',
      selectedTemplate: QR_TEMPLATES[0],
      customFgColor: null,
      customBgColor: null,
    }));
    setValidationErrors({});
    
    // Scroll to top upon starting over
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const isModified = useMemo(() => {
    const defaultFieldData = {
      url: { url: '' },
      text: { text: '' },
      wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
      email: { email: '', subject: '', message: '' },
      phone: { phone: '' },
      sms: { phone: '', message: '' },
      contact: { prefix: '', firstName: '', lastName: '', organization: '', jobTitle: '', phone: '', email: '', address: '', website: '' },
      whatsapp: { phone: '', message: '' },
      pdf: { url: '' },
      location: { lat: '', lon: '' },
      app: { name: '', android: '', ios: '' },
      multi: { title: '', links: [{ label: '', url: '' }] },
    };
    
    return JSON.stringify(fieldData) !== JSON.stringify(defaultFieldData) || 
           frame !== 'none' || 
           pattern !== 'square' || 
           customFgColor !== null || 
           customBgColor !== null;
  }, [fieldData, frame, pattern, customFgColor, customBgColor]);

  const activeOption = QR_OPTIONS.find(opt => opt.id === type);

  const getLogoSrc = (template: QRTemplate & { logo?: string }) => {
    if (!template.logo) return undefined;

    // Info template: "i" icon instead of "?"
    if (template.id === 'info') {
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${template.fgColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`)}`;
    }

    // Media template: Play icon in circle
    if (template.id === 'media') {
      const color = template.fgColor === 'url(#indian-gradient)' ? '#2563eb' : template.fgColor;
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="12"/><path d="M10 8l6 4-6 4V8z" fill="white"/></svg>`)}`;
    }

    // Shopping template: Cart icon matching fgColor
    if (template.id === 'shopping') {
      const color = template.fgColor === 'url(#indian-gradient)' ? '#fb7185' : template.fgColor;
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`)}`;
    }

    // YouTube template: Simple SVG for better preview compatibility
    if (template.id === 'youtube') {
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`)}`;
    }

    // Hindu Theme: Om Logo
    if (template.logo === 'om') {
      const saffron = '#FF8C00';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50" y="68" dominant-baseline="middle" text-anchor="middle" font-size="82" font-weight="900" fill="${saffron}" font-family="serif">ॐ</text></svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    return template.logo;
  };

  const handleDownload = async () => {
    if (!qrRef.current || !content) return;
    
    try {
      const dataUrl = await toPng(qrRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: 'transparent'
      });
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-pilot-${Date.now()}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
      onSave(content);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  const handleCopyImage = async () => {
    if (!qrRef.current || !content) return;

    try {
      const blob = await toBlob(qrRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: 'transparent'
      });
      
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        setCopied(true);
        onSave(content); // Save to history on copy
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!qrRef.current || !content) return;
    setSharing(true);

    try {
      const blob = await toBlob(qrRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: 'transparent'
      });
      
      if (blob && navigator.share) {
        const file = new File([blob], `qr-pilot-${Date.now()}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'QR Pilot Code',
          text: 'Check out this QR code generated with QR Pilot!'
        });
      } else {
        // Fallback for browsers that don't support navigator.share
        handleDownload();
      }
    } catch (err) {
      console.error('Failed to share:', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform">
      {/* Main Generator Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
              <QrCode size={20} />
            </div>
            Create QR
          </h2>
        </div>
        
        {/* Type Selection - Compact Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 mb-6">
          {QR_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setType(opt.id as QRType)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 min-w-[70px] rounded-2xl transition-all group shrink-0",
                type === opt.id 
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" 
                  : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <opt.icon size={18} strokeWidth={type === opt.id ? 2.5 : 2} />
              <span className="text-[8px] font-black uppercase tracking-wider">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Content Input */}
        <div className="space-y-6 mb-8">
          <div className="bg-slate-50/50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              {activeOption?.description}
            </p>
          </div>

          <div className="grid gap-4">
            {type === 'url' && (
              <InputField 
                label="URL" 
                icon={<Globe size={14} />} 
                value={fieldData.url.url} 
                onChange={(v) => updateField('url', v)} 
                placeholder="https://example.com" 
                error={validationErrors['url-url']}
                required
              />
            )}

            {type === 'text' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Type size={12} />
                  Text Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={fieldData.text.text}
                  onChange={(e) => {
                    updateField('text', e.target.value);
                    // Auto-resize logic
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onFocus={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="Enter your text here... (Press Enter for new paragraph)"
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium text-sm resize-none overflow-hidden"
                />
              </div>
            )}

            {type === 'wifi' && (
              <div className="grid gap-4">
                <InputField 
                  label="Network Name (SSID)" 
                  icon={<Wifi size={14} />} 
                  value={fieldData.wifi.ssid} 
                  onChange={(v) => updateField('ssid', v)} 
                  placeholder="My WiFi Network" 
                  error={validationErrors['wifi-ssid']}
                  required
                />
                <InputField 
                  label="Password" 
                  icon={<Shield size={14} />} 
                  type="password"
                  value={fieldData.wifi.password} 
                  onChange={(v) => updateField('password', v)} 
                  placeholder="Network Password" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Encryption</label>
                    <select 
                      value={fieldData.wifi.encryption}
                      onChange={(e) => updateField('encryption', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input 
                      type="checkbox" 
                      id="hidden-wifi"
                      checked={fieldData.wifi.hidden}
                      onChange={(e) => updateField('hidden', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="hidden-wifi" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hidden Network</label>
                  </div>
                </div>
              </div>
            )}

            {type === 'email' && (
              <div className="grid gap-4">
                <InputField 
                  label="Email Address" 
                  icon={<Mail size={14} />} 
                  value={fieldData.email.email} 
                  onChange={(v) => updateField('email', v)} 
                  placeholder="example@gmail.com" 
                  error={validationErrors['email-email']}
                  required
                />
                <InputField 
                  label="Subject" 
                  icon={<Type size={14} />} 
                  value={fieldData.email.subject} 
                  onChange={(v) => updateField('subject', v)} 
                  placeholder="Email Subject" 
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</label>
                  <textarea
                    value={fieldData.email.message}
                    onChange={(e) => updateField('message', e.target.value)}
                    placeholder="Email Body Content..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {type === 'phone' && (
              <InputField 
                label="Phone Number" 
                icon={<Phone size={14} />} 
                value={fieldData.phone.phone} 
                onChange={(v) => updateField('phone', v)} 
                placeholder="+91 12345 67890" 
                error={validationErrors['phone-phone']}
                required
              />
            )}

            {type === 'sms' && (
              <div className="grid gap-4">
                <InputField 
                  label="Phone Number" 
                  icon={<Phone size={14} />} 
                  value={fieldData.sms.phone} 
                  onChange={(v) => updateField('phone', v)} 
                  placeholder="+91 12345 67890" 
                  error={validationErrors['sms-phone']}
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</label>
                  <textarea
                    value={fieldData.sms.message}
                    onChange={(e) => updateField('message', e.target.value)}
                    placeholder="SMS Message..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {type === 'whatsapp' && (
              <div className="grid gap-4">
                <InputField 
                  label="WhatsApp Number" 
                  icon={<MessageCircle size={14} />} 
                  value={fieldData.whatsapp.phone} 
                  onChange={(v) => updateField('phone', v)} 
                  placeholder="+91 12345 67890" 
                  error={validationErrors['whatsapp-phone']}
                  required
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Message</label>
                  <textarea
                    value={fieldData.whatsapp.message}
                    onChange={(e) => updateField('message', e.target.value)}
                    placeholder="Hello! I'm interested in..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {type === 'contact' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prefix</label>
                    <select 
                      value={fieldData.contact.prefix}
                      onChange={(e) => updateField('prefix', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <InputField 
                      label="First Name" 
                      value={fieldData.contact.firstName} 
                      onChange={(v) => updateField('firstName', v)} 
                      placeholder="John" 
                      error={validationErrors['contact-firstName']}
                      required
                    />
                  </div>
                </div>
                <InputField label="Last Name" value={fieldData.contact.lastName} onChange={(v) => updateField('lastName', v)} placeholder="Doe" />
                <InputField label="Organization" icon={<Building size={14} />} value={fieldData.contact.organization} onChange={(v) => updateField('organization', v)} placeholder="Company Name" />
                <InputField label="Job Title" icon={<Briefcase size={14} />} value={fieldData.contact.jobTitle} onChange={(v) => updateField('jobTitle', v)} placeholder="Software Engineer" />
                <InputField label="Phone" icon={<Phone size={14} />} value={fieldData.contact.phone} onChange={(v) => updateField('phone', v)} placeholder="+91..." />
                <InputField label="Email" icon={<Mail size={14} />} value={fieldData.contact.email} onChange={(v) => updateField('email', v)} placeholder="john@example.com" />
                <InputField label="Website" icon={<Globe size={14} />} value={fieldData.contact.website} onChange={(v) => updateField('website', v)} placeholder="https://..." />
                <div className="sm:col-span-2">
                  <InputField label="Address" icon={<MapPin size={14} />} value={fieldData.contact.address} onChange={(v) => updateField('address', v)} placeholder="123 Street, City, Country" />
                </div>
              </div>
            )}

            {type === 'pdf' && (
              <InputField 
                label="PDF URL" 
                icon={<FileText size={14} />} 
                value={fieldData.pdf.url} 
                onChange={(v) => updateField('url', v)} 
                placeholder="https://example.com/file.pdf" 
                error={validationErrors['pdf-url']}
                required
              />
            )}

            {type === 'location' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField 
                  label="Latitude" 
                  icon={<MapPin size={14} />} 
                  value={fieldData.location.lat} 
                  onChange={(v) => updateField('lat', v)} 
                  placeholder="e.g. 28.6139" 
                  error={validationErrors['location-lat']}
                  required
                />
                <InputField 
                  label="Longitude" 
                  icon={<MapPin size={14} />} 
                  value={fieldData.location.lon} 
                  onChange={(v) => updateField('lon', v)} 
                  placeholder="e.g. 77.2090" 
                  error={validationErrors['location-lon']}
                  required
                />
              </div>
            )}

            {type === 'app' && (
              <div className="grid gap-4">
                <InputField 
                  label="App Name" 
                  icon={<AppWindow size={14} />} 
                  value={fieldData.app.name} 
                  onChange={(v) => updateField('name', v)} 
                  placeholder="My Awesome App" 
                />
                <InputField 
                  label="Android URL (Play Store)" 
                  icon={<Globe size={14} />} 
                  value={fieldData.app.android} 
                  onChange={(v) => updateField('android', v)} 
                  placeholder="https://play.google.com/store/apps/details?id=..." 
                  error={validationErrors['app-android']}
                />
                <InputField 
                  label="iOS URL (App Store)" 
                  icon={<Globe size={14} />} 
                  value={fieldData.app.ios} 
                  onChange={(v) => updateField('ios', v)} 
                  placeholder="https://apps.apple.com/app/id..." 
                  error={validationErrors['app-ios']}
                />
              </div>
            )}

            {type === 'multi' && (
              <div className="grid gap-4">
                <InputField 
                  label="Title" 
                  value={fieldData.multi.title} 
                  onChange={(v) => updateField('title', v)} 
                  placeholder="My Social Links" 
                />
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Links</label>
                  {fieldData.multi.links.map((link: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => {
                            const newLinks = [...fieldData.multi.links];
                            newLinks[idx].label = e.target.value;
                            updateField('links', newLinks);
                          }}
                          placeholder="Label (e.g. Portfolio)"
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...fieldData.multi.links];
                            newLinks[idx].url = e.target.value;
                            updateField('links', newLinks);
                          }}
                          placeholder="https://..."
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newLinks = fieldData.multi.links.filter((_: any, i: number) => i !== idx);
                          updateField('links', newLinks);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newLinks = [...fieldData.multi.links, { label: '', url: '' }];
                      updateField('links', newLinks);
                    }}
                    className="flex items-center gap-2 text-[10px] font-bold text-brand-500 uppercase tracking-wider hover:text-brand-600 transition-colors"
                  >
                    <Plus size={12} /> Add Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Style Templates - Compact Scroll */}
        <div className="mb-8">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 pl-1">
            Design Templates
          </label>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {QR_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2 rounded-2xl transition-all shrink-0 border-2",
                  selectedTemplate.id === template.id 
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-900/10" 
                    : "border-transparent bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden"
                  style={{ backgroundColor: template.bgColor }}
                >
                  <QRCodeSVG 
                    value="PREVIEW"
                    size={48}
                    fgColor={template.fgColor}
                    bgColor={template.bgColor}
                    level={template.level}
                    imageSettings={template.logo ? {
                      src: getLogoSrc(template) || '',
                      height: 12 * (template.logoSize || 1),
                      width: 12 * (template.logoSize || 1),
                      excavate: true,
                      crossOrigin: 'anonymous',
                    } : undefined}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Customization Options */}
        <div className="space-y-8 mb-8">
          {/* Frames */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 pl-1">
              <Layout size={12} />
              Frames
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              {QR_FRAMES.map((f) => {
                return (
                  <button
                    key={f.id}
                    onClick={() => setFrame(f.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 border-2",
                      frame === f.id
                        ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            {frame !== 'none' && frame !== 'circle' && (
              <div className="mt-4">
                <input
                  type="text"
                  value={frameText}
                  onChange={(e) => setFrameText(e.target.value)}
                  placeholder="Frame Text..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            )}
          </div>

          {/* Patterns */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 pl-1">
              <Shapes size={12} />
              Pattern & Style
              {problematicFrames.includes(frame) && (
                <span className="ml-2 text-[8px] text-amber-500 normal-case font-bold tracking-normal">
                  (Only Classic available for this frame)
                </span>
              )}
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              {QR_PATTERNS.map((p) => {
                const isDisabled = problematicFrames.includes(frame) && p.id !== 'square';
                return (
                  <button
                    key={p.id}
                    disabled={isDisabled}
                    onClick={() => setPattern(p.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 border-2",
                      pattern === p.id
                        ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
                      isDisabled && "opacity-30 cursor-not-allowed grayscale"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 pl-1">
              <Palette size={12} />
              Custom Colors
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Foreground</span>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="color"
                    value={fgColor.startsWith('url') ? '#000000' : fgColor}
                    onChange={(e) => setCustomFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-slate-500">{fgColor.startsWith('url') ? 'Gradient' : fgColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Background</span>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setCustomBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-slate-500">{bgColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Preview & Actions */}
        <div className="bg-slate-900 dark:bg-brand-900/20 rounded-[2rem] p-4 sm:p-6 flex flex-col items-center gap-6">
          <div 
            ref={qrRef}
            className="p-3 sm:p-4 bg-white rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-500"
          >
            <QRRenderer 
              value={content || 'QRPilot'}
              size={typeof window !== 'undefined' && window.innerWidth < 640 ? 200 : window.innerWidth < 1024 ? 256 : 360}
              fgColor={fgColor}
              bgColor={bgColor}
              level={selectedTemplate.level}
              logo={getLogoSrc(selectedTemplate)}
              logoSize={selectedTemplate.logoSize}
              pattern={pattern}
              frame={frame}
              frameText={frameText}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            <button
              onClick={handleDownload}
              disabled={!content}
              className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-black/10"
            >
              <Download size={16} strokeWidth={3} />
              Download
            </button>
            <button
              onClick={handleCopyImage}
              disabled={!content}
              className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md disabled:opacity-50 text-white h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 border border-white/10"
            >
              {copied ? <Check size={16} strokeWidth={3} className="text-green-400" /> : <Copy size={16} strokeWidth={3} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleShare}
              disabled={!content || sharing}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-brand-500/20"
            >
              <Share2 size={16} strokeWidth={3} />
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Start Over Button - Balanced spacing for professional design */}
      <div className="flex justify-center mt-12 mb-12">
        {isModified && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartOver}
            className="flex items-center gap-3 px-10 py-5 rounded-3xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-[0.3em] transition-all border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none"
          >
            <RotateCcw size={16} />
            Start Over
          </motion.button>
        )}
      </div>
    </div>
  );
});

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  icon, 
  type = 'text', 
  error,
  required
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string; 
  icon?: React.ReactNode;
  type?: string;
  error?: string;
  required?: boolean;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        {icon}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-3 text-xs focus:outline-none transition-all",
            isPassword ? "pr-10" : "",
            error 
              ? "border-red-500 focus:ring-4 focus:ring-red-500/10" 
              : "border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500"
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        {error && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 flex items-center gap-1">
            <AlertCircle size={14} />
            <span className="text-[8px] font-bold uppercase">{error}</span>
          </div>
        )}
      </div>
      {error && isPassword && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  );
};

const Scanner = React.memo(({ onScan }: { onScan: (content: string) => void }) => {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'file'>('camera');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize cameras
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices.map(d => ({ id: d.id, label: d.label })));
        setActiveCameraId(devices[0].id);
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
      setError("Could not access cameras. Please check permissions.");
    });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async (cameraId: string) => {
    if (html5QrCodeRef.current) {
      await stopScanning();
    }

    setIsScanning(true);
    setError(null);

    // Wait for the DOM element to be available
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          cameraId,
          { 
            fps: 30,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Flexible box for both QR and Barcodes
              return { 
                width: Math.floor(viewfinderWidth * 0.85), 
                height: Math.floor(viewfinderHeight * 0.7) 
              };
            },
            formatsToSupport: [ 
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.AZTEC,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.MAXICODE,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.PDF_417,
              Html5QrcodeSupportedFormats.RSS_14,
              Html5QrcodeSupportedFormats.RSS_EXPANDED,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
            ],
            // Re-enable experimental features as they often use native APIs which are better for stylized codes
            ...({ experimentalFeatures: { useBarCodeDetectorIfSupported: true } } as any)
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Ignore errors during scanning
          }
        );
      } catch (err) {
        console.error("Failed to start scanning", err);
        setError("Failed to start camera. It might be in use by another app.");
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Failed to stop scanning", err);
      }
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (decodedText: string) => {
    setScannedResult(decodedText);
    stopScanning();
    onScan(decodedText);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const html5QrCode = new Html5Qrcode("reader-file");
    
    try {
      // Try standard scan first
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      console.error("Standard scan failed, trying jsQR fallback", err);
      
      // Fallback to jsQR for more robust scanning of stylized codes
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Try BarcodeDetector first (native, very robust for stylized codes)
          const detectWithBarcodeDetector = async () => {
            if ('BarcodeDetector' in window) {
              try {
                const formats = await (window as any).BarcodeDetector.getSupportedFormats();
                const barcodeDetector = new (window as any).BarcodeDetector({ formats });
                const barcodes = await barcodeDetector.detect(img);
                if (barcodes && barcodes.length > 0) {
                  handleScanSuccess(barcodes[0].rawValue);
                  return true;
                }
              } catch (e) {
                console.warn("BarcodeDetector failed, falling back to jsQR", e);
              }
            }
            return false;
          };

          detectWithBarcodeDetector().then(detected => {
            if (detected) return;

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });

            if (code) {
              handleScanSuccess(code.data);
            } else {
              setError("No QR code found in this image. Try a clearer photo or a different angle.");
            }
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].id;
    setActiveCameraId(nextCameraId);
    if (isScanning) {
      startScanning(nextCameraId);
    }
  };

  const resetScanner = () => {
    setScannedResult(null);
    setError(null);
    if (scanMode === 'camera' && activeCameraId) {
      startScanning(activeCameraId);
    }
  };

  const parseScannedResult = (result: string) => {
    try {
      const parsed = JSON.parse(result);
      if (parsed && typeof parsed === 'object' && parsed.type) {
        return parsed;
      }
    } catch (e) {
      // Not JSON or not our format
    }
    return null;
  };

  const isUrl = (str: string) => {
    if (!str) return false;
    const trimmed = str.trim();
    try {
      new URL(trimmed);
      return true;
    } catch {
      // Robust URL regex that handles common formats without protocol
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      return urlPattern.test(trimmed);
    }
  };

  const getUrl = (str: string) => {
    const trimmed = str.trim();
    if (trimmed.match(/^[a-zA-Z]+:\/\//)) return trimmed;
    return 'https://' + trimmed;
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-display font-bold flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
              <Scan size={20} />
            </div>
            Scan QR Code
          </h2>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setScanMode('camera'); stopScanning(); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                scanMode === 'camera' ? "bg-white dark:bg-slate-700 text-brand-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Camera size={14} />
              Camera
            </button>
            <button
              onClick={() => { setScanMode('file'); stopScanning(); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                scanMode === 'file' ? "bg-white dark:bg-slate-700 text-brand-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Upload size={14} />
              Upload
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="qr-scanner-container relative aspect-square w-full max-w-md lg:max-w-2xl mx-auto overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 group">
            {scannedResult ? (
              <div className="absolute inset-0 overflow-y-auto bg-white dark:bg-slate-900 p-4 sm:p-8 scrollbar-hide">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/10 text-green-500 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center mb-4 shrink-0">
                    <Check size={24} sm:size={32} strokeWidth={3} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-black mb-2">Scan Complete</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs mb-6 break-all font-medium leading-relaxed whitespace-pre-wrap">
                    {scannedResult}
                  </p>
                  
                  <div className="flex flex-col gap-4 w-full">
                    {scannedResult && (() => {
                      const parsed = parseScannedResult(scannedResult);
                      if (parsed?.type === 'multi') {
                        return (
                          <div className="flex flex-col gap-3 w-full mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left mb-2 pl-1">{parsed.title || 'Multiple Links'}</h4>
                            {parsed.links?.map((link: any, idx: number) => (
                              <a
                                key={idx}
                                href={getUrl(link.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-6 py-4 rounded-xl transition-all group border border-slate-200 dark:border-slate-700"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg shrink-0">
                                    <LinkIcon size={14} />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider truncate text-slate-700 dark:text-slate-200">{link.label || 'Link'}</span>
                                </div>
                                <ExternalLink size={14} className="text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
                              </a>
                            ))}
                          </div>
                        );
                      }
                      if (parsed?.type === 'app') {
                        return (
                          <div className="flex flex-col gap-3 w-full mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left mb-2 pl-1">{parsed.name || 'App Links'}</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {parsed.ios && (
                                <a
                                  href={getUrl(parsed.ios)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 bg-black text-white px-4 py-4 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg shadow-black/10"
                                >
                                  <AppWindow size={14} />
                                  App Store
                                </a>
                              )}
                              {parsed.android && (
                                <a
                                  href={getUrl(parsed.android)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-4 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-green-700 transition-all shadow-lg shadow-green-600/10"
                                >
                                  <Globe size={14} />
                                  Play Store
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {scannedResult && isUrl(scannedResult) && !parseScannedResult(scannedResult) && (
                      <a 
                        href={getUrl(scannedResult)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 bg-brand-500 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-brand-600 shadow-xl shadow-brand-500/20"
                      >
                        <ExternalLink size={20} />
                        Open Link
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6">
              {scanMode === 'camera' ? (
                <div className="flex flex-col items-center w-full h-full p-2 sm:p-6 justify-center">
                  {!isScanning ? (
                    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-brand-500/10 text-brand-500 rounded-2xl sm:rounded-[2rem] flex items-center justify-center">
                        <Camera size={32} sm:size={48} strokeWidth={1.5} />
                      </div>
                      <div className="text-center px-2">
                        <h4 className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Scan with Camera</h4>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4 sm:mb-6">Point your camera at a QR code</p>
                      </div>
                      <button
                        onClick={() => activeCameraId && startScanning(activeCameraId)}
                        className="bg-brand-500 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all w-full max-w-[200px] sm:max-w-[240px]"
                      >
                        Start Camera
                      </button>
                      {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 sm:mt-4">{error}</p>}
                    </div>
                  ) : (
                    <div id="reader" className="w-full h-full"></div>
                  )}

                  {isScanning && cameras.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="absolute top-4 right-4 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl text-slate-600 dark:text-slate-300 shadow-lg z-10 hover:bg-white dark:hover:bg-slate-700 transition-all"
                      title="Switch Camera"
                    >
                      <SwitchCamera size={20} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center w-full h-full p-2 sm:p-6 justify-center">
                  <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-brand-500/10 text-brand-500 rounded-2xl sm:rounded-[2rem] flex items-center justify-center">
                      <ImageIcon size={32} sm:size={48} strokeWidth={1.5} />
                    </div>
                    <div className="text-center px-2">
                      <h4 className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Upload QR Image</h4>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4 sm:mb-6">Select a photo from your gallery</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 sm:gap-3 bg-brand-500 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all w-full max-w-[200px] sm:max-w-[240px]"
                    >
                      <Upload size={16} sm:size={18} />
                      Choose File
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div id="reader-file" className="hidden"></div>
                    {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-4">{error}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {scannedResult && (
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md lg:max-w-2xl mx-auto">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(scannedResult || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
              >
                {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                {copied ? 'Copied!' : 'Copy Result'}
              </button>
              <button 
                onClick={resetScanner}
                className="flex-1 flex items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw size={20} />
                Scan Again
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-brand-500/5 border border-brand-500/10 rounded-3xl p-6">
        <div className="flex gap-4">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500 shrink-0 h-fit">
            <Palette size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Pro Tip</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ensure your camera lens is clean and the QR code is well-lit for the fastest recognition speed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

const HistoryView = React.memo(({ history, onClear }: { history: QRHistoryItem[]; onClear: () => void }) => {
  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const getDisplayContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed?.type === 'multi') return parsed.title || 'Multiple Links';
      if (parsed?.type === 'app') return parsed.name || 'App Links';
    } catch (e) {
      // Not JSON or not our format
    }
    return content;
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
            <History size={20} />
          </div>
          Recent Activity
        </h2>
        {history.length > 0 && (
          <button 
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-600 font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
          >
            <Trash2 size={16} />
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-950 text-slate-300 dark:text-slate-700 rounded-[2rem] flex items-center justify-center mb-6">
            <History size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">No history yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[240px] leading-relaxed">
            Your generated and scanned QR codes will appear here for quick access.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-5 group hover:border-brand-500/30 transition-all hover:shadow-lg hover:shadow-slate-200/20 dark:hover:shadow-none"
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                item.type === 'generated' 
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400" 
                  : "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
              )}>
                {item.type === 'generated' ? <QrCode size={24} /> : <Scan size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate mb-0.5">
                  {getDisplayContent(item.content)}
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                    item.type === 'generated' ? "bg-brand-500/10 text-brand-500" : "bg-purple-500/10 text-purple-500"
                  )}>
                    {item.type}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(item.content)}
                className="p-3 text-slate-300 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all active:scale-90"
                title="Copy content"
              >
                <Copy size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});


// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [history, setHistory] = useState<QRHistoryItem[]>([]);

  // Lifted Generator State
  const [generatorState, setGeneratorState] = useState({
    type: 'url' as QRType,
    fieldData: {
      url: { url: '' },
      text: { text: '' },
      wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
      email: { email: '', subject: '', message: '' },
      phone: { phone: '' },
      sms: { phone: '', message: '' },
      contact: { prefix: '', firstName: '', lastName: '', organization: '', jobTitle: '', phone: '', email: '', address: '', website: '' },
      whatsapp: { phone: '', message: '' },
      pdf: { url: '' },
      location: { lat: '', lon: '' },
      app: { name: '', android: '', ios: '' },
      multi: { title: '', links: [{ label: '', url: '' }] },
    },
    selectedTemplate: QR_TEMPLATES[0],
    frame: 'none' as QRFrame,
    frameText: 'SCAN ME',
    pattern: 'square' as QRPattern,
    customFgColor: null as string | null,
    customBgColor: null as string | null,
  });

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('qr-pilot-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Load history
    const savedHistory = localStorage.getItem('qr-pilot-history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('qr-pilot-theme', newMode ? 'dark' : 'light');
    if (newMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  const addToHistory = (content: string, type: 'generated' | 'scanned') => {
    if (!content) return;
    
    const newItem: QRHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: Date.now()
    };

    const updatedHistory = [newItem, ...history.filter(h => h.content !== content)].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('qr-pilot-history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('qr-pilot-history');
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-brand-500/20">
      <GlobalGradients />
      <div className="flex-1 pt-28 px-4 sm:px-6 max-w-2xl lg:max-w-5xl mx-auto w-full">
        <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} onInfoClick={() => setShowInfo(true)} />
        <AnimatePresence>
          <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
        </AnimatePresence>
        
        <main className="relative will-change-transform">
          <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: 'auto' })}>
            {activeTab === 'generator' && (
              <motion.div
                key="generator"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="pb-5"
              >
                <Generator 
                  onSave={(content) => addToHistory(content, 'generated')} 
                  state={generatorState}
                  setState={setGeneratorState}
                />
              </motion.div>
            )}
            
            {activeTab === 'scanner' && (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="pb-10"
              >
                <Scanner onScan={(content) => addToHistory(content, 'scanned')} />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="pb-32"
              >
                <HistoryView history={history} onClear={clearHistory} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Developer Credit Footer */}
      <motion.footer 
        whileHover="hover"
        whileTap="hover"
        className={`w-full pt-6 pb-32 mt-auto relative overflow-hidden transition-all duration-500 ${
          isDarkMode 
            ? 'bg-[#0c142e]/85 border-t border-blue-900/20' 
            : 'bg-blue-50/80 border-t border-blue-100/50'
        } backdrop-blur-md`}
      >
        {/* Sparkling particles on hover - Restored count for all devices */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(45)].map((_, i) => {
            const colors = isDarkMode 
              ? ['bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-yellow-400', 'bg-cyan-400', 'bg-emerald-400', 'bg-orange-400'] 
              : ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-orange-500'];
            const color = colors[i % colors.length];
            const size = Math.random() * 8 + 3; // 3px to 11px (increased size)
            
            return (
              <motion.div
                key={i}
                variants={{
                  hover: {
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    x: [0, (Math.random() - 0.5) * 1000],
                    y: [0, (Math.random() - 0.5) * 400],
                    transition: {
                      duration: Math.random() * 1.5 + 0.5,
                      delay: Math.random() * 0.5,
                      ease: "easeOut"
                    }
                  }
                }}
                initial={{ opacity: 0 }}
                className={`absolute rounded-full blur-[1px] ${color}`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  boxShadow: isDarkMode ? '0 0 15px currentColor' : '0 0 10px currentColor'
                }}
              />
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <motion.div
            variants={{
              hover: { scale: 1.05, y: -5 }
            }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex flex-col items-center gap-2"
          >
            <div className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl border transition-all duration-500 ${
              isDarkMode 
                ? 'bg-slate-900/80 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] backdrop-blur-md' 
                : 'bg-white/80 border-blue-200 shadow-[0_0_30px_rgba(59,130,246,0.1)] backdrop-blur-md'
            }`}>
              <Sparkles className={`w-5 h-5 md:w-6 md:h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              
              <p className={`text-sm md:text-xl font-medium tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Developed by{' '}
                <a 
                  href="https://github.com/sahilkhatkar11" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`font-black transition-all duration-300 relative group inline-block ${
                    isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  Sahil Khatkar
                  <span className={`absolute -bottom-1 left-0 w-0 h-1 transition-all duration-500 group-hover:w-full rounded-full ${
                    isDarkMode ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-gradient-to-r from-blue-600 to-purple-600'
                  }`}></span>
                </a>
              </p>

              <Sparkles className={`w-5 h-5 md:w-6 md:h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
