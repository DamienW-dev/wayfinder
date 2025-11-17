export type QueryParams = Record<
    string,
    | string
    | number
    | boolean
    | string[]
    | null
    | undefined
    | Record<string, string | number | boolean>
>;

type Method = "get" | "post" | "put" | "delete" | "patch" | "head" | "options";

let urlDefaults: Record<string, unknown> = {};

export type RouteDefinition<TMethod extends Method | Method[]> = {
    url: string;
} & (TMethod extends Method[] ? { methods: TMethod } : { method: TMethod });

export type RouteFormDefinition<TMethod extends Method> = {
    action: string;
    method: TMethod;
};

export type RouteQueryOptions = {
    query?: QueryParams;
    mergeQuery?: QueryParams;
};

export const queryParams = (options?: RouteQueryOptions) => {
    if (!options || (!options.query && !options.mergeQuery)) {
        return "";
    }

    const query = options.query ?? options.mergeQuery;
    const includeExisting = options.mergeQuery !== undefined;

    const getValue = (value: string | number | boolean) => {
        return value === true ? "1" : value === false ? "0" : value.toString();
    };

    const params = new URLSearchParams(
        includeExisting && typeof window !== "undefined"
            ? window.location.search
            : ""
    );

    for (const key in query) {
        const val = query[key];

        if (val === undefined || val === null) {
            params.delete(key);
            continue;
        }

        // ---- string[] ----
        if (Array.isArray(val)) {
            params.delete(`${key}[]`);
            val.forEach((item) => params.append(`${key}[]`, item.toString()));
            continue;
        }

        // ---- Record<string, primitive> ----
        if (typeof val === "object") {
            const record = val as Record<string, string | number | boolean>;

            params.forEach((_, paramKey) => {
                if (paramKey.startsWith(`${key}[`)) {
                    params.delete(paramKey);
                }
            });

            for (const subKey in record) {
                const subVal = record[subKey];
                if (subVal !== undefined) {
                    params.set(`${key}[${subKey}]`, getValue(subVal));
                }
            }
            continue;
        }

        // ---- primitive ----
        params.set(key, getValue(val));
    }

    const str = params.toString();
    return str.length > 0 ? `?${str}` : "";
};

export const setUrlDefaults = (params: Record<string, unknown>) => {
    urlDefaults = params;
};

export const addUrlDefault = (
    key: string,
    value: string | number | boolean
) => {
    urlDefaults[key] = value;
};

export const applyUrlDefaults = <T extends Record<string, unknown> | undefined>(
    existing: T
): T => {
    const existingParams = { ...(existing ?? ({} as Record<string, unknown>)) };

    for (const key in urlDefaults) {
        if (existingParams[key] === undefined && urlDefaults[key] !== undefined) {
            existingParams[key] = urlDefaults[key];
        }
    }

    return existingParams as T;
};

export const validateParameters = (
    args: Record<string, unknown> | undefined,
    optional: string[]
) => {
    const missing = optional.filter((key) => !args?.[key]);
    const expectedMissing = optional.slice(-missing.length);

    for (let i = 0; i < missing.length; i++) {
        if (missing[i] !== expectedMissing[i]) {
            throw new Error(
                "Unexpected optional parameters missing. Unable to generate a URL."
            );
        }
    }
};
