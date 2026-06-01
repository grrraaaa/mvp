import type { NavId } from "@/lib/sbbol/navigation";

const iconClass = "w-7 h-7";

export function NavIcon({ id, active }: { id: NavId; active?: boolean }) {
  const stroke = active ? "#107F8C" : "#7D838A";
  switch (id) {
    case "moneyAndEvents":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 12H17M7 12L10 9M7 12L10 15M17 12L14 9M17 12L14 15" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "payments":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="6" width="18" height="14" rx="2" stroke={stroke} strokeWidth="1.5" />
          <path d="M3 10H21" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "statement":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 4H17L20 7V20H7V4Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10 11H17M10 15H17M10 19H14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "salary":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke={stroke} strokeWidth="1.5" />
          <path d="M7 15H10M14 15H17" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "productsAndServices":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="8" width="16" height="12" rx="1" stroke={stroke} strokeWidth="1.5" />
          <path d="M8 8V6C8 4.895 8.895 4 10 4H14C15.105 4 16 4.895 16 6V8" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "partner-services":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12" stroke={stroke} strokeWidth="1.5" />
          <path d="M5 17C5 14.79 8.13 13 12 13C15.87 13 19 14.79 19 17" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="7" r="2" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "other":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="6" cy="12" r="1.5" fill={stroke} />
          <circle cx="12" cy="12" r="1.5" fill={stroke} />
          <circle cx="18" cy="12" r="1.5" fill={stroke} />
        </svg>
      );
    case "user-account":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.5" />
          <path d="M12 15V18M9 18H15" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8.5 8.5L9.5 7.5M15.5 8.5L14.5 7.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function IconMic({
  className = "w-6 h-6",
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  const stroke = active ? "#107F8C" : "currentColor";
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke={stroke} strokeWidth="2" />
      <path
        d="M5 11a7 7 0 0014 0M12 18v3M8 21h8"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Camera / upload image (OCR, attachments). */
export function IconImageUpload({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8a2 2 0 012-2h1.5l1-1.5A2 2 0 0110.4 4h3.2a2 2 0 011.9 1.1L16.5 6.5H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M18 8h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconPhone({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8.5 4H6.5C5.67 4 5 4.67 5 5.5C5 14.06 9.94 19 18.5 19C19.33 19 20 18.33 20 17.5V15.5C20 14.67 19.33 14 18.5 14H16C15.17 14 14.5 14.67 14.5 15.5C14.5 15.78 14.28 16 14 16C13.72 16 13.5 15.78 13.5 15.5V13.5C13.5 12.67 12.83 12 12 12H10C9.17 12 8.5 11.33 8.5 10.5V8.5C8.5 7.67 7.83 7 7 7H5.5C4.67 7 4 6.33 4 5.5V4" stroke="#7D838A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4C9.24 4 7 6.24 7 9V12L5 15H19L17 12V9C17 6.24 14.76 4 12 4Z" stroke="#7D838A" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18" stroke="#7D838A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconMail({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="#7D838A" strokeWidth="1.5" />
      <path d="M4 8L12 13L20 8" stroke="#7D838A" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6L8 10L12 6" stroke="#7D838A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M13 8A5 5 0 1 1 8 3" stroke="#107F8C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 3V8H8" stroke="#107F8C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSettings({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2" stroke="#7D838A" strokeWidth="1.5" />
      <path d="M8 2V3M8 13V14M2 8H3M13 8H14M4.2 4.2L4.9 4.9M11.1 11.1L11.8 11.8M4.2 11.8L4.9 11.1M11.1 4.9L11.8 4.2" stroke="#7D838A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconMoreVertical({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="4" r="1" fill="#7D838A" />
      <circle cx="8" cy="8" r="1" fill="#7D838A" />
      <circle cx="8" cy="12" r="1" fill="#7D838A" />
    </svg>
  );
}

export function IconChat({ className = "w-[56px] h-[56px] sm:w-[60px] sm:h-[60px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 50 50" fill="none" aria-hidden>
      <circle cx="25" cy="25" r="25" fill="#107F8C" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 15C13.3431 15 12 16.3431 12 18V29C12 30.6569 13.3431 32 15 32H16.5506C16.0541 33.15 15.2597 34.3652 14.0415 35.5402C13.8097 35.7637 14.0733 36.2406 14.3778 36.136C17.1721 35.1763 20.7275 33.882 22.5869 32H36C37.6569 32 39 30.6569 39 29V18C39 16.3431 37.6569 15 36 15H15Z"
        fill="white"
      />
      <circle cx="19.5" cy="23.5" r="1.5" fill="#107F8C" />
      <circle cx="25.5" cy="23.5" r="1.5" fill="#107F8C" opacity="0.7" />
      <circle cx="31.5" cy="23.5" r="1.5" fill="#107F8C" opacity="0.5" />
    </svg>
  );
}

export function IconPlanet({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="#107F8C" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="3" ry="7" stroke="#107F8C" strokeWidth="1.5" />
      <path d="M5 12H19" stroke="#107F8C" strokeWidth="1.5" />
    </svg>
  );
}

export function QuickLinkIcon({ label }: { label: string }) {
  const stroke = "#107F8C";
  if (label.includes("подпис")) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 4H17L20 7V20H7V4Z" stroke={stroke} strokeWidth="1.5" />
        <path d="M10 14L12 16L16 12" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (label.includes("Кредит")) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.5" />
        <path d="M12 8V12L15 14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (label.includes("карт")) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke={stroke} strokeWidth="1.5" />
        <path d="M3 10H21" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  if (label.includes("Контраг")) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="3" stroke={stroke} strokeWidth="1.5" />
        <path d="M4 18C4 15 6.5 13 9 13C11.5 13 14 15 14 18" stroke={stroke} strokeWidth="1.5" />
        <circle cx="17" cy="9" r="2" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  if (label.includes("Сотруд")) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="3" stroke={stroke} strokeWidth="1.5" />
        <path d="M6 19C6 16 8.5 14 12 14C15.5 14 18 16 18 19" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 16L10 12L14 15L18 10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 20H20" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

export function IconClose({ className = "w-6 h-6", stroke = "#107F8C" }: { className?: string; stroke?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6L18 18M18 6L6 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
