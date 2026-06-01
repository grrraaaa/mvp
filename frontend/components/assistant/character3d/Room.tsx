"use client";

import { StudioBackdrop } from "./StudioBackdrop";

interface Props {
  light?: boolean;
}

export function Room({ light = false }: Props) {
  return <StudioBackdrop variant="wide" light={light} />;
}
