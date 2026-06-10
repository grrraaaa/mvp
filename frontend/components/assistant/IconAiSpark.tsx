"use client";

import type { SVGProps } from "react";

/**
 * Иконка «ИИ-ассистент» — та же, что в Nav баре: тёмно-зелёный круг с белой
 * 4-конечной искрой (spark) по центру и маленьким ярко-зелёным кругляшком
 * в правом-верхнем углу. Используется и в шапке чата, и в аватаре сообщений.
 */
export function IconAiSpark(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 18, className, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      <circle cx="12" cy="12" r="10" fill="#108c7c" />
      <path
        d="M12 7.5L13.1 10.9L16.5 12L13.1 13.1L12 16.5L10.9 13.1L7.5 12L10.9 10.9L12 7.5Z"
        fill="white"
      />
      <circle
        cx="16.5"
        cy="7.5"
        r="1.8"
        fill="#21A038"
        stroke="white"
        strokeWidth="0.8"
      />
    </svg>
  );
}
