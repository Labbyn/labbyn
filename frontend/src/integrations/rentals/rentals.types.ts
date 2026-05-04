export type ApiRentalsItem = {
    item_id: number
    start_date: string
    end_date: string
    quantity: number
    id: number
    team_id: number
    version_id: number | null
}

export type ApiRentalsCreate = {
    item_id: number
    start_date: string
    end_date: string
    quantity: number
}

export type ApiRentalsItemResponse = Array<ApiRentalsItem>