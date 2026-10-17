interface RequestConfig extends RequestInit {
  baseUrl?: string;
  params?: Record<string, string | number>;
  timeout?: number;
}

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, opts?: { headers?: Record<string, string> }) {
    this.baseUrl = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...opts?.headers,
    };
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      method = "GET",
      params,
      body,
      headers,
      timeout = 30000,
      ...rest
    } = config;

    const requestBody: RequestInit["body"] | undefined =
      body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, value.toString()),
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        ...rest,
        method,
        headers: { ...this.defaultHeaders, ...headers },
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as Record<string, string | undefined>;
        throw new Error(errorData.message || `HTTP Error: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout", { cause: error });
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Request failed", { cause: error });
    }
  }

  get<T>(
    url: string,
    params?: RequestConfig["params"],
    config?: RequestConfig,
  ) {
    return this.request<T>(url, { ...config, method: "GET", params });
  }

  post<T>(url: string, body?: RequestInit["body"], config?: RequestConfig) {
    return this.request<T>(url, { ...config, method: "POST", body });
  }
}
