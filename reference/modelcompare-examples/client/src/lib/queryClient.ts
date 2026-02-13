import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getDeviceId } from "./deviceId";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle insufficient credits (402 Payment Required)
    if (res.status === 402) {
      const data = await res.json().catch(() => ({
        message: "You don't have enough credits to continue."
      }));

      // Import toast dynamically to show error notification
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Insufficient Credits",
          description: data.message || "You need more credits to use this feature. Click your credit balance to purchase more.",
          variant: "destructive",
          duration: 10000, // Show for 10 seconds
        });

        // Navigate to billing page after a short delay
        setTimeout(() => {
          window.location.href = '/billing';
        }, 2000);
      });

      throw new Error('Insufficient credits');
    }

    // Generic error for other status codes
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    "x-device-id": getDeviceId(),
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: {
        "x-device-id": getDeviceId(),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
