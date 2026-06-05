/** Логотип СБЕР Бизнес — как в C:\Users\New\Desktop\wspace\src\components\Navbar.tsx */
export function SberBrandLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const icon = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const check = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const sber = size === "sm" ? "text-lg" : "text-xl";
  const biz = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center">
      <div className={`relative ${icon} flex-shrink-0 mr-2 flex items-center justify-center`}>
        <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500 border-r-transparent border-b-emerald-600 border-l-emerald-400 rotate-45" />
        <div className="absolute top-[3px] right-[3px] w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <svg
          className={`${check} text-emerald-600 relative z-10`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex items-baseline">
        <span className={`font-extrabold ${sber} tracking-tight text-[#083526] font-display`}>СБЕР</span>
        <span className={`text-[#138d8a] ${biz} font-semibold ml-1.5 font-sans`}>Бизнес</span>
      </div>
    </div>
  );
}
