import { create } from "zustand";
import { ROLES, RoleId } from "@/lib/banking/roles";

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
  return { role: ROLES[roleId], roleId, setRoleId };
}
