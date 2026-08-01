import type {
  TenantProfileResponse,
  AgentConfig,
  PhoneNumbersResponse,
  VoicesResponse,
  VoiceSelectionResponse
} from "@/features/tenant/api/tenantApi";

export const CACHE_KEYS = {
  tenantProfile:    "tenant:profile",
  agentConfig:      "tenant:agent-config",
  phoneNumbers:     "tenant:phone-numbers",
  voices:           "tenant:voices",
  voiceSelection:   "tenant:voice-selection"
} as const;

export type CacheKeyMap = {
  [CACHE_KEYS.tenantProfile]:   TenantProfileResponse;
  [CACHE_KEYS.agentConfig]:     AgentConfig;
  [CACHE_KEYS.phoneNumbers]:    PhoneNumbersResponse;
  [CACHE_KEYS.voices]:          VoicesResponse;
  [CACHE_KEYS.voiceSelection]:  VoiceSelectionResponse;
};

type AnyCacheKey = keyof CacheKeyMap;

const STALE_MS = 5 * 60 * 1000; // 5 minutes

type Entry<T> = { data: T; at: number };
const store = new Map<string, Entry<unknown>>();

export const apiCache = {
  get<K extends AnyCacheKey>(key: K): CacheKeyMap[K] | null {
    const entry = store.get(key) as Entry<CacheKeyMap[K]> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.at > STALE_MS) { store.delete(key); return null; }
    return entry.data;
  },
  set<K extends AnyCacheKey>(key: K, data: CacheKeyMap[K]): void {
    store.set(key, { data, at: Date.now() });
  },
  delete(...keys: AnyCacheKey[]): void {
    keys.forEach(k => store.delete(k));
  },
  clear(): void {
    store.clear();
  }
};
