export function SberBusinessLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="35"
      viewBox="0 0 200 35"
      fill="none"
      className={className}
      aria-label="СБЕР Бизнес"
    >
      <path
        d="M17.5 17.5C17.5 8.663 24.163 2 33 2C41.837 2 48.5 8.663 48.5 17.5C48.5 26.337 41.837 33 33 33C24.163 33 17.5 26.337 17.5 17.5Z"
        fill="#21A038"
      />
      <path
        d="M28.5 17.5L31.5 20.5L38 14"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="58" y="24" fill="#1F1F22" fontSize="18" fontWeight="600" fontFamily="inherit">
        СБЕР
      </text>
      <text x="118" y="24" fill="#565B62" fontSize="18" fontWeight="400" fontFamily="inherit">
        Бизнес
      </text>
    </svg>
  );
}
