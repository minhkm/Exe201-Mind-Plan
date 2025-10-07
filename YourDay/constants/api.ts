// API Configuration

function resolveApiBaseUrl(): string {
  // // 1) Explicit env override (preferred)
  // const envUrl = (process.env as any)?.EXPO_PUBLIC_API_URL as string | undefined;
  // if (envUrl) return envUrl.replace(/\/$/, '');

  // // 2) app.json extra override
  // const extraUrl = (Constants as any)?.expoConfig?.extra?.API_URL as string | undefined;
  // if (extraUrl) return extraUrl.replace(/\/$/, '');

  // // 3) Infer host from Expo debuggerHost first (LAN IP), then fallbacks
  // const manifest: any = (Constants as any).manifest;
  // const manifest2: any = (Constants as any).manifest2;
  // const expoConfig: any = (Constants as any).expoConfig;

  // const candidates: (string | undefined)[] = [
  //   manifest?.debuggerHost, // e.g. 192.168.0.101:8081
  //   manifest2?.extra?.expoGo?.debuggerHost, // new SDKs
  //   expoConfig?.hostUri, // often *.exp.direct (avoid if possible)
  // ];

  // for (const candidate of candidates) {
  //   if (!candidate) continue;
  //   const hostPart = candidate.split('/')[0];
  //   const host = hostPart.split(':')[0];
  //   // Avoid exp.direct domains which are not your LAN IP
  //   if (/exp\.direct$/i.test(host)) continue;
  //   return `http://${host}:3001/api`;
  // }

  // // 4) Final platform defaults
  // const fallbackHost = Platform.select({ ios: 'localhost', android: '10.0.2.2', default: 'localhost' });
  return `https://latinas-receive-ist-crew.trycloudflare.com/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();
console.log('[API] Resolved API_BASE_URL:', API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  TASKS: {
    LIST: '/tasks',
    CREATE: '/tasks',
    GET: '/tasks/:id',
    UPDATE: '/tasks/:id',
    DELETE: '/tasks/:id',
  },
  HEALTH: '/health',
};

// Helper function to make API calls with proper error handling
export const apiCall = async (endpoint: string, options: RequestInit = {}, timeoutMs: number = 10000) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Prepare headers with explicit Content-Type for POST/PUT requests
  const headers: Record<string, string> = {};

  // Add default Content-Type for requests with body
  if ((options.method === 'POST' || options.method === 'PUT') && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  // Merge with provided headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const defaultOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    console.log('API call - URL:', url);
    console.log('API call - Options:', {
      method: defaultOptions.method,
      headers: defaultOptions.headers,
      bodyLength: defaultOptions.body ? defaultOptions.body.length : 0,
      body: defaultOptions.body ? JSON.parse(defaultOptions.body as string) : null,
    });

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { ...defaultOptions, signal: controller.signal });
    clearTimeout(id);
    const data = await response.json();

    console.log('API call - Response status:', response.status);
    console.log('API call - Response data:', data);

    if (!response.ok) {
      console.error('API call - Full error response:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
      });
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};