import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// List of fallback CORS proxies
const PROXY_URLS: string[] = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
];

let currentProxyIndex = 0;

export function createProxiedUrl(url: string): string {
  return `${PROXY_URLS[currentProxyIndex]}${encodeURIComponent(url)}`;
}

// Create axios instance with default config
export const proxyAxios: AxiosInstance = axios.create({
  timeout: 30000, // 30 second timeout
  headers: {
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  }
});

// Add retry logic with proxy rotation and exponential backoff
proxyAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as AxiosRequestConfig & {
      __retryCount?: number;
      __retryDelay?: number;
    };

    // Initialize retry count if not present
    config.__retryCount = config.__retryCount || 0;
    config.__retryDelay = config.__retryDelay || 1000;

    // Maximum number of retries (3 retries per proxy)
    const maxRetries = PROXY_URLS.length * 3;

    if (!config || config.__retryCount >= maxRetries) {
      return Promise.reject(error);
    }

    config.__retryCount++;

    // Calculate delay with exponential backoff
    const delay = Math.min(config.__retryDelay * 2, 10000); // Max 10 second delay
    config.__retryDelay = delay;

    // Rotate proxy every 3 retries
    if (config.__retryCount % 3 === 0) {
      currentProxyIndex = (currentProxyIndex + 1) % PROXY_URLS.length;
    }

    // Update the URL with the new proxy
    if (config.url?.startsWith('http')) {
      const originalUrl = config.url.replace(new RegExp(`^${PROXY_URLS.join('|')}`), '');
      config.url = createProxiedUrl(decodeURIComponent(originalUrl));
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    // Log retry attempt
    console.log(`Retrying request (attempt ${config.__retryCount}/${maxRetries})`);

    return proxyAxios(config);
  }
);

proxyAxios.interceptors.request.use(config => {
  if (config.url?.startsWith('http')) {
    config.url = createProxiedUrl(config.url);
  }
  return config;
});