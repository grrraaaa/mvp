"use client";

import { useEffect } from "react";
import { ROLE_PRESET_MAP } from "@/lib/assistant/characterPresets";
import { useRoleStore } from "@/store/roleStore";
import { useCharacterStore } from "@/store/characterStore";

/** При смене роли в navbar подставляет соответствующую 3D-модель в чат. */
export function RoleCharacterSync() {
  const roleId = useRoleStore((s) => s.roleId);
  const applyPreset = useCharacterStore((s) => s.applyPreset);

  useEffect(() => {
    const presetId = ROLE_PRESET_MAP[roleId];
    if (presetId) applyPreset(presetId);
  }, [roleId, applyPreset]);

  return null;
}
