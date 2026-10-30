// The simulated reviewer (decision 54), shared by every screen. Switching user here is what the
// Entra ID sign-in would do in production.
import { createContext, useContext } from "react";

export const USERS: Record<string, string> = { reviewer_a: "Legal Reviewer A", reviewer_b: "Legal Reviewer B" };

export const UserContext = createContext<string>("reviewer_a");
export const useUser = () => useContext(UserContext);
