export type AppHealth = {
  status: 'ok';
  service: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
};
