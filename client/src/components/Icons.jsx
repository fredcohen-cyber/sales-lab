const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };
const I = (paths) =>
  function Icon(props) {
    return <svg {...base} {...props}>{paths}</svg>;
  };

export const HomeIcon = I(<><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /></>);
export const PadIcon = I(<><path d="M6 3h12a1 1 0 0 1 1 1v16l-4-3H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M9 8h7M9 12h5" /></>);
export const ListIcon = I(<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6l.8.8L7 5.2M4.5 12l.8.8L7 11.2M4.5 18l.8.8L7 17.2" /></>);
export const ProgressIcon = I(<><path d="M4 19h16" /><path d="M6 15l4-4 3 3 5-6" /></>);
export const BookIcon = I(<><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></>);
export const DashboardIcon = I(<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="4" rx="1" /><rect x="13" y="10" width="7" height="10" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /></>);
export const CoachIcon = I(<><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>);
export const UsersIcon = I(<><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-2.5-4.6" /></>);
export const SettingsIcon = I(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" /></>);
export const LogoutIcon = I(<><path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4" /><path d="M14 8l4 4-4 4M18 12H9" /></>);
export const CheckIcon = I(<path d="M5 12.5l4.2 4L19 7" />);
export const AlertIcon = I(<><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.2v.1" /></>);
export const CriticalIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>);
export const InfoIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8v.1" /></>);
export const ClockIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const LockIcon = I(<><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const CopyIcon = I(<><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>);
export const MenuIcon = I(<path d="M4 7h16M4 12h16M4 17h16" />);
export const PlusIcon = I(<path d="M12 5v14M5 12h14" />);
export const RefreshIcon = I(<><path d="M19 8a8 8 0 1 0 1 5" /><path d="M19 3v5h-5" /></>);
export const DownloadIcon = I(<><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>);
export const FlagIcon = I(<><path d="M6 21V4" /><path d="M6 4h11l-2 4 2 4H6" /></>);
