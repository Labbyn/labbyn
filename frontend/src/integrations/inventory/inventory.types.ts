export type ApiInventoryItem = {
  name: string;
  quantity: number;
  team_id: number | null;
  localization_id: number;
  machine_id: number | null;
  category_id: number;
  rental_status: boolean;
  rental_id: number | null;
  id: number;
  version_id: number;
};