/**
 * Thin wrapper over lucide-react so the rest of the app can use the same
 * kebab-case icon names the design handoff references (`<Icon name="pen-line" />`),
 * with the editorial defaults (1.85 stroke). Add a name here when a screen needs it.
 */
import {
  Plus, List, Zap, PenLine, Database, Search, ArrowRight, ArrowLeft, Pencil,
  Trash2, ChevronDown, ChevronsUpDown, ChevronRight, AlertCircle, Eye, Shuffle,
  RotateCcw, Repeat, Send, Dice5, Star, MessageSquareText, HardDriveDownload,
  Link2, Upload, Download, UploadCloud, Loader, CheckCircle2, Sun, Moon,
  GraduationCap, Check, X, Book, Wallet, Flame
} from 'lucide-react';

const MAP = {
  plus: Plus,
  list: List,
  zap: Zap,
  'pen-line': PenLine,
  database: Database,
  search: Search,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  pencil: Pencil,
  'trash-2': Trash2,
  'chevron-down': ChevronDown,
  'chevrons-up-down': ChevronsUpDown,
  'chevron-right': ChevronRight,
  'alert-circle': AlertCircle,
  eye: Eye,
  shuffle: Shuffle,
  'rotate-ccw': RotateCcw,
  repeat: Repeat,
  send: Send,
  'dice-5': Dice5,
  star: Star,
  'message-square-text': MessageSquareText,
  'hard-drive-download': HardDriveDownload,
  'link-2': Link2,
  upload: Upload,
  download: Download,
  'upload-cloud': UploadCloud,
  loader: Loader,
  'check-circle-2': CheckCircle2,
  sun: Sun,
  moon: Moon,
  'graduation-cap': GraduationCap,
  check: Check,
  x: X,
  book: Book,
  wallet: Wallet,
  flame: Flame
};

export default function Icon({ name, size = 16, strokeWidth = 1.85, className, style, ...rest }) {
  const Cmp = MAP[name];
  if (!Cmp) {
    if (import.meta.env?.DEV) console.warn(`Icon: unknown name "${name}"`);
    return null;
  }
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden {...rest} />;
}
