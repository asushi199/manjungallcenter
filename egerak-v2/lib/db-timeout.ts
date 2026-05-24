const DEFAULT_MS = 12_000;

export async function withDbTimeout<T>(promise: Promise<T>, ms = DEFAULT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Sambungan pangkalan data tamat masa. Cuba refresh halaman.")),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
