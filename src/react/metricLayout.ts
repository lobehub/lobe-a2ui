/**
 * The narrowest a metric cell can be and still read: its label, a compact figure and a short
 * change on one line without being cut to an ellipsis.
 */
export const METRIC_MIN_CELL_WIDTH = 112;

/**
 * How many columns a card's metrics take. One row while every cell keeps its readable width;
 * below that, the fewest balanced rows that do (4 → 2 × 2, 5 → 3 + 2), never one lonely cell
 * under a full row. An unmeasured strip (first paint) takes one row.
 */
export const metricColumns = (
  count: number,
  width: number | undefined,
  minCellWidth = METRIC_MIN_CELL_WIDTH,
): number => {
  if (count <= 1) return 1;
  if (!width || width / count >= minCellWidth) return count;
  for (let rows = 2; rows <= count; rows++) {
    const columns = Math.ceil(count / rows);
    if (width / columns >= minCellWidth) return columns;
  }
  return 1;
};
