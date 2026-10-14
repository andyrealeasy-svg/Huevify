import React from 'react';
import { 
  Home, Search, Library, PlusSquare, Heart, Play, Pause, 
  SkipBack, SkipForward, Repeat, Shuffle, Volume, Volume1, Volume2, VolumeX, ListMusic, Trash2, Mic2,
  ArrowLeft, Plus, ChevronDown, Image, X, Check, Edit, MoreHorizontal,
  User, LogOut, Settings, Camera, Upload, Palette, Globe, Zap, ChevronRight, ChevronLeft, Music2, Moon,
  Shield, UploadCloud, Calendar, FileAudio, CheckCircle, XCircle, Clock, MoreVertical, ShieldAlert, BarChart2,
  Database, Key, ChevronUp, Bookmark, FileText, Save, RotateCcw, RotateCw, Loader2, Disc, Headphones, Sliders, SlidersHorizontal, Activity,
  Sparkles, Layers, Megaphone, EyeOff, Eye, Info, CalendarClock, Copy, GripVertical, Music, ArrowUpDown, Maximize2, Minimize2, FastForward,
    Share2, Send, Download, ExternalLink, TrendingUp, Disc3, Hourglass, Users, AlertCircle
} from 'lucide-react';

export const TelegramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
  </svg>
);

export { 
  Home, Search, Library, PlusSquare, Heart, Play, Pause, 
  SkipBack, SkipForward, Repeat, Shuffle, Volume, Volume1, Volume2, VolumeX, ListMusic, Trash2, Mic2,
  ArrowLeft, Plus, ChevronDown, Image, X, Check, Edit, MoreHorizontal,
  User, LogOut, Settings, Camera, Upload, Palette, Globe, Zap, ChevronRight, ChevronLeft, Music2, Moon,
  Shield, UploadCloud, Calendar, FileAudio, CheckCircle, XCircle, Clock, MoreVertical, ShieldAlert, BarChart2,
  Database, Key, ChevronUp, Bookmark, FileText, Save, RotateCcw, RotateCw, Loader2, Disc, Headphones, Sliders, SlidersHorizontal, Activity,
  Sparkles, Layers, Megaphone, EyeOff, Eye, Info, CalendarClock, Copy, GripVertical, Music, ArrowUpDown, Maximize2, Minimize2, FastForward,
  Share2, Send, Download, ExternalLink, TrendingUp, Disc3, Hourglass, Users, AlertCircle
};