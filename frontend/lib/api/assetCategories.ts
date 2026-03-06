import { get } from "./client";

export type AssetCategory = {
  id: number;
  name: string;
  description?: string;
};

export function listAssetCategories() {
  return get<AssetCategory[]>("/asset-categories");
}
