// Icons come from Lucide, drawn at one size and weight so they read as a set. The names here are the
// app's own, so pages never depend on Lucide's naming.
import {
  ArrowRight,
  BookOpen,
  ChartLine,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  ClipboardList,
  Copy,
  Download,
  Eye,
  EyeOff,
  Flag,
  Handshake,
  Hourglass,
  House,
  Info,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  Menu,
  Mic,
  MicOff,
  Captions,
  CaptionsOff,
  Headset,
  NotebookPen,
  Phone,
  PhoneOff,
  Building2,
  MessageSquare,
  MessageSquareText,
  MessagesSquare,
  PhoneOutgoing,
  Plus,
  Presentation,
  RefreshCw,
  Repeat,
  Scale,
  Search,
  Settings,
  Sparkles,
  Sprout,
  Tag,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
  CalendarSync,
} from 'lucide-react';

const sized = (Icon) =>
  function AppIcon({ size = 20, strokeWidth = 1.9, ...props }) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" {...props} />;
  };

export const HomeIcon = sized(House);
export const PadIcon = sized(MessageSquareText);
export const ListIcon = sized(ListChecks);
export const ProgressIcon = sized(ChartLine);
export const BookIcon = sized(BookOpen);
export const DashboardIcon = sized(LayoutDashboard);
export const CoachIcon = sized(MessagesSquare);
export const UsersIcon = sized(Users);
export const SettingsIcon = sized(Settings);
export const LogoutIcon = sized(LogOut);
export const CheckIcon = sized(Check);
export const CheckCircleIcon = sized(CircleCheck);
export const AlertIcon = sized(TriangleAlert);
export const CriticalIcon = sized(CircleX);
export const InfoIcon = sized(Info);
export const ClockIcon = sized(Clock);
export const LockIcon = sized(LockKeyhole);
export const CopyIcon = sized(Copy);
export const MenuIcon = sized(Menu);
export const PlusIcon = sized(Plus);
export const RefreshIcon = sized(RefreshCw);
export const DownloadIcon = sized(Download);
export const FlagIcon = sized(Flag);
export const ArrowRightIcon = sized(ArrowRight);
export const ChevronRightIcon = sized(ChevronRight);
export const EyeIcon = sized(Eye);
export const EyeOffIcon = sized(EyeOff);
export const ChatIcon = sized(MessageSquare);
export const SparkIcon = sized(Sparkles);
export const TargetIcon = sized(Target);
export const RepeatIcon = sized(Repeat);
export const ClipboardIcon = sized(ClipboardList);
export const PhoneIcon = sized(Phone);
export const PhoneOffIcon = sized(PhoneOff);
export const MicIcon = sized(Mic);
export const MicOffIcon = sized(MicOff);
export const CaptionsIcon = sized(Captions);
export const CaptionsOffIcon = sized(CaptionsOff);
export const HeadsetIcon = sized(Headset);
export const NotesIcon = sized(NotebookPen);
export const FirmIcon = sized(Building2);

// One icon per practice stage, for the stage cards.
export const STAGE_ICONS = {
  cold_outreach: sized(PhoneOutgoing),
  discovery: sized(Search),
  demo: sized(Presentation),
  pricing: sized(Tag),
  competitor: sized(Scale),
  closing: sized(Handshake),
  stalled: sized(Hourglass),
  am_adoption: sized(Sprout),
  am_value: sized(TrendingUp),
  am_renewal: sized(CalendarSync),
};
