/** Backend resource shape for `POST /auth/sign-in` and `POST /auth/verify`. */
export interface AuthenticatedUserResource {
  id: number | null;
  email: string | null;
  fullName: string | null;
  token: string | null;
  role: string | null;
}

/** Backend resource shape for `POST /auth/sign-up`. */
export interface RegisteredUserResource {
  id: number | null;
  username: string | null;
  role: string | null;
  active: boolean | null;
}

/** Request body for `POST /auth/sign-up`. */
export interface SignUpRequest {
  email: string;
  password: string;
  role: string;
  fullName: string;
  /** Mandatory for specialists (their producer-facing contact); null otherwise. */
  phone: string | null;
  referralCode: string | null;
}

/** Request body for `POST /auth/sign-in`. */
export interface SignInRequest {
  email: string;
  password: string;
}
