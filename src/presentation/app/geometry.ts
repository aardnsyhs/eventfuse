export const DEFAULT_VISIBLE_MINUTES = 11 * 60;

export function barGeometry(start: number, finish: number, horizon: number) {
  return {
    left: `${(100 * start) / horizon}%`,
    width: `${(100 * (finish - start)) / horizon}%`,
  };
}
