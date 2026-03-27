export const en = {
  title: "Domain Groups",
  subtitle: "Organize your domains into groups for better management and filtering.",
  noGroupsYet: "No Groups Yet",
  noGroupsDesc: "Groups allow you to categorize your domains and apply filters across the dashboard.",
  confirmDelete: "Are you sure you want to delete this group?",

  // CreateGroupCard
  cardCreateTitle: "Create new group",
  cardCreatePlaceholder: "E.g. Production, Client A...",
  cardCreateBtn: "Create Group",

  // GroupCard
  cardNoDomains: "No domains assigned. Click to select domains for this group.",
  cardDomainCount: (count: number) => `${count} domain${count !== 1 ? "s" : ""}`,
  cardMoreCount: (count: number) => `+${count} more`,

  // AssignDomainsModal
  assignModalTitle: (groupName: string) => `Domains in ${groupName}`,
  assignModalDesc: "Select domains to include in this group. Changes are saved when you click Save.",
  assignModalSelectAll: "Select all",
  assignModalDeselectAll: "Deselect all",
  assignModalNoDomainsText: "No domains yet.",
  assignModalAddLink: "Add domains",
  assignModalFirst: "first.",
  assignModalInfo: "This group's domains or domains not in this group are displayed.",
  assignModalStats: (total: number, selected: number) => `${total} domains, ${selected} selected`,
  assignModalCancel: "Cancel",
  assignModalSave: "Save",
} as const;
