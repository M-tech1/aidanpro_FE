import { useEffect, useState } from "react";
import { request } from "@/shared/api/httpClient";
import { COUNTRIES, type Country } from "@/shared/config/countries";

// Countries this Twilio account can actually sell numbers in. Fetched once and
// cached for the session; falls back to the static list if the call fails or
// returns nothing (e.g. Twilio not configured).
let cache: Country[] | null = null;

type CountriesResponse = { countries?: Country[] };

export function useAvailableCountries(): Country[] {
  const [countries, setCountries] = useState<Country[]>(cache ?? COUNTRIES);

  useEffect(() => {
    if (cache) {
      setCountries(cache);
      return;
    }
    let active = true;
    request<CountriesResponse>("/twilio/countries")
      .then((res) => {
        const list = (res.countries ?? []).filter((c) => c?.code && c?.name);
        if (list.length > 0) {
          cache = list;
          if (active) setCountries(list);
        }
      })
      .catch(() => {
        /* keep the static fallback */
      });
    return () => {
      active = false;
    };
  }, []);

  return countries;
}
