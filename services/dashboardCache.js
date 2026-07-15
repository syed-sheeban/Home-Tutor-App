const dashboardCache = new Map();

export const getDashboardCache = (role) => dashboardCache.get(role) || null;

export const setDashboardCache = (role, data) => {
  dashboardCache.set(role, data);
};

export const clearDashboardCache = () => dashboardCache.clear();
