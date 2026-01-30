/**
 * Roblox Toolbox API Client
 *
 * Uses Roblox APIs to search and retrieve free models from Creator Store
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export interface ToolboxAsset {
  id: number;
  name: string;
  description: string;
  creatorName: string;
  creatorId: number;
  thumbnailUrl?: string;
  favoriteCount: number;
  created: string;
  updated: string;
}

export interface ToolboxSearchResult {
  assets: ToolboxAsset[];
  nextPageCursor?: string;
}

// Use the details endpoint which returns full asset info
const CATALOG_SEARCH_API = "https://catalog.roblox.com/v1/search/items";
const CATALOG_DETAILS_API = "https://catalog.roblox.com/v1/search/items/details";
const THUMBNAILS_API = "https://thumbnails.roblox.com/v1/assets";

export type AssetCategory = "Model" | "Decal" | "Audio" | "Plugin" | "MeshPart";

const CATEGORY_TO_TYPE: Record<AssetCategory, number> = {
  Model: 10,
  Decal: 13,
  Audio: 3,
  Plugin: 38,
  MeshPart: 40,
};

export async function searchToolbox(
  query: string,
  category: AssetCategory = "Model",
  limit = 10
): Promise<ToolboxSearchResult> {
  const assetType = CATEGORY_TO_TYPE[category];

  // Use the details endpoint which returns name, creator, etc.
  const params = new URLSearchParams({
    Category: "1", // Marketplace category
    Keyword: query,
    AssetType: assetType.toString(),
    Limit: limit.toString(),
    SortType: "0", // Relevance
    SortAggregation: "3",
    SortOrder: "2", // Descending
    IncludeNotForSale: "false",
  });

  console.log("[Toolbox] Searching:", query, "category:", category);

  const response = await tauriFetch(`${CATALOG_DETAILS_API}?${params}`, {
    method: "GET",
    headers: {
      "User-Agent": "Stud/1.0",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    console.error("[Toolbox] Search failed:", response.status);
    // Fallback to alternate search
    return searchToolboxFallback(query, category, limit);
  }

  const rawData = await response.json();
  console.log("[Toolbox] Raw response:", JSON.stringify(rawData, null, 2).slice(0, 2000));

  // Parse the response - details endpoint returns more info
  const data = rawData as {
    data?: Array<{
      id: number;
      itemType?: string;
      assetType?: number;
      name?: string;
      description?: string;
      creatorName?: string;
      creatorType?: string;
      creatorTargetId?: number;
      price?: number;
      favoriteCount?: number;
    }>;
    nextPageCursor?: string;
  };

  if (!data.data || !Array.isArray(data.data)) {
    console.error("[Toolbox] Unexpected response format, trying fallback");
    return searchToolboxFallback(query, category, limit);
  }

  const assets: ToolboxAsset[] = data.data.map((item) => ({
    id: item.id,
    name: item.name ?? `Asset ${item.id}`,
    description: item.description ?? "",
    creatorName: item.creatorName ?? "Unknown",
    creatorId: item.creatorTargetId ?? 0,
    favoriteCount: item.favoriteCount ?? 0,
    created: "",
    updated: "",
  }));

  console.log("[Toolbox] Parsed assets:", assets.map(a => ({ id: a.id, name: a.name, creator: a.creatorName })));

  // Fetch thumbnails for the assets
  if (assets.length > 0) {
    try {
      const thumbnails = await fetchThumbnails(assets.map((a) => a.id));
      assets.forEach((asset) => {
        asset.thumbnailUrl = thumbnails[asset.id];
      });
    } catch (err) {
      console.error("[Toolbox] Thumbnail fetch error:", err);
    }
  }

  return {
    assets,
    nextPageCursor: data.nextPageCursor,
  };
}

// Fallback: Search for IDs first, then fetch details individually
async function searchToolboxFallback(
  query: string,
  category: AssetCategory = "Model",
  limit = 10
): Promise<ToolboxSearchResult> {
  const assetType = CATEGORY_TO_TYPE[category];

  const params = new URLSearchParams({
    keyword: query,
    assetType: assetType.toString(),
    limit: limit.toString(),
    sortType: "Relevance",
    sortOrder: "Desc",
  });

  console.log("[Toolbox] Using fallback search...");

  const response = await tauriFetch(`${CATALOG_SEARCH_API}?${params}`, {
    method: "GET",
    headers: {
      "User-Agent": "Stud/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Toolbox search failed: ${response.status}`);
  }

  const rawData = await response.json();
  const data = rawData as {
    data?: Array<{ id: number }>;
    nextPageCursor?: string;
  };

  if (!data.data || !Array.isArray(data.data)) {
    return { assets: [] };
  }

  // Fetch details for each asset
  const assetIds = data.data.map(item => item.id);
  const assets: ToolboxAsset[] = [];

  // Batch fetch details using economy API
  for (const id of assetIds.slice(0, limit)) {
    const details = await getAssetDetails(id);
    if (details) {
      assets.push(details);
    }
  }

  return {
    assets,
    nextPageCursor: data.nextPageCursor,
  };
}

async function fetchThumbnails(assetIds: number[]): Promise<Record<number, string>> {
  const params = new URLSearchParams({
    assetIds: assetIds.join(","),
    size: "150x150",
    format: "Png",
    isCircular: "false",
  });

  const response = await tauriFetch(`${THUMBNAILS_API}?${params}`, {
    method: "GET",
    headers: {
      "User-Agent": "Stud/1.0",
    },
  });

  if (!response.ok) {
    return {};
  }

  const data = await response.json() as {
    data: Array<{
      targetId: number;
      imageUrl: string;
      state: string;
    }>;
  };

  const result: Record<number, string> = {};
  data.data.forEach((item) => {
    if (item.state === "Completed" && item.imageUrl) {
      result[item.targetId] = item.imageUrl;
    }
  });

  return result;
}

export async function getAssetDetails(assetId: number): Promise<ToolboxAsset | null> {
  const response = await tauriFetch(
    `https://economy.roblox.com/v2/assets/${assetId}/details`,
    {
      method: "GET",
      headers: {
        "User-Agent": "Stud/1.0",
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as {
    AssetId: number;
    Name: string;
    Description: string;
    Creator: { Name: string; Id: number };
    Created: string;
    Updated: string;
    FavoriteCount: number;
  };

  const thumbnails = await fetchThumbnails([assetId]);

  return {
    id: data.AssetId,
    name: data.Name,
    description: data.Description || "",
    creatorName: data.Creator.Name,
    creatorId: data.Creator.Id,
    favoriteCount: data.FavoriteCount || 0,
    created: data.Created,
    updated: data.Updated,
    thumbnailUrl: thumbnails[assetId],
  };
}
