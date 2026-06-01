"use client";

import { StudioBackdrop } from "./StudioBackdrop";

interface Props {
  light?: boolean;
}

/** Фон «видеозвонок» — только студия, без мебели и сетки. */
export function HeadStudioBackdrop({ light = false }: Props) {
  return <StudioBackdrop variant="portrait" light={light} />;
}
