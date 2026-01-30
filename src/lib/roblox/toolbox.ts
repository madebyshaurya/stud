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

const CATALOG_API = "https://catalog.roblox.com/v1/search/items";
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

  const params = new URLSearchParams({
    keyword: query,
    assetType: assetType.toString(),
    limit: limit.toString(),
    sortType: "Relevance",
    sortOrder: "Desc",
  });

  const response = await tauriFetch(`${CATALOG_API}?${params}`, {
    method: "GET",
    headers: {
      "User-Agent": "Stud/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Toolbox search failed: ${response.status}`);
  }

  const data = await response.json() as {
    data: Array<{
      id: number;
      name: string;
      description: string;
      creatorName: string;
      creatorTargetId: number;
      favoriteCount: number;
      created: string;
      updated: string;
    }>;
    nextPageCursor?: string;
  };

  const assets: ToolboxAsset[] = data.data.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    creatorName: item.creatorName,
    creatorId: item.creatorTargetId,
    favoriteCount: item.favoriteCount || 0,
    created: item.created,
    updated: item.updated,
  }));

  // Fetch thumbnails for the assets
  if (assets.length > 0) {
    const thumbnails = await fetchThumbnails(assets.map((a) => a.id));
    assets.forEach((asset) => {
      asset.thumbnailUrl = thumbnails[asset.id];
    });
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
