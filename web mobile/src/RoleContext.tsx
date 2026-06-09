import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ROLES, Role, RoleId, Permission, PERMISSION_LABEL } from './roles';

interface RoleContextValue {
  role: Role;
  roleId: RoleId;
  setRoleId: (id: RoleId) => void;
  can: (p: Permission) => boolean;
  denyTitle: (p: Permission) => string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roleId, setRoleId] = useState<RoleId>('manager');
  const role = ROLES[roleId];

  const can = useCallback(
    (p: Permission) => role.permissions.includes(p),
    [role]
  );

  const denyTitle = useCallback(
    (p: Permission) =>
      `Недостаточно прав: «${PERMISSION_LABEL[p]}» недоступно для роли «${role.position}»`,
    [role]
  );

  return (
    <RoleContext.Provider value={{ role, roleId, setRoleId, can, denyTitle }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole должен быть внутри <RoleProvider>');
  return ctx;
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
