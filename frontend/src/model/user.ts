export interface UserRead {
  id: number;
  email: string;
  username: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}
