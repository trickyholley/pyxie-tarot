type ClientType = "app" | "admin";

export interface Token {
  access_token: string;
  token_type?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  client?: ClientType;
}
