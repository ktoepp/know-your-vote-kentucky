import {
  // Congressional Content Icons
  Gavel,
  AccountBalance,
  Description,
  Search,
  FilterList,
  Timeline,
  Groups,
  Topic,
  Link,
  
  // Theme Icons
  DarkMode,
  LightMode,
  SettingsBrightness,
  
  // Date and Time Icons
  CalendarToday,
  Schedule,
  
  // Democracy and Civic Icons
  HowToVote,
  Public,
  School,
  
  // Navigation Icons
  Home,
  Menu,
  Close,
  ArrowBack,
  ArrowForward,
  
  // Content Status Icons
  CheckCircle,
  Pending,
  Error,
  Info,
  
  // Action Icons
  Download,
  Share,
  Bookmark,
  BookmarkBorder,
  
  // Chamber Icons
  Business,
  LocationCity,
  
  // Committee Icons
  Forum,
  RecordVoiceOver,
  
  // Bill Icons
  Article,
  Assignment,
  
  // Analysis Icons
  Analytics,
  TrendingUp,
  NetworkCheck,
  
  // Social Content Icons
  Twitter,
  Facebook,
  LinkedIn,
  
  // Utility Icons
  ExpandMore,
  ExpandLess,
  MoreVert,
  Settings,
  Help,
  
  // Content Type Icons
  VideoLibrary,
  AudioFile,
  PictureAsPdf,
  TextSnippet,
  
  // Status Icons
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  
  // User Icons
  Person,
  Group,
  AdminPanelSettings,
  
  // Notification Icons
  Notifications,
  NotificationsNone,
  
  // Data Icons
  BarChart,
  PieChart,
  ShowChart,
  
  // Government Icons
  Flag,
  Security,
  Policy,
  Balance,
  
  // Accessibility Icons
  Accessibility,
  VolumeUp,
  VolumeOff,
  
  // Content Discovery Icons
  Explore,
  FindInPage,
  History,
  Star,
  StarBorder,
  
  // Processing Icons
  Sync,
  CloudDownload,
  CloudUpload,
  Storage,
  
  // Quality Icons
  Verified,
  Warning,
  ErrorOutline,
  CheckCircleOutline,
  
  // Time-based Icons
  AccessTime,
  Today,
  DateRange,
  
  // Content Organization Icons
  Folder,
  FolderOpen,
  Book,
  LibraryBooks,
  
  // Communication Icons
  Email,
  Phone,
  Chat,
  Message,
  
  // Export Icons
  GetApp,
  Print,
  FileDownload,
  
  // Import Icons
  Upload,
  FileUpload,
  
  // Settings Icons
  Tune,
  Build,
  Code,
  BugReport,
  
  // Help Icons
  HelpOutline,
  Support,
  ContactSupport,
  Feedback,
  
  // Authentication Icons
  Lock,
  LockOpen,
  VpnKey,
  
  // Media Icons
  PlayCircle,
  PauseCircle,
  StopCircle,
  
  // Network Icons
  Hub,
  Router,
  Wifi,
  SignalCellular4Bar,
  
  // Government Building Icons
  Domain,
  
  // Democracy Icons
  Poll,
  ThumbUp,
  ThumbDown,
  
  // Civic Engagement Icons
  Campaign,
  VolunteerActivism,
  
  // Legislative Process Icons
  Rule,
  GpsFixed,
  
  // Location Icon
  LocationOn,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

// Custom chart icon component with the specific SVG path you provided
export const CustomChartIcon: React.FC<{ sx?: any }> = ({ sx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <svg
      viewBox="0 0 24 24"
      style={{
        width: 24,
        height: 24,
        fill: isDark ? theme.palette.text.primary : '#374151', // Dark gray that works on light backgrounds
        ...sx
      }}
    >
      <path d="M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z" />
    </svg>
  );
};

// ThemedIcon component that automatically applies proper dark mode theming
interface ThemedIconProps {
  icon: React.ComponentType<any>;
  sx?: any;
  color?: 'primary' | 'secondary' | 'inherit' | 'action' | 'disabled' | 'error' | 'info' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  [key: string]: any;
}

export const ThemedIcon: React.FC<ThemedIconProps> = ({ 
  icon: IconComponent, 
  sx = {}, 
  color = 'inherit',
  size = 'medium',
  ...props 
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Align with `ICON_REM` in `@/lib/ui-tokens` (inline / nav / section / hero)
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 28,
  };

  // Define color mappings for dark mode
  const getIconColor = () => {
    if (color === 'inherit') {
      return isDark ? '#ffffff' : '#000000';
    }
    
    const colorMap = {
      primary: isDark ? '#60a5fa' : '#1e40af',
      secondary: isDark ? '#a1a1aa' : '#6b7280',
      action: isDark ? '#a1a1aa' : '#6b7280',
      disabled: isDark ? '#52525b' : '#9ca3af',
      error: isDark ? '#f87171' : '#dc2626',
      info: isDark ? '#60a5fa' : '#2563eb',
      success: isDark ? '#4ade80' : '#16a34a',
      warning: isDark ? '#fbbf24' : '#d97706'
    };
    
    return colorMap[color] || colorMap.primary;
  };

  return (
    <IconComponent
      sx={{
        color: getIconColor(),
        fontSize: sizeMap[size],
        ...sx
      }}
      {...props}
    />
  );
};

// Export all icons for use throughout the application
export {
  // Congressional Content Icons
  Gavel,
  AccountBalance,
  Description,
  Search,
  FilterList,
  Timeline,
  Groups,
  Topic,
  Link,
  
  // Theme Icons
  DarkMode,
  LightMode,
  SettingsBrightness,
  
  // Date and Time Icons
  CalendarToday,
  Schedule,
  
  // Democracy and Civic Icons
  HowToVote,
  Public,
  School,
  
  // Navigation Icons
  Home,
  Menu,
  Close,
  ArrowBack,
  ArrowForward,
  
  // Content Status Icons
  CheckCircle,
  Pending,
  Error,
  Info,
  
  // Action Icons
  Download,
  Share,
  Bookmark,
  BookmarkBorder,
  
  // Chamber Icons
  Business,
  LocationCity,
  
  // Committee Icons
  Forum,
  RecordVoiceOver,
  
  // Bill Icons
  Article,
  Assignment,
  
  // Analysis Icons
  Analytics,
  TrendingUp,
  NetworkCheck,
  
  // Social Content Icons
  Twitter,
  Facebook,
  LinkedIn,
  
  // Utility Icons
  ExpandMore,
  ExpandLess,
  MoreVert,
  Settings,
  Help,
  
  // Content Type Icons
  VideoLibrary,
  AudioFile,
  PictureAsPdf,
  TextSnippet,
  
  // Status Icons
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  
  // User Icons
  Person,
  Group,
  AdminPanelSettings,
  
  // Notification Icons
  Notifications,
  NotificationsNone,
  
  // Data Icons
  BarChart,
  PieChart,
  ShowChart,
  
  // Government Icons
  Flag,
  Security,
  Policy,
  Balance,
  
  // Accessibility Icons
  Accessibility,
  VolumeUp,
  VolumeOff,
  
  // Content Discovery Icons
  Explore,
  FindInPage,
  History,
  Star,
  StarBorder,
  
  // Processing Icons
  Sync,
  CloudDownload,
  CloudUpload,
  Storage,
  
  // Quality Icons
  Verified,
  Warning,
  ErrorOutline,
  CheckCircleOutline,
  
  // Time-based Icons
  AccessTime,
  Today,
  DateRange,
  
  // Content Organization Icons
  Folder,
  FolderOpen,
  Book,
  LibraryBooks,
  
  // Communication Icons
  Email,
  Phone,
  Chat,
  Message,
  
  // Export Icons
  GetApp,
  Print,
  FileDownload,
  
  // Import Icons
  Upload,
  FileUpload,
  
  // Settings Icons
  Tune,
  Build,
  Code,
  BugReport,
  
  // Help Icons
  HelpOutline,
  Support,
  ContactSupport,
  Feedback,
  
  // Authentication Icons
  Lock,
  LockOpen,
  VpnKey,
  
  // Media Icons
  PlayCircle,
  PauseCircle,
  StopCircle,
  
  // Network Icons
  Hub,
  Router,
  Wifi,
  SignalCellular4Bar,
  
  // Government Building Icons
  Domain,
  
  // Democracy Icons
  Poll,
  ThumbUp,
  ThumbDown,
  
  // Civic Engagement Icons
  Campaign,
  VolunteerActivism,
  
  // Legislative Process Icons
  Rule,
  GpsFixed,
  
  // Location Icon
  LocationOn,
} from '@mui/icons-material';

// Icon mapping for different content types and contexts
const iconMap = {
  // Time
  calendar: CalendarToday,
  time: AccessTime,
  schedule: Schedule,
  date: Today,

  // Content
  document: Description,
  video: VideoLibrary,
  audio: AudioFile,
  pdf: PictureAsPdf,
  text: TextSnippet,

  // Social
  share: Share,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: LinkedIn,

  // User
  person: Person,
  group: Group,
  admin: AdminPanelSettings,

  // Notifications
  notification: Notifications,
  notificationOff: NotificationsNone,

  // Data
  chart: CustomChartIcon,
  customChart: CustomChartIcon,
  analytics: Analytics,
  trending: TrendingUp,
  network: NetworkCheck,

  // Settings
  settings: Settings,
  tune: Tune,
  build: Build,

  // Help
  help: Help,
  support: Support,
  feedback: Feedback,

  // Export/Import
  download: Download,
  upload: Upload,
  export: GetApp,

  // Quality
  verified: Verified,
  warning: Warning,
  error: Error,
  info: Info,

  // Accessibility
  accessibility: Accessibility,
  volume: VolumeUp,
  volumeOff: VolumeOff,

  // Discovery
  explore: Explore,
  find: FindInPage,
  history: History,
  star: Star,
  starBorder: StarBorder,

  // Processing
  sync: Sync,
  cloudDownload: CloudDownload,
  cloudUpload: CloudUpload,
  storage: Storage,

  // Time-based
  accessTime: AccessTime,
  today: Today,
  dateRange: DateRange,

  // Organization
  folder: Folder,
  folderOpen: FolderOpen,
  book: Book,
  library: LibraryBooks,

  // Communication
  email: Email,
  phone: Phone,
  chat: Chat,
  message: Message,

  // Export
  getApp: GetApp,
  print: Print,
  pictureAsPdf: PictureAsPdf,
  fileDownload: FileDownload,

  // Import
  fileUpload: FileUpload,

  // Contact
  contactSupport: ContactSupport,

  // Authentication
  lock: Lock,
  lockOpen: LockOpen,
  vpnKey: VpnKey,

  // Media
  playCircle: PlayCircle,
  pauseCircle: PauseCircle,
  stopCircle: StopCircle,

  // Document
  article: Article,
  assignment: Assignment,

  // Visualization
  pieChart: PieChart,
  showChart: ShowChart,

  // Network
  hub: Hub,
  router: Router,
  wifi: Wifi,
  signalCellular4Bar: SignalCellular4Bar,

  // Building
  domain: Domain,

  // Democracy
  poll: Poll,
  thumbUp: ThumbUp,
  thumbDown: ThumbDown,

  // Civic
  volunteerActivism: VolunteerActivism,

  // Legislative
  rule: Rule,
  gpsFixed: GpsFixed,

  // Bill
  description: Description,

  // Session
  calendarToday: CalendarToday,

  // Chamber
  locationOn: LocationOn,
};

// Helper function to get icon component by name
export const getIcon = (name: keyof typeof iconMap) => {
  return iconMap[name] || Description; // Default to Description icon
}; 