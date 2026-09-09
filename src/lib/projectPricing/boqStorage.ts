/** Accept the current flattened category and the originally documented nested path. */
export function isProjectBoqObjectPath(path: string, organizationId: string, projectId: string) {
  const prefixes = [`${organizationId}/project-pricing-${projectId}/`, `${organizationId}/project-pricing/${projectId}/`];
  return prefixes.some((prefix) => {
    if (!path.startsWith(prefix)) return false;
    const leaf = path.slice(prefix.length);
    return Boolean(leaf) && leaf !== "." && leaf !== ".." && !/[\\/]/.test(leaf);
  });
}
