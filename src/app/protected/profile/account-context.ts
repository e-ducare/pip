export type AccountRoleId = "admin" | "board";

export type AccountContext = {
  roles: AccountRoleId[];
  programs: string[];
};
