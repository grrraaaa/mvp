import { create } from "zustand";
import { useCallback } from "react";
import { ROLES, RoleId, Permission, PERMISSION_LABEL } from "@/lib/banking/roles";

interface RoleState {
  roleId: RoleId;
  setRoleId: (id: RoleId) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  roleId: "manager",
  setRoleId: (id) => set({ roleId: id }),
}));

export function useRole() {
  const roleId = useRoleStore((s) => s.roleId);
  const setRoleId = useRoleStore((s) => s.setRoleId);
  const role = ROLES[roleId];

  const can = useCallback((p: Permission) => role.permissions.includes(p), [role]);

  const denyTitle = useCallback(
    (p: Permission) =>
      `Недостаточно прав: «${PERMISSION_LABEL[p]}» недоступно для роли «${role.position}»`,
    [role],
  );

  return { role, roleId, setRoleId, can, denyTitle };
}

export function usePermission(p: Permission) {
  const { can, denyTitle } = useRole();
  const allowed = can(p);
  return {
    allowed,
    denied: !allowed,
    title: allowed ? undefined : denyTitle(p),
  };
}
