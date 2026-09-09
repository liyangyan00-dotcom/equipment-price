type PageResult<T> = { data: T[] | null; error: { message: string } | null };

// A bounded full read must fail explicitly instead of returning partial counts.
export async function readSettingsPages<T>(
  readPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<PageResult<T>> {
  const rows: T[] = [];
  const pageSize = 500;
  for (let from = 0; from < 50000; from += pageSize) {
    const result = await readPage(from, from + pageSize - 1);
    if (result.error) return { data: null, error: result.error };
    if (!result.data) return { data: null, error: { message: "设置数据读取未返回有效结果" } };
    rows.push(...result.data);
    if (result.data.length < pageSize) return { data: rows, error: null };
  }
  return { data: null, error: { message: "设置统计超过安全读取上限，未返回不完整统计" } };
}
