export const en = {
  title: "Tracked Domains",
  subtitle: "Manage and monitor your digital infrastructure in one place.",
  btnGroups: "Manage Groups",
  btnDomain: "Add Domain",
  searchPlaceholder: "Search domains...",
  filterAllGroups: "All groups",
  filterNoGroup: "No group",
  exportJson: "Export JSON",
  clearAll: "Clear All",
  total: "Total",
  noGroup: "No group",
  confirmDelete: "Are you sure you want to remove this domain?",
  confirmClearAll: "🚨 DANGER: This will remove ALL tracked domains. Continue?",
  alertExportSuccess: "File saved successfully!",
  emptyTitle: "No domains found",
  emptyDesc: "Try adjusting your search or add a new domain.",

  // List Empty Component
  listEmptySearchTitle: "No matching domains",
  listEmptySearchDesc: "We couldn't find any domains matching your search.",
  listEmptyClearSearch: "Clear search",
  listEmptyNoDomainsTitle: "No domains yet",
  listEmptyNoDomainsDesc: "You haven't added any domains to Watchtower.",
  listEmptyAddDomainBtn: "Add your first domain",

  // Edit Domain Modal
  editModalTitle: "Domain settings",
  editModalDesc: "Edit address and group for this domain",
  editModalCancel: "Cancel",
  editModalUrlLabel: "URL",
  editModalGroupLabel: "Group",
  editModalSave: "Save changes",
  editModalSaving: "Saving...",

  // Group Select Modal
  groupModalTitle: "Assign to group",
  groupModalDesc: (url: string) => `Choose a group for ${url}`,
  groupModalNoGroup: "No group",
  groupModalEmpty: "No groups yet. Create one on the Groups page.",
} as const;
