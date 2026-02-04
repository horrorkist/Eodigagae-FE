"use client";

import { SWRConfig } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err: any = new Error("Fetch failed");
    err.status = res.status;
    err.detail = await res.text().catch(() => null);
    throw err;
  }
  return res.json();
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        refreshInterval: 0,
        shouldRetryOnError: false,
        keepPreviousData: true,
        dedupingInterval: 60 * 60 * 1000, // 1시간: 같은 키 중복 요청 방지
      }}
    >
      {children}
    </SWRConfig>
  );
}
